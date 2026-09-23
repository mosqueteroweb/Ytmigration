import React, { useState } from 'react';
import { Play, Check, AlertCircle, RefreshCw, Layers, Users, Database } from 'lucide-react';
import type { YouTubeChannel, SubscriptionItem, PlaylistItem, QuotaEstimate } from '../../types';
import { getStoredToken } from '../../auth/gis';
import { fetchAllSubscriptions, fetchAllPlaylists } from '../../api/youtube';
import { db } from '../../storage/db';

interface AnalyzeScreenProps {
  sourceChannel: YouTubeChannel;
  targetChannel: YouTubeChannel;
  onAnalysisComplete: (
    subscriptions: SubscriptionItem[],
    playlists: PlaylistItem[],
    quota: QuotaEstimate
  ) => void;
  onBack: () => void;
}

export const AnalyzeScreen: React.FC<AnalyzeScreenProps> = ({
  sourceChannel,
  targetChannel,
  onAnalysisComplete,
  onBack
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [subscriptionsFound, setSubscriptionsFound] = useState<SubscriptionItem[] | null>(null);
  const [playlistsFound, setPlaylistsFound] = useState<PlaylistItem[] | null>(null);
  const [quotaEstimate, setQuotaEstimate] = useState<QuotaEstimate | null>(null);

  const startAnalysis = async () => {
    setError(null);
    setAnalyzing(true);

    try {
      const sourceToken = getStoredToken('source')?.accessToken;
      const targetToken = getStoredToken('target')?.accessToken;

      if (!sourceToken || !targetToken) {
        throw new Error('La sesión de autorización ha expirado o falta conectar una cuenta. Vuelve al paso anterior.');
      }

      // 1. Obtener suscripciones de origen
      setProgressMsg('Analizando suscripciones del canal de origen...');
      const sourceSubs = await fetchAllSubscriptions(sourceToken, (count) => {
        setProgressMsg(`Analizando suscripciones de origen (${count} encontradas)...`);
      });

      // 2. Obtener suscripciones de destino (para detectar cuáles ya existen)
      setProgressMsg('Comparando con suscripciones existentes en destino...');
      const targetSubs = await fetchAllSubscriptions(targetToken);
      const targetChannelIds = new Set(targetSubs.map((s) => s.channelId));

      // Marcar las que ya existen en destino como completadas/omitidas
      const processedSubs = sourceSubs.map((sub) => {
        if (targetChannelIds.has(sub.channelId)) {
          return { ...sub, status: 'completada' as const, errorMessage: 'Ya suscrito en destino' };
        }
        return sub;
      });

      // 3. Obtener listas del canal de origen
      setProgressMsg('Obteniendo listas de reproducción creadas en origen...');
      const sourcePlaylists = await fetchAllPlaylists(sourceToken, (count) => {
        setProgressMsg(`Analizando listas creadas (${count} encontradas)...`);
      });

      // 4. Calcular cuota estimada
      const newSubsCount = processedSubs.filter((s) => s.status === 'pendiente').length;
      const totalVideosEstimate = sourcePlaylists.reduce((sum, p) => sum + p.itemCount, 0);

      const subWrites = newSubsCount * 50;
      const playlistWrites = sourcePlaylists.length * 50;
      const videoWrites = totalVideosEstimate * 50;
      const readUnits = Math.ceil(sourceSubs.length / 50) + Math.ceil(targetSubs.length / 50) + Math.ceil(sourcePlaylists.length / 50);

      const totalEstimatedUnits = subWrites + playlistWrites + videoWrites + readUnits;
      const daysRequiredAt10k = Math.max(1, Math.ceil(totalEstimatedUnits / 10000));

      const estimate: QuotaEstimate = {
        subscriptionWrites: subWrites,
        playlistWrites,
        videoWrites,
        readQueries: readUnits,
        totalEstimatedUnits,
        daysRequiredAt10k
      };

      setSubscriptionsFound(processedSubs);
      setPlaylistsFound(sourcePlaylists);
      setQuotaEstimate(estimate);

      // Guardar en IndexedDB
      await db.transaction('rw', db.subscriptions, db.playlists, db.sessions, async () => {
        await db.subscriptions.clear();
        await db.playlists.clear();
        await db.subscriptions.bulkPut(processedSubs);
        await db.playlists.bulkPut(sourcePlaylists);

        await db.sessions.put({
          id: `session_${sourceChannel.id}_to_${targetChannel.id}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          sourceChannel,
          targetChannel,
          totalSubscriptions: processedSubs.length,
          migratedSubscriptions: processedSubs.filter((s) => s.status === 'completada').length,
          totalPlaylists: sourcePlaylists.length,
          migratedPlaylists: 0,
          totalVideos: totalVideosEstimate,
          migratedVideos: 0,
          estimatedQuotaUsed: 0,
          status: 'listo'
        });
      });
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al analizar el contenido de los canales');
    } finally {
      setAnalyzing(false);
    }
  };

  const pendingSubs = subscriptionsFound?.filter((s) => s.status === 'pendiente').length || 0;
  const alreadySubs = (subscriptionsFound?.length || 0) - pendingSubs;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Inventario y Análisis de Contenido</h2>
        <p className="text-sm text-gray-400 max-w-xl mx-auto">
          Examinamos las suscripciones y listas del canal de origen para determinar qué elementos deben copiarse y estimar el uso de cuota.
        </p>
      </div>

      {!subscriptionsFound ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 text-center max-w-md mx-auto shadow-lg">
          <Database className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Listo para iniciar el inventario</h3>
          <p className="text-xs text-gray-400 mb-6">
            Leeremos las suscripciones y listas de <strong>{sourceChannel.title}</strong> y las compararemos con <strong>{targetChannel.title}</strong>.
          </p>

          <button
            onClick={startAnalysis}
            disabled={analyzing}
            className="w-full py-3 px-6 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center space-x-2"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{progressMsg}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Comenzar Análisis</span>
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-2 text-xs text-red-400 text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Suscripciones */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 shadow">
              <div className="flex items-center space-x-2 text-blue-400 mb-2">
                <Users className="w-5 h-5" />
                <h4 className="font-semibold text-white text-sm">Suscripciones</h4>
              </div>
              <p className="text-2xl font-bold text-white">{subscriptionsFound.length}</p>
              <div className="mt-2 text-xs text-gray-400 space-y-1">
                <p className="text-emerald-400">{pendingSubs} pendientes de añadir</p>
                <p className="text-gray-500">{alreadySubs} ya presentes en destino</p>
              </div>
            </div>

            {/* Listas */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 shadow">
              <div className="flex items-center space-x-2 text-red-400 mb-2">
                <Layers className="w-5 h-5" />
                <h4 className="font-semibold text-white text-sm">Listas Creadas</h4>
              </div>
              <p className="text-2xl font-bold text-white">{playlistsFound?.length || 0}</p>
              <p className="mt-2 text-xs text-gray-400">
                ~{playlistsFound?.reduce((acc, p) => acc + p.itemCount, 0)} vídeos en total
              </p>
            </div>

            {/* Estimación de Cuota */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 shadow">
              <div className="flex items-center space-x-2 text-amber-400 mb-2">
                <Database className="w-5 h-5" />
                <h4 className="font-semibold text-white text-sm">Cuota Estimada</h4>
              </div>
              <p className="text-2xl font-bold text-white">{quotaEstimate?.totalEstimatedUnits.toLocaleString()} pts</p>
              <p className="mt-2 text-xs text-amber-400">
                Requiere ~{quotaEstimate?.daysRequiredAt10k} jornada(s) de cuota diaria (10.000 pts/día)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={onBack}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white"
            >
              Volver a cuentas
            </button>

            <button
              onClick={() => onAnalysisComplete(subscriptionsFound, playlistsFound || [], quotaEstimate!)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-red-900/20 flex items-center space-x-2"
            >
              <span>Continuar a Selección</span>
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
