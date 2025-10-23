import PocketBase from 'pocketbase';

export const pb = new PocketBase('https://api.erqan.com/');

// Timeout ve retry ayarları
pb.beforeSend = function(url, options) {
  options.timeout = 10000; // 10 saniye timeout
  return { url, options };
};

export type AuthModel = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  credit?: number;
  rent_paid?: number;
  created: string;
  updated: string;
}; 