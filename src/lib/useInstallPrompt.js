import { useCallback, useEffect, useState } from 'react';

const STANDALONE_QUERY = '(display-mode: standalone)';

function isRunningInstalled() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.(STANDALONE_QUERY)?.matches) return true;
  return window.navigator.standalone === true;
}

export default function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(isRunningInstalled);

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    const onInstalled = () => {
      setPromptEvent(null);
      setInstalled(true);
    };
    const media = window.matchMedia?.(STANDALONE_QUERY);
    const onDisplayMode = () => setInstalled(isRunningInstalled());

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    media?.addEventListener?.('change', onDisplayMode);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media?.removeEventListener?.('change', onDisplayMode);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return { available: false };
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setPromptEvent(null);
      return { available: true, outcome: choice?.outcome || 'dismissed' };
    } catch {
      setPromptEvent(null);
      return { available: true, outcome: 'dismissed' };
    }
  }, [promptEvent]);

  return { canInstall: Boolean(promptEvent), installed, install };
}
