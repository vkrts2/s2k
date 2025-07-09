"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from 'lucide-react';
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Order } from '@/lib/types';

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
  }, [searchParams]);

  const handlePrint = () => {
    window.print();
  };

  const handleGoBack = () => {
    window.history.back();
  };

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
      {/* Print Header - Only visible on screen */}
      <div className="print:hidden bg-gray-100 p-4 border-b">
        <div className="container mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri Dön
          </Button>
          <Button
            onClick={handlePrint}
            className="flex items-center space-x-2"
          >
            <Printer className="h-4 w-4" />
            Yazdır
          </Button>
        </div>
      </div>

      {/* Print Content */}
      <div className="container mx-auto py-8 px-4 print:py-0 print:px-0">
        <div className="max-w-4xl mx-auto bg-white print:bg-white">
          {/* Header */}
          <div className="text-center mb-8 print:mb-6">
            <h1 className="text-3xl font-bold mb-2">SİPARİŞ FORMU</h1>
            <div className="text-gray-600">
              <p>Sipariş No: {order.orderNumber}</p>
              <p>Tarih: {format(new Date(order.orderDate), "dd.MM.yyyy", { locale: tr })}</p>
            </div>
          </div>

          {/* Company Info */}
          <div className="mb-8 print:mb-6 p-4 border-2 border-gray-300 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Firma Bilgileri</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Müşteri:</p>
                <p className="text-lg">{order.customerName}</p>
              </div>
              <div>
                <p className="font-semibold">Teslimat Tarihi:</p>
                <p className="text-lg">{format(new Date(order.deliveryDate), "dd.MM.yyyy", { locale: tr })}</p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="mb-8 print:mb-6">
            <h2 className="text-xl font-bold mb-4">Sipariş Detayları</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="font-semibold">Durum:</p>
                <p className="text-lg">{orderStatuses[order.status]}</p>
              </div>
              <div>
                <p className="font-semibold">Öncelik:</p>
                <p className="text-lg">{orderPriorities[order.priority]}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8 print:mb-6">
            <h2 className="text-xl font-bold mb-4">Sipariş Kalemleri</h2>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 p-3 text-left font-bold">Sıra</th>
                    <th className="border border-gray-300 p-3 text-left font-bold">Ürün/Hizmet</th>
                    <th className="border border-gray-300 p-3 text-center font-bold">Miktar</th>
                    <th className="border border-gray-300 p-3 text-right font-bold">Birim Fiyat</th>
                    <th className="border border-gray-300 p-3 text-right font-bold">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="border border-gray-300 p-3">{index + 1}</td>
                      <td className="border border-gray-300 p-3">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          {item.specifications && (
                            <p className="text-sm text-gray-600 mt-1">{item.specifications}</p>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-300 p-3 text-center">{item.quantity}</td>
                      <td className="border border-gray-300 p-3 text-right">
                        {item.unitPrice.toLocaleString('tr-TR', {
                          style: 'currency',
                          currency: order.currency
                        })}
                      </td>
                      <td className="border border-gray-300 p-3 text-right font-semibold">
                        {item.total.toLocaleString('tr-TR', {
                          style: 'currency',
                          currency: order.currency
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="border border-gray-300 p-3 text-right font-bold">
                      TOPLAM:
                    </td>
                    <td className="border border-gray-300 p-3 text-right font-bold text-lg">
                      {order.totalAmount.toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: order.currency
                      })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="mb-8 print:mb-6">
              <h2 className="text-xl font-bold mb-4">Notlar</h2>
              <div className="border-2 border-gray-300 rounded-lg p-4">
                <p className="whitespace-pre-wrap">{order.notes}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 print:mt-8 pt-8 border-t-2 border-gray-300">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="font-bold mb-2">Müşteri İmza:</h3>
                <div className="border-b-2 border-gray-400 h-12"></div>
              </div>
              <div>
                <h3 className="font-bold mb-2">Firma İmza:</h3>
                <div className="border-b-2 border-gray-400 h-12"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1cm;
          }
          body {
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
} 