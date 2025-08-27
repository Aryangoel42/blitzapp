'use client';

import { useEffect } from 'react';
import { pwaManager } from '@/lib/pwa';

export function PWAInitializer() {
  useEffect(() => {
    // Initialize PWA features
    pwaManager.initialize().catch(console.error);
  }, []);

  return null;
}
