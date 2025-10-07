'use client';
// src/app/page.tsx
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Truck, Settings, Calculator, AreaChart, CheckSquare, Briefcase, FolderArchive, LinkIcon, Package, FileText, ReceiptText, Search, BarChart3, TrendingUp, DollarSign, ClipboardList, ShoppingCart, Brain, Bot, Archive } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useState } from 'react';

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
    label: 'Stok Kalemleri',
    description: 'Ürünlerinizi ve stok kalemlerinizi yönetin.',
    icon: <Package className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/calculator',
    label: 'Hesap Makinesi',
    description: 'Basit maliyet hesaplamaları yapın.',
    icon: <Calculator className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/costs',
    label: 'Maliyet Yönetimi',
    description: 'Kâr marjı analizi ve maliyet merkezi yönetimi.',
    icon: <ClipboardList className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/check-management',
    label: 'Ödeme Takibi',
    description: 'Ödemelerinizi ve çeklerinizi takip edin.',
    icon: <ReceiptText className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/reports',
    label: 'Raporlar',
    description: 'Finansal özetlerinizi görüntüleyin.',
    icon: <AreaChart className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/stock-movements',
    label: 'Stok Hareketleri',
    description: 'Stok giriş/çıkışlarını görüntüleyin.',
    icon: <Archive className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/business-intelligence',
    label: 'İş Zekası',
    description: 'Dashboard widgetları ve KPI takibi.',
    icon: <Brain className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/chat',
    label: 'Chat Bot',
    description: 'Gemini destekli asistan ile sohbet edin.',
    icon: <Bot className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/portfolio',
    label: 'Portföy Listesi',
    description: 'Portföyünüzü yönetin ve takip edin.',
    icon: <Briefcase className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/quotations',
    label: 'Fiyat Teklifi',
    description: 'Fiyat teklifleri oluşturun ve yönetin.',
    icon: <FileText className="h-8 w-8 mb-2 text-primary" />,
  },
  {
    href: '/orders',
    label: 'Sipariş Yönetimi',
    description: 'Siparişlerinizi yönetin ve takip edin.',
    icon: <ShoppingCart className="h-8 w-8 mb-2 text-primary" />,
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
    href: '/settings',
    label: 'Ayarlar',
    description: 'Uygulama ayarlarınızı yapılandırın.',
    icon: <Settings className="h-8 w-8 mb-2 text-primary" />,
  },
];

export default function HomePage() {
  const { user, loading, logout } = useAuth();

  // Tarih ve saat için state
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('tr-TR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
  };

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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-4">
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Çıkış Yap
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
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
          {/* Dönüştürücü kutusu kaldırıldı */}
        </div>
      </div>
    </div>
  );
}
