'use client';
// src/app/page.tsx
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Truck, Settings, Calculator, AreaChart, CheckSquare, Briefcase, FolderArchive, LinkIcon, Package, FileText, ReceiptText, Search, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  {
    href: '/customers',
    label: 'Müşteriler',
    description: 'Müşteri kayıtlarınızı yönetin.',
    icon: <Users className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/suppliers',
    label: 'Tedarikçiler',
    description: 'Tedarikçi kayıtlarınızı yönetin.',
    icon: <Truck className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/stock',
    label: 'Stok Yönetimi',
    description: 'Stok kalemlerinizi takip edin.',
    icon: <Package className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/calculator',
    label: 'Hesap Makinesi',
    description: 'Basit maliyet hesaplamaları yapın.',
    icon: <Calculator className="h-8 w-8 mb-2 text-primary" />,
  },
   {
    href: '/reports',
    label: 'Raporlar',
    description: 'Finansal özetlerinizi görüntüleyin.',
    icon: <AreaChart className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/todos',
    label: 'Yapılacaklar Listesi',
    description: 'Görevlerinizi takip edin ve yönetin.',
    icon: <CheckSquare className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/portfolio',
    label: 'Portföy Listesi',
    description: 'Portföyünüzü yönetin ve takip edin.',
    icon: <Briefcase className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/archive',
    label: 'Dosya Arşivi',
    description: 'Belgelerinizi ve dosyalarınızı yönetin.',
    icon: <FolderArchive className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/useful-links',
    label: 'Faydalı Linkler',
    description: 'Sık kullandığınız linkleri kaydedin.',
    icon: <LinkIcon className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/quotations',
    label: 'Fiyat Teklifi',
    description: 'Fiyat teklifleri oluşturun ve yönetin.',
    icon: <FileText className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/customer-search',
    label: 'Müşteri Keşfi',
    description: 'Yeni müşteriler keşfedin.',
    icon: <Search className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/check-management',
    label: 'Çek Yönetimi',
    description: 'Çeklerinizi yönetin ve takip edin.',
    icon: <ReceiptText className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/settings',
    label: 'Ayarlar',
    description: 'Uygulama ayarlarınızı yapılandırın.',
    icon: <Settings className="h-8 w-8 mb-2 text-primary" />,
  },
];

export default function HomePage() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  if (!user) {
    // Kullanıcı oturum açmamışsa giriş ve kayıt ol butonları göster
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Hoş geldiniz!</h2>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 bg-indigo-600 text-white rounded">Giriş Yap</Link>
          <Link href="/register" className="px-4 py-2 bg-gray-200 text-gray-800 rounded">Kayıt Ol</Link>
        </div>
      </div>
    );
  }

  // Kullanıcı oturum açmışsa çıkış yap butonu ve ana sayfa içeriği göster
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-4">
      <div className="w-full flex justify-end mb-4">
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Çıkış Yap
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 w-full max-w-7xl mt-12">
        <Link href="/customers" className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg">
          <Users className="w-5 h-5" />
          <span>Müşteriler</span>
        </Link>
        <Link href="/suppliers" className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg">
          <Truck className="w-5 h-5" />
          <span>Tedarikçiler</span>
        </Link>
        <Link href="/products" className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg">
          <Package className="w-5 h-5" />
          <span>Ürünler</span>
        </Link>
        <Link href="/dashboard" className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg">
          <BarChart3 className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>
        {navItems.map((item) => (
          <Link href={item.href} key={item.label} passHref>
            <Card className="hover:shadow-lg transition-shadow duration-300 ease-in-out cursor-pointer h-full flex flex-col justify-between text-center bg-card hover:bg-accent/10">
              <CardHeader className="items-center">
                {item.icon}
                <CardTitle className="text-xl font-semibold">{item.label}</CardTitle>
                {item.description && (
                  <CardDescription className="text-sm text-muted-foreground mt-1">
                    {item.description}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
