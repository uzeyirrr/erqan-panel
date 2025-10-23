'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import OfflineIndicator from './OfflineIndicator';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Sidebar for Desktop */}
      <Sidebar />
      
      {/* Navbar for Mobile */}
      <Navbar />
      
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
} 