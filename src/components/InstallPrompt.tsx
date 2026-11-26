import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Detect standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If iOS
      const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
      if (isIOS) {
        setShowIOSGuide(true);
      } else {
        alert("Pour installer sur Android : ouvrez le menu Chrome (3 points) puis cliquez sur 'Ajouter à l'écran d'accueil'.");
      }
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  if (isInstalled || dismissed) return null;

  return (
    <>
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="text-xs min-w-0">
            <span className="font-semibold text-white block sm:inline">Installer l'application Android : </span>
            <span className="text-slate-300 text-[11px] sm:text-xs">
              Fonctionne hors-connexion sur téléphone & tablette
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold shadow transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Installer l'App</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-blue-300 hover:text-white rounded"
            title="Ignorer pour l'instant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full text-white shadow-2xl">
            <h3 className="font-bold text-base mb-2">Installation sur iPhone / iPad</h3>
            <p className="text-xs text-slate-300 space-y-2 mb-4">
              1. Appuyez sur le bouton <strong>Partager</strong> dans la barre Safari.<br />
              2. Faites défiler et appuyez sur <strong>Sur l'écran d'accueil</strong>.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-blue-600 rounded-xl text-xs font-bold text-white"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};
