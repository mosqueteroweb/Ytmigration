import React from 'react';
import { CheckCircle2, Download, RotateCcw, ShieldCheck } from 'lucide-react';
import { exportMigrationData } from '../../storage/export';

interface ResultScreenProps {
  onRestart: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ onRestart }) => {
  const handleExportReport = async () => {
    const jsonStr = await exportMigrationData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ytmigration-informe-final-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 text-center">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">¡Migración Completada!</h2>
        <p className="text-sm text-gray-400 mb-6">
          Los elementos seleccionados han sido transferidos exitosamente a tu canal de destino.
        </p>

        <div className="p-4 bg-[#141414] rounded-xl border border-[#222] text-xs text-gray-400 space-y-2 mb-8 text-left">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Verificación y Seguridad</span>
          </div>
          <p>
            • Ningún vídeo ni suscripción del canal de origen ha sido alterado ni borrado.
          </p>
          <p>
            • Los tokens OAuth han sido eliminados de la memoria volátil del navegador.
          </p>
          <p>
            • Puedes descargar el informe final para conservar el historial detallado de IDs y correspondencias.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleExportReport}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#252525] hover:bg-[#333] text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition-colors border border-[#333]"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Informe Final (JSON)</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-red-900/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Realizar Otra Migración</span>
          </button>
        </div>
      </div>
    </div>
  );
};
