import React, { useState, useEffect } from 'react';
import { KeyRound, ExternalLink, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { getSetting, setSetting } from '../../storage/db';

interface ConfigScreenProps {
  onContinue: (clientId: string) => void;
}

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ onContinue }) => {
  const [clientId, setClientId] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSetting('google_client_id').then((savedId) => {
      if (savedId) {
        setClientId(savedId);
      }
      setIsLoading(false);
    });
  }, []);

  const handleSaveAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = clientId.trim();
    if (!cleanId) return;

    await setSetting('google_client_id', cleanId);
    onContinue(cleanId);
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Configuración del Cliente Google OAuth</h2>
            <p className="text-sm text-gray-400">
              Para comunicarse con YouTube de forma directa desde tu navegador necesitas tu ID de Cliente.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveAndContinue} className="space-y-6">
          <div>
            <label htmlFor="clientId" className="block text-sm font-medium text-gray-300 mb-2">
              ID de Cliente OAuth 2.0 (Aplicación Web)
            </label>
            <input
              id="clientId"
              type="text"
              placeholder="ej: 1234567890-abcdefgh123456.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono"
            />
            <p className="mt-2 text-xs text-gray-400">
              Este identificador es público y se guarda únicamente en el almacenamiento local de tu navegador.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-xs text-gray-400 hover:text-white flex items-center space-x-1.5 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{showInstructions ? 'Ocultar guía de Google Cloud' : '¿Cómo obtener este ID en Google Cloud?'}</span>
            </button>

            <button
              type="submit"
              disabled={!clientId.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-red-900/20 flex items-center justify-center space-x-2"
            >
              <span>Continuar a Conexión</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Guía desplegable */}
        {showInstructions && (
          <div className="mt-8 pt-6 border-t border-[#2A2A2A] text-xs text-gray-300 space-y-4">
            <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
              <span>Pasos en Google Cloud Console</span>
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noreferrer"
                className="text-red-400 hover:underline inline-flex items-center gap-0.5 ml-1"
              >
                Abrir consola <ExternalLink className="w-3 h-3" />
              </a>
            </h3>

            <ol className="list-decimal list-inside space-y-2.5 text-gray-400 pl-1 leading-relaxed">
              <li>
                Crea un proyecto (ej. <strong className="text-gray-200">YouTube Migration</strong>) y habilita la API:{' '}
                <strong className="text-gray-200">YouTube Data API v3</strong>.
              </li>
              <li>
                En <strong className="text-gray-200">Pantalla de consentimiento de OAuth</strong>, selecciona <em className="text-gray-200">Externo</em>, completa el nombre y tu correo de contacto.
              </li>
              <li>
                <span className="text-amber-400 font-medium">Importante:</span> En la pestaña <strong className="text-gray-200">Usuarios de prueba</strong> añade <strong className="text-gray-200">ambas cuentas de Google</strong> (la de origen y la de destino).
              </li>
              <li>
                En <strong className="text-gray-200">Credenciales</strong>, pulsa <strong className="text-gray-200">Crear credenciales &gt; ID de cliente de OAuth</strong> de tipo <strong className="text-gray-200">Aplicación web</strong>.
              </li>
              <li>
                En <strong className="text-gray-200">Orígenes autorizados de JavaScript</strong>, añade exactamente:
                <div className="mt-1.5 space-y-1">
                  <div className="bg-[#111] p-2 rounded border border-[#2F2F2F] font-mono text-[11px] text-emerald-400 select-all">
                    https://mosqueteroweb.github.io
                  </div>
                  <div className="bg-[#111] p-2 rounded border border-[#2F2F2F] font-mono text-[11px] text-gray-400 select-all">
                    http://localhost:5173
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 block mt-1">
                  (Nota: Google no admite rutas con barras finales ni subcarpetas en los orígenes de JavaScript).
                </span>
              </li>
              <li>
                Copia el <strong className="text-gray-200">ID de cliente</strong> generado y pégalo en el campo superior. No necesitas el secreto de cliente.
              </li>
            </ol>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start space-x-2 text-amber-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Al tratarse de una aplicación en modo pruebas, durante el inicio de sesión verás un aviso de que la aplicación no está verificada. Pulsa en <em>«Configuración avanzada»</em> y luego en <em>«Acceder a... (no seguro)»</em> para autorizar.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
