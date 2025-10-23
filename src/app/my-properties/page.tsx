'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { pb } from '@/lib/pocketbase';
import { Property } from '@/lib/properties';
import Layout from '@/components/Layout';

export default function MyPropertiesPage() {
  const { user, loading, logout } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [rentedProperties, setRentedProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    rent_price: 0,
    sale_price: 0
  });
  const [activeTab, setActiveTab] = useState<'owned' | 'rented'>('owned');
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchProperties();
      fetchRentedProperties();
    }
  }, [user]);

  const fetchProperties = async () => {
    try {
      console.log('Mülkler yükleniyor...');
      
      const records = await pb.collection('properties').getList(1, 50, {
        filter: `own_by = "${user?.id}"`,
        expand: 'own_by',
        $autoCancel: false
      });
      
      console.log('Mülkler yüklendi:', records.items.length);
      setProperties(records.items as unknown as Property[]);
    } catch (error) {
      console.error('Mülkler yüklenirken hata:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const fetchRentedProperties = async () => {
    try {
      console.log('Kiraladığım mülkler yükleniyor...');
      
      const records = await pb.collection('properties').getList(1, 50, {
        filter: `tenants ?~ "${user?.id}"`,
        expand: 'own_by',
        $autoCancel: false
      });
      
      console.log('Kiraladığım mülkler yüklendi:', records.items.length);
      setRentedProperties(records.items as unknown as Property[]);
    } catch (error) {
      console.error('Kiraladığım mülkler yüklenirken hata:', error);
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'rent':
        return 'Kiralık';
      case 'rented':
        return 'Kirada';
      case 'sale':
        return 'Satılık';
      case 'empty':
        return 'Boş';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'rent':
        return 'bg-blue-100 text-blue-800';
      case 'rented':
        return 'bg-green-100 text-green-800';
      case 'sale':
        return 'bg-orange-100 text-orange-800';
      case 'empty':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusChange = async (propertyId: string, newStatus: string) => {
    setActionLoading(propertyId);
    try {
      await pb.collection('properties').update(propertyId, {
        status: newStatus
      });
      await fetchProperties();
    } catch (error) {
      alert('Durum güncellenirken hata oluştu!');
    } finally {
      setActionLoading(null);
    }
  };

  const startEditing = (property: Property) => {
    setEditingProperty(property.id);
    setEditForm({
      rent_price: property.rent_price || 0,
      sale_price: property.sale_price || 0
    });
  };

  const cancelEditing = () => {
    setEditingProperty(null);
    setEditForm({ rent_price: 0, sale_price: 0 });
  };

  const saveEditing = async (propertyId: string) => {
    setActionLoading(propertyId);
    try {
      await pb.collection('properties').update(propertyId, {
        rent_price: editForm.rent_price,
        sale_price: editForm.sale_price
      });
      await fetchProperties();
      setEditingProperty(null);
      setEditForm({ rent_price: 0, sale_price: 0 });
    } catch (error) {
      alert('Fiyat güncellenirken hata oluştu!');
    } finally {
      setActionLoading(null);
    }
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Mülkleriniz</h2>
        <p className="text-gray-600">Satın aldığınız mülkleri yönetin ve fiyatlarını düzenleyin</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('owned')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'owned'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sahip Olduklarım ({properties.length})
            </button>
            <button
              onClick={() => setActiveTab('rented')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rented'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Kiraladıklarım ({rentedProperties.length})
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'owned' ? (
        // Sahip Olduklarım Tab
        properties.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🏠</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Henüz mülkünüz yok</h3>
              <p className="text-gray-600 mb-6">Dashboard&apos;dan mülk satın alarak başlayın</p>
              <Button onClick={() => router.push('/dashboard')} className="bg-blue-600 hover:bg-blue-700">
                Mülk Satın Al
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white/80 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
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
                        Durum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kira Fiyatı
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Satış Fiyatı
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kiracı Limiti
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getTypeLabel(property.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
                            {getStatusLabel(property.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingProperty === property.id ? (
                            <div className="space-y-2">
                              <Label htmlFor={`rent-${property.id}`} className="text-xs text-gray-500">Kira Fiyatı (USD)</Label>
                              <Input
                                id={`rent-${property.id}`}
                                type="number"
                                value={editForm.rent_price}
                                onChange={(e) => setEditForm(prev => ({ ...prev, rent_price: Number(e.target.value) }))}
                                className="w-20 h-8 text-sm"
                                min="0"
                              />
                            </div>
                          ) : (
                            <div className="text-sm text-gray-900">
                              {property.rent_price} USD
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingProperty === property.id ? (
                            <div className="space-y-2">
                              <Label htmlFor={`sale-${property.id}`} className="text-xs text-gray-500">Satış Fiyatı (USD)</Label>
                              <Input
                                id={`sale-${property.id}`}
                                type="number"
                                value={editForm.sale_price}
                                onChange={(e) => setEditForm(prev => ({ ...prev, sale_price: Number(e.target.value) }))}
                                className="w-20 h-8 text-sm"
                                min="0"
                              />
                            </div>
                          ) : (
                            <div className="text-sm text-gray-900">
                              {property.sale_price} USD
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {property.tenant_limit} kiracı
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {editingProperty === property.id ? (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => saveEditing(property.id)}
                                disabled={actionLoading === property.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {actionLoading === property.id ? 'Kaydediliyor...' : 'Kaydet'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                                disabled={actionLoading === property.id}
                              >
                                İptal
                              </Button>
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(property)}
                                disabled={actionLoading === property.id}
                              >
                                Düzenle
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newStatus = property.status === 'empty' ? 'rent' : 'empty';
                                  handleStatusChange(property.id, newStatus);
                                }}
                                disabled={actionLoading === property.id}
                              >
                                {property.status === 'empty' ? 'Kiralık Yap' : 'Boş Yap'}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {properties.map((property) => (
                <Card key={property.id} className="bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{property.name}</h3>
                          <p className="text-sm text-gray-500">ID: {property.id}</p>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getTypeLabel(property.type)}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
                            {getStatusLabel(property.status)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Kira Fiyatı:</span>
                          {editingProperty === property.id ? (
                            <Input
                              type="number"
                              value={editForm.rent_price}
                              onChange={(e) => setEditForm(prev => ({ ...prev, rent_price: Number(e.target.value) }))}
                              className="mt-1 h-8 text-sm"
                              min="0"
                            />
                          ) : (
                            <span className="ml-2 font-medium">{property.rent_price} USD</span>
                          )}
                        </div>
                        <div>
                          <span className="text-gray-500">Satış Fiyatı:</span>
                          {editingProperty === property.id ? (
                            <Input
                              type="number"
                              value={editForm.sale_price}
                              onChange={(e) => setEditForm(prev => ({ ...prev, sale_price: Number(e.target.value) }))}
                              className="mt-1 h-8 text-sm"
                              min="0"
                            />
                          ) : (
                            <span className="ml-2 font-medium">{property.sale_price} USD</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <span className="text-gray-500">Kiracı Limiti:</span>
                        <span className="ml-2 font-medium">{property.tenant_limit} kiracı</span>
                      </div>
                      
                      <div className="flex space-x-2 pt-2">
                        {editingProperty === property.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => saveEditing(property.id)}
                              disabled={actionLoading === property.id}
                              className="bg-green-600 hover:bg-green-700 flex-1"
                            >
                              {actionLoading === property.id ? 'Kaydediliyor...' : 'Kaydet'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                              disabled={actionLoading === property.id}
                              className="flex-1"
                            >
                              İptal
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              onClick={() => startEditing(property)}
                              disabled={actionLoading === property.id}
                              className="flex-1"
                            >
                              Düzenle
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newStatus = property.status === 'empty' ? 'rent' : 'empty';
                                handleStatusChange(property.id, newStatus);
                              }}
                              disabled={actionLoading === property.id}
                              className="flex-1"
                            >
                              {property.status === 'empty' ? 'Kiralık Yap' : 'Boş Yap'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )
      ) : (
        // Kiraladıklarım Tab
        rentedProperties.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Henüz mülk kiralamadınız</h3>
              <p className="text-gray-600 mb-6">Kiralık mülkler sayfasından mülk kiralayabilirsiniz</p>
              <Button onClick={() => router.push('/rental-properties')} className="bg-blue-600 hover:bg-blue-700">
                Kiralık Mülkler
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
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rentedProperties.map((property) => (
                    <tr key={property.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{property.name}</div>
                        <div className="text-sm text-gray-500">ID: {property.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
                          {getStatusLabel(property.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </Layout>
  );
} 