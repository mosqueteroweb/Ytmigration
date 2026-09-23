import { SquarePlay, ShieldCheck, Trash2 } from 'lucide-react';
import { clearAllLocalData } from '../../storage/db';
import { clearTokens } from '../../auth/gis';

interface NavbarProps {
  currentStep: number;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentStep, onReset }) => {
  const steps = [
    'Configuración',
    'Conectar',
    'Analizar',
    'Seleccionar',
    'Migrar',
    'Resultado'
  ];

  const handleClearAll = async () => {
    if (confirm('¿Estás seguro de que deseas borrar todos los datos locales y desconectar las cuentas?')) {
      clearTokens();
      await clearAllLocalData();
      onReset();
    }
  };

  return (
    <header className="border-b border-[#272727] bg-[#0F0F0F] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo y Nombre */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-inner">
            <SquarePlay className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight flex items-center gap-2">
              YTMigration
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                100% Cliente
              </span>
            </h1>
            <p className="text-xs text-gray-400">Migrador seguro de cuentas de YouTube</p>
          </div>
        </div>

        {/* Pasos en pantallas medianas y grandes */}
        <div className="hidden md:flex items-center space-x-1">
          {steps.map((label, idx) => {
            const stepNum = idx + 1;
            const isCurrent = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;

            return (
              <div key={label} className="flex items-center">
                <div
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    isCurrent
                      ? 'bg-red-600 text-white shadow-sm'
                      : isCompleted
                      ? 'text-gray-300 bg-[#1F1F1F]'
                      : 'text-gray-500'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    isCurrent ? 'bg-white text-red-600 font-bold' : isCompleted ? 'bg-gray-700 text-gray-300' : 'bg-transparent text-gray-500'
                  }`}>
                    {stepNum}
                  </span>
                  <span>{label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="w-2 h-px bg-gray-800 mx-0.5" />
                )}
              </div>
            );
          })}
        </div>

        {/* Acciones de privacidad y reinicio */}
        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-400 bg-[#1A1A1A] px-2.5 py-1 rounded-lg border border-[#2A2A2A]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sin servidores externos</span>
          </div>

          <button
            onClick={handleClearAll}
            title="Borrar datos locales y desconectar"
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
