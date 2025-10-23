'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { pb } from '@/lib/pocketbase';
import { Property } from '@/lib/properties';
import { createRentalRecord } from '@/lib/rental-system';
import Layout from '@/components/Layout';

export default function RentalPropertiesPage() {
  const { user, loading, logout } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [rentLoading, setRentLoading] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchRentalProperties();
    }
  }, [user]);

  const fetchRentalProperties = async () => {
    try {
      console.log('Kiralık mülkler yükleniyor...');
      
      // Sadece kiralık olan ve kullanıcının kendi mülkü olmayan mülkleri getir
      const records = await pb.collection('properties').getList(1, 50, {
        filter: `status = "rent" && own_by != "${user?.id}"`,
        expand: 'own_by',
        $autoCancel: false // Auto-cancel'i devre dışı bırak
      });
      
      console.log('Kiralık mülkler yüklendi:', records.items.length);
      setProperties(records.items as unknown as Property[]);
    } catch (error) {
      console.error('Kiralık mülkler yüklenirken hata:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'land':
        return 'Arsa';
      case 'home':
        return 'Ev';
      case 'home_2':
        return 'Ev Premium';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'land':
        return 'bg-green-100 text-green-800';
      case 'home':
        return 'bg-blue-100 text-blue-800';
      case 'home_2':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRent = async (property: Property) => {
    if (!user) return;

    setRentLoading(property.id);

    try {
      // Kullanıcının kredisini kontrol et
      const userRecord = await pb.collection('users').getOne(user.id);
      const userCredit = userRecord.credit || 0;

      if (userCredit < property.rent_price) {
        alert('Yetersiz kredi!');
        return;
      }

      // Kullanıcının kredisini düşür
      await pb.collection('users').update(user.id, {
        credit: userCredit - property.rent_price
      });

      // Property'nin tenants listesine kullanıcıyı ekle
      const currentTenants = property.tenants || [];
      const updatedTenants = [...currentTenants, user.id];

      // Property'yi güncelle
      await pb.collection('properties').update(property.id, {
        tenants: updatedTenants,
        status: updatedTenants.length >= property.tenant_limit ? 'rented' : 'rent'
      });

      // Kiralama kaydı oluştur (30 günlük)
      await createRentalRecord(property.id, user.id, property.rent_price);

      alert('Kiralama başarılı! 30 gün boyunca kiraladınız.');
      await fetchRentalProperties(); // Listeyi yenile
    } catch (error) {
      console.error('Kiralama hatası:', error);
      alert('Kiralama başarısız!');
    } finally {
      setRentLoading(null);
    }
  };

  const isUserRenting = (property: Property) => {
    return property.tenants?.includes(user?.id || '');
  };

  const isPropertyFull = (property: Property) => {
    return (property.tenants?.length || 0) >= property.tenant_limit;
  };

  if (loading || loadingProperties) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Kiralık Mülkler</h2>
        <p className="text-gray-600">Kiralayabileceğiniz mülkleri inceleyin (kendi mülkleriniz hariç)</p>
      </div>

      {properties.length === 0 ? (
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Şu anda kiralık mülk yok</h3>
            <p className="text-gray-600 mb-6">Daha sonra tekrar kontrol edin</p>
            <Button onClick={() => router.push('/dashboard')} className="bg-blue-600 hover:bg-blue-700">
              Dashboard'a Dön
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mülk Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tür
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sahip
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kira Fiyatı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kiracı Durumu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {properties.map((property) => (
                  <tr key={property.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{property.name}</div>
                      <div className="text-sm text-gray-500">ID: {property.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(property.type)}`}>
                        {getTypeLabel(property.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{property.own_by}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-green-600">
                        {property.rent_price} USD
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {property.tenants?.length || 0} / {property.tenant_limit} kiracı
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {isUserRenting(property) ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Kiraladınız
                        </span>
                      ) : isPropertyFull(property) ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Dolu
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleRent(property)}
                          disabled={rentLoading === property.id}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {rentLoading === property.id ? 'Kiralanıyor...' : 'Kirala'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
} 