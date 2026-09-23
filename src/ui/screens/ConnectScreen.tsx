import React, { useState } from 'react';
import { ArrowRight, AlertCircle, CheckCircle2, UserCheck, ShieldAlert, LogIn } from 'lucide-react';
import type { YouTubeChannel } from '../../types';
import { requestGoogleToken } from '../../auth/gis';
import { fetchCurrentChannel } from '../../api/youtube';

interface ConnectScreenProps {
  clientId: string;
  onConnected: (sourceChannel: YouTubeChannel, targetChannel: YouTubeChannel) => void;
  onBack: () => void;
}

export const ConnectScreen: React.FC<ConnectScreenProps> = ({ clientId, onConnected, onBack }) => {
  const [sourceChannel, setSourceChannel] = useState<YouTubeChannel | null>(null);
  const [targetChannel, setTargetChannel] = useState<YouTubeChannel | null>(null);

  const [loadingSource, setLoadingSource] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState(false);

  const [errorSource, setErrorSource] = useState<string | null>(null);
  const [errorTarget, setErrorTarget] = useState<string | null>(null);

  const handleConnectSource = async () => {
    setErrorSource(null);
    setLoadingSource(true);
    try {
      const tokenState = await requestGoogleToken({
        clientId,
        scope: 'https://www.googleapis.com/auth/youtube.readonly',
        type: 'source'
      });

      const channel = await fetchCurrentChannel(tokenState.accessToken);
      setSourceChannel(channel);
    } catch (err: unknown) {
      console.error(err);
      setErrorSource(err instanceof Error ? err.message : 'Error al conectar la cuenta de origen');
    } finally {
      setLoadingSource(false);
    }
  };

  const handleConnectTarget = async () => {
    setErrorTarget(null);
    setLoadingTarget(true);
    try {
      const tokenState = await requestGoogleToken({
        clientId,
        scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
        type: 'target'
      });

      const channel = await fetchCurrentChannel(tokenState.accessToken);
      setTargetChannel(channel);
    } catch (err: unknown) {
      console.error(err);
      setErrorTarget(err instanceof Error ? err.message : 'Error al conectar la cuenta de destino');
    } finally {
      setLoadingTarget(false);
    }
  };

  const isSameChannel = sourceChannel && targetChannel && sourceChannel.id === targetChannel.id;
  const canProceed = sourceChannel && targetChannel && !isSameChannel;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Conectar Cuentas de YouTube</h2>
        <p className="text-sm text-gray-400 max-w-xl mx-auto">
          Conecta por separado la cuenta desde la que deseas copiar y la cuenta receptora. Los permisos se conceden únicamente en tu navegador.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Tarjeta de Origen */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                1. Canal de Origen (Solo Lectura)
              </span>
              {sourceChannel && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            </div>

            {sourceChannel ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-[#141414] rounded-xl border border-[#222]">
                  {sourceChannel.avatarUrl ? (
                    <img src={sourceChannel.avatarUrl} alt="" className="w-12 h-12 rounded-full border border-gray-700 object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-bold">
                      {sourceChannel.title.slice(0, 1)}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="font-semibold text-white truncate">{sourceChannel.title}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">{sourceChannel.id}</p>
                    {typeof sourceChannel.subscriberCount === 'number' && (
                      <p className="text-xs text-gray-500">{sourceChannel.subscriberCount.toLocaleString()} suscriptores</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleConnectSource}
                  className="text-xs text-gray-400 hover:text-white underline"
                >
                  Cambiar o reconectar canal de origen
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <UserCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-xs text-gray-400 mb-4">
                  Se solicitará permiso para leer tus suscripciones y listas de reproducción.
                </p>
                <button
                  onClick={handleConnectSource}
                  disabled={loadingSource}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{loadingSource ? 'Abriendo Google...' : 'Conectar Canal Origen'}</span>
                </button>
              </div>
            )}

            {errorSource && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorSource}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tarjeta de Destino */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                2. Canal de Destino (Escritura)
              </span>
              {targetChannel && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            </div>

            {targetChannel ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-[#141414] rounded-xl border border-[#222]">
                  {targetChannel.avatarUrl ? (
                    <img src={targetChannel.avatarUrl} alt="" className="w-12 h-12 rounded-full border border-gray-700 object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-bold">
                      {targetChannel.title.slice(0, 1)}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="font-semibold text-white truncate">{targetChannel.title}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">{targetChannel.id}</p>
                    {typeof targetChannel.subscriberCount === 'number' && (
                      <p className="text-xs text-gray-500">{targetChannel.subscriberCount.toLocaleString()} suscriptores</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleConnectTarget}
                  className="text-xs text-gray-400 hover:text-white underline"
                >
                  Cambiar o reconectar canal de destino
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <UserCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-xs text-gray-400 mb-4">
                  Se solicitará permiso para crear listas y suscribirse a canales en tu nombre.
                </p>
                <button
                  onClick={handleConnectTarget}
                  disabled={loadingTarget}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{loadingTarget ? 'Abriendo Google...' : 'Conectar Canal Destino'}</span>
                </button>
              </div>
            )}

            {errorTarget && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorTarget}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerta si el canal de origen y destino son el mismo */}
      {isSameChannel && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center space-x-3 text-amber-300 text-sm">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>
            Has conectado el mismo canal en origen y destino (<strong>{sourceChannel?.title}</strong>). Debes elegir dos cuentas o canales diferentes para realizar la migración.
          </span>
        </div>
      )}

      {/* Botones de navegación */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white"
        >
          Volver a configuración
        </button>

        <button
          onClick={() => sourceChannel && targetChannel && onConnected(sourceChannel, targetChannel)}
          disabled={!canProceed}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-red-900/20 flex items-center space-x-2"
        >
          <span>Continuar a Análisis</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
