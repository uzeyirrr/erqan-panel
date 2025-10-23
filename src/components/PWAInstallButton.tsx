'use client';

import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Download, Check } from 'lucide-react';
import { useState } from 'react';

export default function PWAInstallButton() {
  const { canInstall, isInstalled, installApp } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    if (!canInstall) return;
    
    setIsInstalling(true);
    try {
      const success = await installApp();
      if (success) {
        console.log('App installed successfully');
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  if (isInstalled) {
    return (
      <Button variant="outline" size="sm" disabled className="bg-green-50 text-green-700 border-green-200">
        <Check className="w-4 h-4 mr-2" />
        Yüklendi
      </Button>
    );
  }

  if (!canInstall) {
    return null;
  }

  return (
    <Button 
      onClick={handleInstall} 
      disabled={isInstalling}
      size="sm"
      className="bg-blue-600 hover:bg-blue-700"
    >
      <Download className="w-4 h-4 mr-2" />
      {isInstalling ? 'Yükleniyor...' : 'Uygulamayı Yükle'}
    </Button>
  );
} 