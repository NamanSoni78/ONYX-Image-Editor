'use client';

import { useEffect } from 'react';

/** Registers the service worker (production only) for offline support */
export const PwaRegister: React.FC = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* offline support is a progressive enhancement — ignore failures */
      });
    };
    if (document.readyState === 'complete') onLoad();
    else {
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);
  return null;
};
