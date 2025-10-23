'use client';

import { usePWA } from '@/hooks/usePWA';
import { Wifi, WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const { isOnline } = usePWA();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">Çevrimdışı</span>
    </div>
  );
} 