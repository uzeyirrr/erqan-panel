'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createProperty } from '@/lib/properties';
import { pb } from '@/lib/pocketbase';
import Layout from '@/components/Layout';
import PWAInstallButton from '@/components/PWAInstallButton';
import NotificationButton from '@/components/NotificationButton';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const { settings, loading: settingsLoading, error: settingsError } = useSettings();
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handlePurchase = async (type: 'land' | 'home' | 'home_2') => {
    if (!user || !settings) return;

    setPurchaseLoading(type);

    try {
      console.log('Satın alma başladı:', { type, user: user.id, settings: settings.id });

      // Kullanıcının güncel kredisini al
      const userRecord = await pb.collection('users').getOne(user.id);
      const userCredit = userRecord.credit || 0;
      console.log('Kullanıcı kredisi:', userCredit);

      let requiredCredit = 0;
      let propertyName = '';

      switch (type) {
        case 'land':
          requiredCredit = settings.land_price;
          propertyName = `Arsa ${Date.now()}`;
          break;
        case 'home':
          requiredCredit = settings.home_price;
          propertyName = `Ev ${Date.now()}`;
          break;
        case 'home_2':
          requiredCredit = settings.home_2_price;
          propertyName = `Ev Premium ${Date.now()}`;
          break;
      }

      console.log('Gerekli kredi:', requiredCredit);

      if (userCredit < requiredCredit) {
        alert('Yetersiz kredi!');
        return;
      }

      // Kullanıcının kredisini düşür
      console.log('Kredi düşürülüyor...');
      await pb.collection('users').update(user.id, {
        credit: userCredit - requiredCredit
      });
      console.log('Kredi düşürüldü');

      // Property oluştur
      console.log('Property oluşturuluyor...');
      const propertyData = {
        own_by: user.id,
        type: type,
        name: propertyName,
        status: 'empty',
        rent_price: 0,
        sale_price: 0,
        tenant_limit: type === 'home' ? 2 : type === 'home_2' ? 5 : 1,
        tenants: [],
      };
      console.log('Property data:', propertyData);
      
      const newProperty = await pb.collection('properties').create(propertyData);
      console.log('Property oluşturuldu:', newProperty);

      // Settings'te stok güncelle
      console.log('Settings güncelleniyor...');
      const updateData: { land?: number; home?: number; home_2?: number } = {};
      switch (type) {
        case 'land':
          updateData.land = settings.land - 1;
          break;
        case 'home':
          updateData.home = settings.home - 1;
          break;
        case 'home_2':
          updateData.home_2 = settings.home_2 - 1;
          break;
      }

      console.log('Settings update data:', updateData);
      await pb.collection('settings').update(settings.id, updateData);
      console.log('Settings güncellendi');

      alert('Satın alma başarılı!');
      window.location.reload();
    } catch (error) {
      console.error('Satın alma hatası:', error);
      alert(`Satın alma başarısız: ${error}`);
    } finally {
      setPurchaseLoading(null);
    }
  };

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">⚠️ {settingsError}</div>
          <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
            Sayfayı Yenile
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      {/* Pricing Section */}
      <div className="mb-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Satın Alma Seçenekleri</h2>
          <p className="text-xl text-gray-600">En uygun seçeneği seçin ve hemen satın alın</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Arsa */}
          <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-green-50 to-emerald-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-200 rounded-full -translate-y-16 translate-x-16 opacity-20"></div>
            <CardHeader className="relative">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-2xl font-bold text-gray-900">Arsa</CardTitle>
                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  En Popüler
                </div>
              </div>
              <CardDescription className="text-gray-600 text-base leading-relaxed">
                Evler bittikten sonra üzerine ev yapılabilir şekilde değerlendirilebilir
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {settings?.land_price || 0} USD
                  </div>
                  <div className="text-sm text-gray-500">Tek seferlik ödeme</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                    <span className="font-medium text-gray-700">Kalan Adet:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {settings?.land?.toLocaleString() || 0}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      Ev yapma potansiyeli
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      Uzun vadeli yatırım
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      Değer artış potansiyeli
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="w-full h-12 text-lg font-semibold bg-green-600 hover:bg-green-700" 
                  onClick={() => handlePurchase('land')}
                  disabled={purchaseLoading === 'land' || (settings?.land || 0) <= 0}
                >
                  {purchaseLoading === 'land' ? 'Satın Alınıyor...' : 'Satın Al'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ev */}
          <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-blue-50 to-sky-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 rounded-full -translate-y-16 translate-x-16 opacity-20"></div>
            <CardHeader className="relative">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-2xl font-bold text-gray-900">Ev</CardTitle>
                <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Standart
                </div>
              </div>
              <CardDescription className="text-gray-600 text-base leading-relaxed">
                Bu evi alabilmek için 5 kere kirada kalmak gerekir. Bu evi aldığında 2 kiracıya verebilirsin
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {settings?.home_price || 0} USD
                  </div>
                  <div className="text-sm text-gray-500">Tek seferlik ödeme</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                    <span className="font-medium text-gray-700">Kalan Adet:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {settings?.home?.toLocaleString() || 0}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      5 kira şartı
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      2 kiracı kapasitesi
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      Kira geliri potansiyeli
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700" 
                  onClick={() => handlePurchase('home')}
                  disabled={purchaseLoading === 'home' || (settings?.home || 0) <= 0}
                >
                  {purchaseLoading === 'home' ? 'Satın Alınıyor...' : 'Satın Al'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ev Premium */}
          <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-purple-50 to-violet-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 rounded-full -translate-y-16 translate-x-16 opacity-20"></div>
            <CardHeader className="relative">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-2xl font-bold text-gray-900">Ev Premium</CardTitle>
                <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Premium
                </div>
              </div>
              <CardDescription className="text-gray-600 text-base leading-relaxed">
                Evin aynısı ama 5 kira verme derdin yok, direkt alabilirsin
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600 mb-2">
                    {settings?.home_2_price || 0} USD
                  </div>
                  <div className="text-sm text-gray-500">Tek seferlik ödeme</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                    <span className="font-medium text-gray-700">Kalan Adet:</span>
                    <span className="text-xl font-bold text-purple-600">
                      {settings?.home_2?.toLocaleString() || 0}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      Direkt satın alma
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      Kira şartı yok
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      Premium özellikler
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="w-full h-12 text-lg font-semibold bg-purple-600 hover:bg-purple-700" 
                  onClick={() => handlePurchase('home_2')}
                  disabled={purchaseLoading === 'home_2' || (settings?.home_2 || 0) <= 0}
                >
                  {purchaseLoading === 'home_2' ? 'Satın Alınıyor...' : 'Satın Al'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Kullanıcı Bilgileri</CardTitle>
            <CardDescription>
              Hesap bilgileriniz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Ad Soyad:</span>
                <span className="text-sm text-gray-900 font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">E-posta:</span>
                <span className="text-sm text-gray-900 font-medium">{user.email}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Kredi:</span>
                <span className="text-sm text-green-700 font-bold">{user.credit || 0} USD</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Üyelik Tarihi:</span>
                <span className="text-sm text-gray-900 font-medium">
                  {new Date(user.created).toLocaleDateString('tr-TR')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Hızlı İşlemler</CardTitle>
            <CardDescription>
              Sık kullanılan işlemler
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start" variant="outline" onClick={() => router.push('/profile')}>
                <div className="w-4 h-4 mr-2">👤</div>
                Profil
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => router.push('/my-properties')}>
                <div className="w-4 h-4 mr-2">🏠</div>
                Mülklerim
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => router.push('/rental-properties')}>
                <div className="w-4 h-4 mr-2">🔍</div>
                Kiralık Mülkler
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <div className="w-4 h-4 mr-2">❓</div>
                Yardım
              </Button>
              <div className="pt-2 border-t border-gray-200 space-y-2">
                <PWAInstallButton />
                <NotificationButton />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
} 