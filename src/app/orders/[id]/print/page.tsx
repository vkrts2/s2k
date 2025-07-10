"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Home } from 'lucide-react';
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Order } from '@/lib/types';
// html2pdf.js için typescript bildirimi
// @ts-ignore
import html2pdf from 'html2pdf.js';
import Link from 'next/link';
import Image from 'next/image';

const orderStatuses = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  in_production: 'Üretimde',
  ready: 'Hazır',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal Edildi'
};

const orderPriorities = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  urgent: 'Acil'
};

export default function OrderPrintPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      try {
        const orderData = JSON.parse(decodeURIComponent(data));
        setOrder(orderData);
      } catch (error) {
        console.error('Error parsing order data:', error);
      }
    }
    // Otomatik PDF indirme
    if (searchParams.get('pdf') === '1') {
      setTimeout(() => handleDownloadPdf(), 1000);
    }
  }, [searchParams]);

  const handlePrint = () => {
    window.print();
  };

  const handleGoBack = () => {
    window.history.back();
  };

  // Güvenli tarih parse fonksiyonu
  function parseSafeDate(val: any): Date {
    if (!val) return new Date();
    if (val instanceof Date && !isNaN(val.getTime())) return val;
    if (typeof val === 'string' && val.trim() !== '') {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }

  // Kalemleri normalize et: quantity ve unit yoksa varsayılan ata
  const normalizedItems = order?.items.map(item => ({
    ...item,
    quantity: typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 1,
    unit: item.unit || 'top',
  })) || [];

  if (!order) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Sipariş bilgisi yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print Header - Home butonu solda, butonlar sağda */}
      <div className="print:hidden bg-white p-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/">
            <Button variant="ghost" className="p-2 text-black hover:bg-gray-100">
              <Home className="h-6 w-6" />
            </Button>
          </Link>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handlePrint}
            className="flex items-center space-x-2 bg-gray-200 text-black hover:bg-gray-300 border-none"
          >
            <Printer className="h-4 w-4" />
            Yazdır
          </Button>
          <Button
            onClick={handleDownloadPdf}
            className="flex items-center space-x-2 bg-gray-200 text-black hover:bg-gray-300 border-none"
          >
            PDF İndir
          </Button>
        </div>
      </div>
      {/* Print Content */}
      <div ref={printRef} className="container mx-auto py-8 px-4 print:py-0 print:px-0">
        <div className="max-w-3xl mx-auto bg-white print:bg-white border border-gray-200 rounded-lg shadow p-8 print:p-0">
          {/* Header */}
          <div className="text-center mb-8 print:mb-6">
            <h1 className="text-4xl font-extrabold mb-2 text-black tracking-tight">SİPARİŞ FORMU</h1>
            <div className="text-gray-700 text-lg">
              <p className="font-medium">Sipariş No: <span className="font-bold text-black">{order.orderNumber}</span></p>
              <p className="font-medium">Tarih: <span className="font-bold text-black">{format(parseSafeDate(order.orderDate), "dd.MM.yyyy", { locale: tr })}</span></p>
            </div>
          </div>
          {/* Company Info */}
          <div className="mb-8 print:mb-6 p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold text-gray-700">Müşteri:</span>
                <span className="ml-2 text-black">{order.customerName}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Teslimat Tarihi:</span>
                <span className="ml-2 text-black">{format(parseSafeDate(order.deliveryDate), "dd.MM.yyyy", { locale: tr })}</span>
              </div>
            </div>
          </div>
          {/* Order Details */}
          <div className="mb-8 print:mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="font-semibold text-gray-700">Durum:</span>
                <span className="ml-2 text-black">{orderStatuses[order.status]}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Öncelik:</span>
                <span className="ml-2 text-black">{orderPriorities[order.priority]}</span>
              </div>
            </div>
          </div>
          {/* Items Table */}
          <div className="mb-8 print:mb-6">
            <h2 className="text-2xl font-bold mb-4 text-black">Sipariş Kalemleri</h2>
            <div className="border-2 border-black rounded-lg overflow-hidden">
              <table className="w-full text-base">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-black p-3 text-left font-bold text-gray-700">Sıra</th>
                    <th className="border border-black p-3 text-left font-bold text-gray-700">Ürün/Hizmet</th>
                    <th className="border border-black p-3 text-center font-bold text-gray-700">Miktar</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedItems.map((item, index) => (
                    <tr key={item.id || index} className="bg-white">
                      <td className="border border-black p-3 text-black">{index + 1}</td>
                      <td className="border border-black p-3 text-black">
                        <span className="font-medium">{item.productName}</span>
                        {item.specifications && (
                          <div className="text-xs text-gray-500 mt-1">{item.specifications}</div>
                        )}
                      </td>
                      <td className="border border-black p-3 text-center text-black">
                        {(item.quantity && item.quantity > 0 && item.unit) ? `${item.quantity} ${item.unit === 'top' ? 'Top' : item.unit === 'kg' ? 'Kg' : item.unit === 'mt' ? 'Mt' : item.unit}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan={3} className="border border-black p-3 text-right font-bold text-gray-700">
                      TOPLAM:
                    </td>
                    <td className="border border-black p-3 text-right font-bold text-lg text-black">
                      -
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          {/* Notes */}
          {order.notes && (
            <div className="mb-8 print:mb-6">
              <h2 className="text-xl font-bold mb-4 text-black">Notlar</h2>
              <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                <span className="whitespace-pre-wrap text-black">{order.notes}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1cm;
            background: #fff !important;
          }
          body {
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );

  // PDF indirme fonksiyonu
  function handleDownloadPdf() {
    if (!printRef.current) return;
    html2pdf().set({
      margin: 10,
      filename: `${order?.orderNumber || 'siparis'}_formu.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(printRef.current).save();
  }
} 