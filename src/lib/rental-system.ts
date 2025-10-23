import { pb } from './pocketbase';
import { Property } from './properties';

export interface RentalRecord {
  id: string;
  property_id: string;
  tenant_id: string;
  rent_start_date: string;
  rent_end_date: string;
  is_active: boolean;
  created: string;
  updated: string;
}

// Kiralama kaydı oluştur
export async function createRentalRecord(
  propertyId: string,
  tenantId: string,
  rentPrice: number
): Promise<RentalRecord> {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30); // 30 gün sonra

  try {
    const rentalRecord = await pb.collection('rental_records').create({
      property_id: propertyId,
      tenant_id: tenantId,
      rent_start_date: startDate.toISOString(),
      rent_end_date: endDate.toISOString(),
      is_active: true,
      rent_price: rentPrice
    });

    return rentalRecord as unknown as RentalRecord;
  } catch (error) {
    throw new Error('Kiralama kaydı oluşturulamadı');
  }
}

// Kiralama süresi dolan kayıtları kontrol et
export async function checkExpiredRentals(): Promise<void> {
  try {
    const today = new Date().toISOString();
    
    // Süresi dolan kiralama kayıtlarını bul
    const expiredRecords = await pb.collection('rental_records').getList(1, 100, {
      filter: `is_active = true && rent_end_date < "${today}"`,
      expand: 'property_id,tenant_id'
    });

    console.log(`${expiredRecords.items.length} adet süresi dolmuş kiralama bulundu`);

    for (const record of expiredRecords.items) {
      const propertyId = record.property_id;
      const tenantId = record.tenant_id;

      // Property'den tenant'ı çıkar
      const property = await pb.collection('properties').getOne(propertyId);
      const currentTenants = property.tenants || [];
      const updatedTenants = currentTenants.filter((id: string) => id !== tenantId);

      // Property'yi güncelle
      await pb.collection('properties').update(propertyId, {
        tenants: updatedTenants,
        status: updatedTenants.length === 0 ? 'rent' : 'rented'
      });

      // Kiralama kaydını pasif yap
      await pb.collection('rental_records').update(record.id, {
        is_active: false
      });

      console.log(`Kiralama süresi doldu: Property ${propertyId}, Tenant ${tenantId}`);
    }
  } catch (error) {
    console.error('Kiralama süresi kontrolü hatası:', error);
  }
}

// Kullanıcının aktif kiralama sayısını getir
export async function getUserActiveRentals(userId: string): Promise<RentalRecord[]> {
  try {
    const records = await pb.collection('rental_records').getList(1, 50, {
      filter: `tenant_id = "${userId}" && is_active = true`,
      expand: 'property_id'
    });

    return records.items as unknown as RentalRecord[];
  } catch (error) {
    console.error('Aktif kiralama kayıtları getirilemedi:', error);
    return [];
  }
} 