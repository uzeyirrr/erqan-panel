/// <reference path="../pb_data/types.d.ts" />

onRequest('*', (e) => {
    // Her gün saat 00:00'da çalışacak cron job
    const now = new Date();
    const isMidnight = now.getHours() === 0 && now.getMinutes() === 0;
    
    if (isMidnight) {
        checkExpiredRentals();
    }
});

// Kiralama süresi dolan kayıtları kontrol et
async function checkExpiredRentals() {
    try {
        const today = new Date().toISOString();
        
        // Süresi dolan kiralama kayıtlarını bul
        const expiredRecords = await $app.dao().findRecordsByFilter('rental_records', 'is_active = true && rent_end_date < "' + today + '"');
        
        console.log(`${expiredRecords.length} adet süresi dolmuş kiralama bulundu`);
        
        for (const record of expiredRecords) {
            const propertyId = record.property_id;
            const tenantId = record.tenant_id;
            
            // Property'den tenant'ı çıkar
            const property = await $app.dao().findRecordById('properties', propertyId);
            const currentTenants = property.tenants || [];
            const updatedTenants = currentTenants.filter(id => id !== tenantId);
            
            // Property'yi güncelle
            property.tenants = updatedTenants;
            property.status = updatedTenants.length === 0 ? 'rent' : 'rented';
            await $app.dao().saveRecord(property);
            
            // Kiralama kaydını pasif yap
            record.is_active = false;
            await $app.dao().saveRecord(record);
            
            console.log(`Kiralama süresi doldu: Property ${propertyId}, Tenant ${tenantId}`);
        }
    } catch (error) {
        console.error('Kiralama süresi kontrolü hatası:', error);
    }
} 