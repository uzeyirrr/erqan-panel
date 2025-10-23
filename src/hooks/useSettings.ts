import { useState, useEffect } from 'react';
import { pb } from '@/lib/pocketbase';

export interface Settings {
  id: string;
  land: number;
  home: number;
  home_2: number;
  land_price: number;
  home_price: number;
  home_2_price: number;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const fetchSettings = async () => {
      try {
        console.log('Settings yükleniyor... (deneme:', retryCount + 1, ')');
        
        // İlk settings kaydını al
        const records = await pb.collection('settings').getList(1, 1, {
          sort: '-created'
        });
        
        if (!isMounted) return;
        
        if (records.items.length > 0) {
          const settingsData = records.items[0];
          setSettings({
            id: settingsData.id,
            land: settingsData.land || 0,
            home: settingsData.home || 0,
            home_2: settingsData.home_2 || 0,
            land_price: settingsData.land_price || 0,
            home_price: settingsData.home_price || 0,
            home_2_price: settingsData.home_2_price || 0,
          });
          setError(null);
        } else {
          setError('Settings verisi bulunamadı');
        }
      } catch (err) {
        console.error('Settings yüklenirken hata:', err);
        
        if (!isMounted) return;
        
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`${retryCount} saniye sonra tekrar deneniyor...`);
          setTimeout(() => {
            if (isMounted) {
              fetchSettings();
            }
          }, retryCount * 1000);
        } else {
          setError('Ayarlar yüklenemedi. Lütfen sayfayı yenileyin.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  return { settings, loading, error };
} 