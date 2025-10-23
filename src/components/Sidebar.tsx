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
  Settings,
  CreditCard
} from 'lucide-react';

export default function Sidebar() {
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
      name: 'Kiralık Mülkler',
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
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50 lg:bg-white lg:border-r lg:border-gray-200">
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
          <span className="text-white font-bold text-sm">E</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Erqan</h1>
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.name}
                variant={item.current ? "default" : "ghost"}
                className={`w-full justify-start ${
                  item.current 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => router.push(item.href)}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Button>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-4 p-3 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <CreditCard className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-700">Kredi</span>
            </div>
            <span className="text-sm font-bold text-green-700">{user?.credit || 0} USD</span>
          </div>

          <Button
            variant="outline"
            className="w-full justify-start text-gray-700 hover:bg-gray-50"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Çıkış Yap
          </Button>
        </div>
      </div>
    </div>
  );
} 