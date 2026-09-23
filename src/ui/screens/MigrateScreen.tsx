import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle2, AlertTriangle, Download, RefreshCw } from 'lucide-react';
import type { SubscriptionItem, PlaylistItem } from '../../types';
import { MigrationEngine, type MigrationProgress } from '../../migration/engine';
import { exportMigrationData } from '../../storage/export';
import { requestGoogleToken } from '../../auth/gis';

interface MigrateScreenProps {
  clientId: string;
  selectedSubscriptions: SubscriptionItem[];
  selectedPlaylists: PlaylistItem[];
  onFinish: () => void;
}

export const MigrateScreen: React.FC<MigrateScreenProps> = ({
  clientId,
  selectedSubscriptions,
  selectedPlaylists,
  onFinish
}) => {
  const [progress, setProgress] = useState<MigrationProgress>({
    currentOperation: 'Iniciando proceso de migración...',
    totalItems: 1,
    completedItems: 0,
    failedItems: 0,
    skippedItems: 0,
    isPaused: false
  });

  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);

  const engineRef = useRef<MigrationEngine | null>(null);

  useEffect(() => {
    const engine = new MigrationEngine((p) => {
      setProgress(p);
      if (p.completedItems + p.failedItems + p.skippedItems >= p.totalItems && p.totalItems > 0) {
        setIsFinished(true);
        setIsRunning(false);
      }
    });

    engineRef.current = engine;
    setIsRunning(true);

    engine.runMigration(selectedSubscriptions, selectedPlaylists).catch((err) => {
      console.error('Migración detenida por error:', err);
      setIsRunning(false);
      if (err.message && err.message.includes('autorización')) {
        setTokenExpired(true);
      }
    });

    return () => {
      engine.pause();
    };
  }, [selectedSubscriptions, selectedPlaylists]);

  const handlePauseToggle = () => {
    if (!engineRef.current) return;

    if (isRunning) {
      engineRef.current.pause();
      setIsRunning(false);
    } else {
      engineRef.current.resume();
      setIsRunning(true);
      engineRef.current.runMigration(selectedSubscriptions, selectedPlaylists).catch((err) => {
        setIsRunning(false);
        if (err.message && err.message.includes('autorización')) {
          setTokenExpired(true);
        }
      });
    }
  };

  const handleRenewToken = async () => {
    try {
      await requestGoogleToken({
        clientId,
        scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
        type: 'target'
      });
      setTokenExpired(false);
      handlePauseToggle();
    } catch (err) {
      alert(`Error al renovar token: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleExportBackup = async () => {
    const jsonStr = await exportMigrationData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ytmigration-progreso-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const percent = progress.totalItems > 0
    ? Math.min(100, Math.round(((progress.completedItems + progress.skippedItems + progress.failedItems) / progress.totalItems) * 100))
    : 0;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Progreso de la Migración</h2>
            <p className="text-xs text-gray-400">Mantén esta pestaña abierta mientras se copian los elementos.</p>
          </div>
          <span className="text-2xl font-black text-red-500 font-mono">{percent}%</span>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-[#111] h-3 rounded-full overflow-hidden mb-6 border border-[#2F2F2F]">
          <div
            className="bg-red-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Estado actual */}
        <div className="p-4 bg-[#141414] rounded-xl border border-[#222] mb-6 flex items-center space-x-3">
          {isRunning ? (
            <RefreshCw className="w-5 h-5 text-red-500 animate-spin flex-shrink-0" />
          ) : isFinished ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <Pause className="w-5 h-5 text-amber-400 flex-shrink-0" />
          )}
          <div className="overflow-hidden">
            <p className="text-xs text-gray-400 font-medium">Operación actual</p>
            <p className="text-sm text-white font-medium truncate">{progress.currentOperation}</p>
          </div>
        </div>

        {/* Alerta de expiración de token */}
        {tokenExpired && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-6 flex items-start justify-between gap-4">
            <div className="flex items-start space-x-2 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                La autorización de Google ha caducado (caduca cada hora por seguridad). Pulsa renovar para continuar donde se quedó.
              </span>
            </div>
            <button
              onClick={handleRenewToken}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold rounded-lg flex-shrink-0"
            >
              Renovar Token
            </button>
          </div>
        )}

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-3 gap-3 mb-6 text-center">
          <div className="p-3 bg-[#121212] rounded-xl border border-[#222]">
            <p className="text-xs text-gray-500">Completados</p>
            <p className="text-lg font-bold text-emerald-400">{progress.completedItems}</p>
          </div>
          <div className="p-3 bg-[#121212] rounded-xl border border-[#222]">
            <p className="text-xs text-gray-500">Omitidos / Existentes</p>
            <p className="text-lg font-bold text-gray-300">{progress.skippedItems}</p>
          </div>
          <div className="p-3 bg-[#121212] rounded-xl border border-[#222]">
            <p className="text-xs text-gray-500">Fallidos / Inaccesibles</p>
            <p className="text-lg font-bold text-red-400">{progress.failedItems}</p>
          </div>
        </div>

        {/* Controles de acción */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#2A2A2A]">
          <button
            onClick={handleExportBackup}
            className="text-xs text-gray-400 hover:text-white flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Respaldo JSON</span>
          </button>

          <div className="flex items-center space-x-3">
            {!isFinished ? (
              <button
                onClick={handlePauseToggle}
                className="px-4 py-2 bg-[#252525] hover:bg-[#333] text-white text-xs font-medium rounded-xl flex items-center space-x-1.5 transition-colors"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Reanudar</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onFinish}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors shadow-lg shadow-emerald-900/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finalizar y Ver Resumen</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
