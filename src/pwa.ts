// The service worker (SPEC §9): precache for offline use and a non-intrusive
// "New version available · Reload" when a new build is published.
import { registerSW } from 'virtual:pwa-register';

export interface PwaCallbacks {
  onNeedRefresh(reload: () => void): void;
  onOfflineReady(): void;
}

export function registerPwa(callbacks: PwaCallbacks): void {
  if (!('serviceWorker' in navigator)) return;
  const updateSW = registerSW({
    onNeedRefresh() {
      callbacks.onNeedRefresh(() => void updateSW(true));
    },
    onOfflineReady() {
      callbacks.onOfflineReady();
    },
  });
}
