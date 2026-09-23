import React, { useState } from 'react';
import { ArrowRight, CheckSquare, Square, Layers, Users } from 'lucide-react';
import type { SubscriptionItem, PlaylistItem } from '../../types';

interface SelectScreenProps {
  subscriptions: SubscriptionItem[];
  playlists: PlaylistItem[];
  onConfirmSelection: (selectedSubs: SubscriptionItem[], selectedPlaylists: PlaylistItem[]) => void;
  onBack: () => void;
}

export const SelectScreen: React.FC<SelectScreenProps> = ({
  subscriptions,
  playlists,
  onConfirmSelection,
  onBack
}) => {
  const [selectedSubIds, setSelectedSubIds] = useState<Set<string>>(
    () => new Set(subscriptions.filter((s) => s.status === 'pendiente').map((s) => s.id))
  );

  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(
    () => new Set(playlists.map((p) => p.id))
  );

  const pendingSubs = subscriptions.filter((s) => s.status === 'pendiente');

  const toggleSub = (id: string) => {
    setSelectedSubIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllSubs = () => {
    if (selectedSubIds.size === pendingSubs.length) {
      setSelectedSubIds(new Set());
    } else {
      setSelectedSubIds(new Set(pendingSubs.map((s) => s.id)));
    }
  };

  const togglePlaylist = (id: string) => {
    setSelectedPlaylistIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPlaylists = () => {
    if (selectedPlaylistIds.size === playlists.length) {
      setSelectedPlaylistIds(new Set());
    } else {
      setSelectedPlaylistIds(new Set(playlists.map((p) => p.id)));
    }
  };

  const handleProceed = () => {
    const chosenSubs = subscriptions.filter((s) => selectedSubIds.has(s.id));
    const chosenPlaylists = playlists.filter((p) => selectedPlaylistIds.has(p.id));
    onConfirmSelection(chosenSubs, chosenPlaylists);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Seleccionar Elementos para Migrar</h2>
        <p className="text-sm text-gray-400 max-w-xl mx-auto">
          Elige qué suscripciones y listas de reproducción deseas transferir al canal de destino.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Sección Suscripciones */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col h-[480px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A]">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-white text-sm">
                Suscripciones ({selectedSubIds.size} de {pendingSubs.length})
              </h3>
            </div>
            <button
              onClick={toggleAllSubs}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              {selectedSubIds.size === pendingSubs.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
            {pendingSubs.length === 0 ? (
              <p className="text-xs text-gray-500 py-8 text-center">
                No hay suscripciones pendientes por transferir.
              </p>
            ) : (
              pendingSubs.map((sub) => {
                const isChecked = selectedSubIds.has(sub.id);
                return (
                  <div
                    key={sub.id}
                    onClick={() => toggleSub(sub.id)}
                    className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-blue-950/20 border-blue-500/30 text-white'
                        : 'bg-[#141414] border-[#222] text-gray-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      {sub.thumbnailUrl ? (
                        <img src={sub.thumbnailUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-800" />
                      )}
                      <span className="text-xs truncate font-medium">{sub.title}</span>
                    </div>
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sección Listas de Reproducción */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col h-[480px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A]">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-red-400" />
              <h3 className="font-semibold text-white text-sm">
                Listas ({selectedPlaylistIds.size} de {playlists.length})
              </h3>
            </div>
            <button
              onClick={toggleAllPlaylists}
              className="text-xs text-red-400 hover:text-red-300 font-medium"
            >
              {selectedPlaylistIds.size === playlists.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
            {playlists.length === 0 ? (
              <p className="text-xs text-gray-500 py-8 text-center">
                No se encontraron listas creadas en el canal de origen.
              </p>
            ) : (
              playlists.map((playlist) => {
                const isChecked = selectedPlaylistIds.has(playlist.id);
                return (
                  <div
                    key={playlist.id}
                    onClick={() => togglePlaylist(playlist.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-red-950/20 border-red-500/30 text-white'
                        : 'bg-[#141414] border-[#222] text-gray-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Layers className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs truncate font-medium block">{playlist.title}</span>
                        <span className="text-[10px] text-gray-500 block">
                          {playlist.itemCount} vídeos • Privacidad: {playlist.privacyStatus}
                        </span>
                      </div>
                    </div>
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-red-400 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white"
        >
          Volver a análisis
        </button>

        <button
          onClick={handleProceed}
          disabled={selectedSubIds.size === 0 && selectedPlaylistIds.size === 0}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-red-900/20 flex items-center space-x-2"
        >
          <span>Continuar a Migración</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
