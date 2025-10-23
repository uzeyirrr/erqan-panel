import { pb } from './pocketbase';

export interface Property {
  id: string;
  own_by: string;
  type: 'land' | 'home' | 'home_2';
  name: string;
  status: 'rent' | 'rented' | 'sale' | 'empty';
  rent_price: number;
  sale_price: number;
  tenant_limit: number;
  tenants: string[];
  image?: string;
  created: string;
  updated: string;
}

export async function createProperty(
  userId: string,
  type: 'land' | 'home' | 'home_2',
  name: string,
  rentPrice: number,
  salePrice: number
): Promise<Property> {
  try {
    const property = await pb.collection('properties').create({
      own_by: userId,
      type,
      name,
      status: 'empty',
      rent_price: rentPrice,
      sale_price: salePrice,
      tenant_limit: type === 'home' ? 2 : type === 'home_2' ? 5 : 1,
      tenants: [],
    });

    return property as unknown as Property;
  } catch (error) {
    throw new Error('Mülk oluşturulamadı');
  }
} 