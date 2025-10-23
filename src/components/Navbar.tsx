'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Home, 
  Building2, 
  Search, 
  User, 
  LogOut,
  Menu,
  X,
  CreditCard
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      current: pathname === '/dashboard'
    },
    {
      name: 'Mülklerim',
      href: '/my-properties',
      icon: Building2,
      current: pathname === '/my-properties'
    },
    {
      name: 'Kiralık',
      href: '/rental-properties',
      icon: Search,
      current: pathname === '/rental-properties'
    },
    {
      name: 'Profil',
      href: '/profile',
      icon: User,
      current: pathname === '/profile'
    }
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Erqan</h1>
            </div>
            
            {/* User Info */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                <CreditCard className="w-3 h-3 mr-1" />
                {user?.credit || 0} USD
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center py-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
                  item.current 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Spacer for Mobile */}
      <div className="lg:hidden h-20"></div>
    </>
  );
} 