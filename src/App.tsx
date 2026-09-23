import { useState, useEffect } from 'react';
import { Navbar } from './ui/components/Navbar';
import { ConfigScreen } from './ui/screens/ConfigScreen';
import { ConnectScreen } from './ui/screens/ConnectScreen';
import { AnalyzeScreen } from './ui/screens/AnalyzeScreen';
import { SelectScreen } from './ui/screens/SelectScreen';
import { MigrateScreen } from './ui/screens/MigrateScreen';
import { ResultScreen } from './ui/screens/ResultScreen';
import { getSetting } from './storage/db';
import type { YouTubeChannel, SubscriptionItem, PlaylistItem } from './types';

export function App() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [clientId, setClientId] = useState<string>('');

  const [sourceChannel, setSourceChannel] = useState<YouTubeChannel | null>(null);
  const [targetChannel, setTargetChannel] = useState<YouTubeChannel | null>(null);

  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);

  const [selectedSubs, setSelectedSubs] = useState<SubscriptionItem[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<PlaylistItem[]>([]);

  useEffect(() => {
    // Si ya existe clientId en IndexedDB, podemos avanzar al paso 2 si el usuario quiere
    getSetting('google_client_id').then((id) => {
      if (id) {
        setClientId(id);
      }
    });
  }, []);

  const handleReset = () => {
    setSourceChannel(null);
    setTargetChannel(null);
    setSubscriptions([]);
    setPlaylists([]);
    setSelectedSubs([]);
    setSelectedPlaylists([]);
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-gray-100 flex flex-col font-sans">
      <Navbar currentStep={currentStep} onReset={handleReset} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col justify-center">
        {currentStep === 1 && (
          <ConfigScreen
            onContinue={(id) => {
              setClientId(id);
              setCurrentStep(2);
            }}
          />
        )}

        {currentStep === 2 && (
          <ConnectScreen
            clientId={clientId}
            onConnected={(source, target) => {
              setSourceChannel(source);
              setTargetChannel(target);
              setCurrentStep(3);
            }}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && sourceChannel && targetChannel && (
          <AnalyzeScreen
            sourceChannel={sourceChannel}
            targetChannel={targetChannel}
            onAnalysisComplete={(subs, plists) => {
              setSubscriptions(subs);
              setPlaylists(plists);
              setCurrentStep(4);
            }}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && (
          <SelectScreen
            subscriptions={subscriptions}
            playlists={playlists}
            onConfirmSelection={(chosenSubs, chosenPlaylists) => {
              setSelectedSubs(chosenSubs);
              setSelectedPlaylists(chosenPlaylists);
              setCurrentStep(5);
            }}
            onBack={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 5 && (
          <MigrateScreen
            clientId={clientId}
            selectedSubscriptions={selectedSubs}
            selectedPlaylists={selectedPlaylists}
            onFinish={() => setCurrentStep(6)}
          />
        )}

        {currentStep === 6 && (
          <ResultScreen onRestart={handleReset} />
        )}
      </main>

      <footer className="py-6 border-t border-[#1C1C1C] text-center text-xs text-gray-500">
        <p>
          YTMigration • Funciona 100% en tu navegador • No se almacenan credenciales ni contraseñas
        </p>
      </footer>
    </div>
  );
}

export default App;
