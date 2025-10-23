'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { pb } from '@/lib/pocketbase'
import { 
  User, 
  Wallet, 
  Home, 
  Calendar,
  Edit,
  Save,
  X,
  Plus,
  CreditCard,
  Building2
} from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'

interface Property {
  id: string
  name: string
  rent_price?: number
  sale_price?: number
  status: 'rent' | 'rented' | 'sale' | 'empty'
  type: 'land' | 'home' | 'home_2'
  image?: string
  created: string
}

interface Rental {
  id: string
  property: Property
  rent_price: number
  start_date: string
  end_date: string
  status: 'active' | 'expired'
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  })
  const [properties, setProperties] = useState<Property[]>([])
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      
      // Kullanıcının mülklerini getir
      const propertiesData = await pb.collection('properties').getList(1, 50, {
        filter: `own_by = "${user?.id}"`,
        expand: 'tenants'
      })
      setProperties(propertiesData.items as unknown as Property[])

      // Kullanıcının kiraladığı mülkleri getir
      const rentalsData = await pb.collection('properties').getList(1, 50, {
        filter: `tenants ?~ "${user?.id}"`,
        expand: 'own_by'
      })
      
      const userRentals = rentalsData.items.map((item: Record<string, unknown>) => ({
        id: item.id,
        property: item as unknown as Property,
        rent_price: item.rent_price || 0,
        start_date: item.created,
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Örnek bitiş tarihi
        status: 'active'
      })) as Rental[]
      setRentals(userRentals)

    } catch (error) {
      console.error('Veri yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      if (user) {
        await pb.collection('users').update(user.id, {
          name: editForm.name,
          email: editForm.email
        })
        
        // Auth context'i güncelle
        window.location.reload()
      }
    } catch (error) {
      console.error('Profil güncellenirken hata:', error)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditForm({
      name: user?.name || '',
      email: user?.email || ''
    })
    setIsEditing(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-64">
        <Navbar />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Profil</h1>
              <Button
                variant={isEditing ? "destructive" : "outline"}
                onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
              >
                {isEditing ? <X className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                {isEditing ? 'İptal' : 'Düzenle'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Profil Bilgileri */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Kişisel Bilgiler
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Ad Soyad</Label>
                        <Input
                          id="name"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">E-posta</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSave}>
                          <Save className="w-4 h-4 mr-2" />
                          Kaydet
                        </Button>
                        <Button variant="outline" onClick={handleCancel}>
                          <X className="w-4 h-4 mr-2" />
                          İptal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Ad Soyad</Label>
                        <p className="text-lg">{user?.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">E-posta</Label>
                        <p className="text-lg">{user?.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Üyelik Tarihi</Label>
                        <p className="text-lg">{formatDate(user?.created || '')}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cüzdan */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Cüzdan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(user?.credit || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Mevcut Bakiye</p>
                    <Button className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Para Yükle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* İstatistikler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Mülklerim</p>
                      <p className="text-2xl font-bold">{properties.length}</p>
                    </div>
                    <Building2 className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Kiraladıklarım</p>
                      <p className="text-2xl font-bold">{rentals.length}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Toplam Değer</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(properties.reduce((sum, prop) => sum + (prop.sale_price || 0), 0))}
                      </p>
                    </div>
                    <CreditCard className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detaylı Bilgiler */}
            <Tabs defaultValue="properties" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="properties">Mülk Özeti</TabsTrigger>
                <TabsTrigger value="rentals">Kira Özeti</TabsTrigger>
              </TabsList>
              
              <TabsContent value="properties" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Mülklerim</CardTitle>
                    <CardDescription>Mülklerinizin detaylı listesi</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {properties.length > 0 ? (
                        properties.map((property) => (
                          <div key={property.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              {property.image && (
                                <img 
                                  src={`http://31.97.37.128:8090/api/files/properties/${property.id}/${property.image}`}
                                  alt={property.name}
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                              )}
                              <div>
                                <h4 className="font-medium">{property.name}</h4>
                                <p className="text-sm text-muted-foreground capitalize">{property.type}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {property.sale_price ? formatCurrency(property.sale_price) : formatCurrency(property.rent_price || 0)}
                              </p>
                              <Badge variant={property.status === 'rent' ? 'default' : 'secondary'}>
                                {property.status === 'rent' ? 'Kiralık' : 
                                 property.status === 'sale' ? 'Satılık' : 
                                 property.status === 'rented' ? 'Kirada' : 'Boş'}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Henüz mülkünüz bulunmuyor</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="rentals" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Kiraladıklarım</CardTitle>
                    <CardDescription>Kiraladığınız mülklerin listesi</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {rentals.length > 0 ? (
                        rentals.map((rental) => (
                          <div key={rental.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              {rental.property.image && (
                                <img 
                                  src={`http://31.97.37.128:8090/api/files/properties/${rental.property.id}/${rental.property.image}`}
                                  alt={rental.property.name}
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                              )}
                              <div>
                                <h4 className="font-medium">{rental.property.name}</h4>
                                <p className="text-sm text-muted-foreground capitalize">{rental.property.type}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(rental.rent_price)}/ay</p>
                              <p className="text-sm text-muted-foreground">Bitiş: {formatDate(rental.end_date)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Henüz kiraladığınız mülk bulunmuyor</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
} 