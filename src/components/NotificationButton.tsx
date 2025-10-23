'use client';

import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { useState } from 'react';

export default function NotificationButton() {
  const { requestNotificationPermission, sendNotification } = usePWA();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        console.log('Notification permission granted');
        // Test notification
        sendNotification('Erqan', {
          body: 'Bildirimler aktif!',
          icon: '/icon-192x192.png'
        });
      } else {
        console.log('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTestNotification = () => {
    sendNotification('Erqan', {
      body: 'Bu bir test bildirimidir!',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png'
    });
  };

  return (
    <div className="space-y-2">
      <Button 
        onClick={handleRequestPermission} 
        disabled={isRequesting}
        size="sm"
        variant="outline"
        className="w-full"
      >
        <Bell className="w-4 h-4 mr-2" />
        {isRequesting ? 'İstek gönderiliyor...' : 'Bildirim İzni İste'}
      </Button>
      
      {Notification.permission === 'granted' && (
        <Button 
          onClick={handleTestNotification}
          size="sm"
          variant="outline"
          className="w-full"
        >
          <Bell className="w-4 h-4 mr-2" />
          Test Bildirimi Gönder
        </Button>
      )}
    </div>
  );
} 