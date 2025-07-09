// src/app/reports/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ReportService } from "@/lib/reportService";
import { ReportType, ReportFilters } from "@/lib/reportTypes";
import { formatCurrency, groupByMonth } from "@/lib/reportUtils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const REPORT_TYPES: { key: ReportType | 'monthly-sales-purchases'; label: string }[] = [
  { key: "profit-loss", label: "Kar-Zarar" },
  { key: "customer-sales-payments", label: "Müşteri Bazlı" },
  { key: "monthly-sales-purchases", label: "Aylık Alış-Satış" },
];

const CURRENCIES = ["TRY", "USD", "EUR"];

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });
  const [selectedReport, setSelectedReport] = useState<string>("profit-loss");
  const [currency, setCurrency] = useState("TRY");
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; sales: number; purchases: number }>>([]);

  // Kullanıcı yoksa uyarı göster
  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold mb-4">Raporlar</h2>
        <div className="text-lg text-red-500 font-semibold">Lütfen raporları görüntülemek için giriş yapın.</div>
      </div>
    );
  }

  // Raporu getir
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    const filters: ReportFilters = {
      dateRange,
      currency: currency as any,
      customerId: selectedReport === "customer-sales-payments" ? customerId : undefined,
    };
    const reportService = new ReportService(user.uid);
    if (selectedReport === "customer-sales-payments" && !customerId) {
      setError(null);
      setLoading(false);
      return;
    }
    if (selectedReport !== "monthly-sales-purchases") {
      reportService
        .generateReport(selectedReport as ReportType, filters)
        .then((data: any) => setReportData(data))
        .catch((err: any) => setError(err.message || "Bilinmeyen hata"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line
  }, [selectedReport, dateRange, currency, customerId, user]);

  // Aylık Alış-Satış verisini çek
  useEffect(() => {
    if (!user) return;
    if (selectedReport !== "monthly-sales-purchases") return;
    setLoading(true);
    setError(null);
    const filters: ReportFilters = {
      dateRange,
      currency: currency as any,
    };
    const reportService = new ReportService(user.uid);
    Promise.all([
      reportService.getSales(filters),
      reportService.getPurchases(filters),
    ])
      .then(([sales, purchases]) => {
        const salesByMonth = groupByMonth(sales, currency as any);
        const purchasesByMonth = groupByMonth(purchases, currency as any);
        // Tüm ayları birleştir
        const allMonths = Array.from(new Set([...Object.keys(salesByMonth), ...Object.keys(purchasesByMonth)])).sort();
        const data = allMonths.map((month) => ({
          month,
          sales: salesByMonth[month] || 0,
          purchases: purchasesByMonth[month] || 0,
        }));
        setMonthlyData(data);
      })
      .catch((err) => setError(err.message || "Bilinmeyen hata"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [selectedReport, dateRange, currency, user]);

  // Tarih aralığı seçici
  function DateRangePicker() {
    return (
      <div className="flex gap-2 items-center">
        <input
          type="date"
          value={format(dateRange.start, "yyyy-MM-dd")}
          onChange={(e) => setDateRange((r) => ({ ...r, start: new Date(e.target.value) }))}
          className="border rounded px-2 py-1 bg-background"
        />
        <span>-</span>
        <input
          type="date"
          value={format(dateRange.end, "yyyy-MM-dd")}
          onChange={(e) => setDateRange((r) => ({ ...r, end: new Date(e.target.value) }))}
          className="border rounded px-2 py-1 bg-background"
        />
      </div>
    );
  }

  // Para birimi seçici
  function CurrencySelect() {
    return (
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="border rounded px-2 py-1 bg-background"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    );
  }

  // Müşteri seçici (sadece müşteri bazlı raporda göster)
  function CustomerSelect() {
    const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      async function fetchCustomers() {
        try {
          const customersRef = collection(db, `users/${user?.uid}/customers`);
          const snapshot = await getDocs(customersRef);
          const customersList = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
          }));
          setCustomers(customersList);
        } catch (e) {
          console.error('Müşteri listesi alınamadı:', e);
        } finally {
          setLoading(false);
        }
      }
      fetchCustomers();
    }, []);

    if (loading) {
      return <span className="text-muted-foreground">Müşteriler yükleniyor...</span>;
    }

    return (
      <select
        value={customerId === undefined ? "all" : customerId}
        onChange={(e) => setCustomerId(e.target.value === "all" ? undefined : e.target.value)}
        className="border rounded px-2 py-1 bg-background min-w-[200px]"
      >
        <option value="all">Tüm Müşteriler</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    );
  }

  // PDF/Excel çıktı butonları
  function ExportButtons() {
    return (
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setInfo("PDF/Excel çıktısı özelliği çok yakında eklenecek!")}>PDF</Button>
        <Button variant="outline" onClick={() => setInfo("PDF/Excel çıktısı özelliği çok yakında eklenecek!")}>Excel</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[80vh]">
      {/* Sol menü */}
      <aside className="md:w-56 border-r bg-muted/30 p-4 flex md:flex-col gap-2 md:gap-4">
        {REPORT_TYPES.map((rt) => (
          <Button
            key={rt.key}
            variant={selectedReport === rt.key ? "default" : "ghost"}
            className="w-full text-left px-3 py-2 rounded font-medium transition-all"
            onClick={() => setSelectedReport(rt.key)}
          >
            {rt.label}
          </Button>
        ))}
      </aside>
      {/* Ana içerik */}
      <main className="flex-1 p-4 md:p-8">
        <h1 className="text-2xl font-bold mb-4 text-center">Raporlar</h1>
        {/* Filtreler */}
        <div className="flex flex-wrap gap-4 items-center justify-center mb-6">
          <DateRangePicker />
          <CurrencySelect />
          {selectedReport === "customer-sales-payments" && <CustomerSelect />}
          <ExportButtons />
        </div>
        {info && <div className="text-center text-blue-500 font-semibold mb-4">{info}</div>}
        {/* İçerik */}
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span>
            <span className="ml-4 text-lg">Rapor yükleniyor...</span>
          </div>
        ) : error ? (
          <div className="text-red-600 text-center font-semibold py-8">{error}</div>
        ) : reportData ? (
          <div className="space-y-6">
            {selectedReport === "customer-sales-payments" && reportData && reportData.sales && reportData.sales.details.length > 0 ? (
              <>
                {/* Özet kutuları */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-green-100 dark:bg-green-900/60 rounded-xl p-4 shadow text-center">
                    <div className="text-lg font-semibold">Toplam Satış</div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(reportData.sales.total, currency as any)}
                    </div>
                  </Card>
                  <Card className="bg-blue-100 dark:bg-blue-900/60 rounded-xl p-4 shadow text-center">
                    <div className="text-lg font-semibold">Toplam Tahsilat</div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {formatCurrency(reportData.payments.total, currency as any)}
                    </div>
                  </Card>
                  <Card className="bg-yellow-100 dark:bg-yellow-900/60 rounded-xl p-4 shadow text-center">
                    <div className="text-lg font-semibold">Bakiye</div>
                    <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                      {formatCurrency(reportData.balance, currency as any)}
                    </div>
                  </Card>
                </div>
                {/* Satışlar grafiği */}
                <Card className="bg-muted/40 rounded-xl p-6 shadow text-center min-h-[200px] mt-6">
                  <div className="mb-4 text-lg font-semibold">Aylık Satış Grafiği</div>
                  <Line
                    data={{
                      labels: Object.keys(reportData.sales.byCurrency),
                      datasets: [
                        {
                          label: 'Satışlar',
                          data: Object.values(reportData.sales.byCurrency),
                          borderColor: 'rgb(34, 197, 94)',
                          backgroundColor: 'rgba(34, 197, 94, 0.5)',
                          tension: 0.3,
                          fill: true,
                        }
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'top' as const },
                        title: { display: false },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return formatCurrency(value as number, currency as any);
                            }
                          }
                        }
                      }
                    }}
                  />
                </Card>
                {/* Satışlar detay tablosu */}
                <div className="overflow-x-auto mt-4">
                  <table className="min-w-full text-sm border rounded bg-background">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-3 py-2 text-left">Tarih</th>
                        <th className="px-3 py-2 text-left">Açıklama</th>
                        <th className="px-3 py-2 text-right">Tutar</th>
                        <th className="px-3 py-2 text-left">Para Birimi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.sales.details.map((item: any, i: number) => (
                        <tr key={i} className="border-b last:border-b-0">
                          <td className="px-3 py-2">{item.date}</td>
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.amount, item.currency)}</td>
                          <td className="px-3 py-2">{item.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : selectedReport === "customer-sales-payments" && reportData && reportData.sales && reportData.sales.details.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <p className="text-lg mb-2">Seçilen müşteri için kayıt bulunamadı.</p>
              </div>
            ) : null}
            {/* Kar-Zarar için grafikler */}
            {selectedReport === "profit-loss" && reportData && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Satışlar grafiği */}
                <Card className="bg-muted/40 rounded-xl p-6 shadow text-center min-h-[200px]">
                  <div className="mb-4 text-lg font-semibold">Aylık Satış Grafiği</div>
                  <Line
                    data={{
                      labels: Object.keys(reportData.revenue.byMonth),
                      datasets: [
                        {
                          label: 'Satışlar',
                          data: Object.values(reportData.revenue.byMonth),
                          borderColor: 'rgb(34, 197, 94)',
                          backgroundColor: 'rgba(34, 197, 94, 0.5)',
                          tension: 0.3,
                          fill: true,
                        }
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'top' as const },
                        title: { display: false },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return formatCurrency(value as number, currency as any);
                            }
                          }
                        }
                      }
                    }}
                  />
                </Card>
                {/* Alışlar grafiği */}
                <Card className="bg-muted/40 rounded-xl p-6 shadow text-center min-h-[200px]">
                  <div className="mb-4 text-lg font-semibold">Aylık Alış Grafiği</div>
                  <Line
                    data={{
                      labels: Object.keys(reportData.costs.byMonth),
                      datasets: [
                        {
                          label: 'Alışlar',
                          data: Object.values(reportData.costs.byMonth),
                          borderColor: 'rgb(239, 68, 68)',
                          backgroundColor: 'rgba(239, 68, 68, 0.5)',
                          tension: 0.3,
                          fill: true,
                        }
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'top' as const },
                        title: { display: false },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return formatCurrency(value as number, currency as any);
                            }
                          }
                        }
                      }
                    }}
                  />
                </Card>
              </div>
            )}
            {/* Aylık Alış-Satış için grafik ve tablo */}
            {selectedReport === "monthly-sales-purchases" && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-center mb-4">Aylık Alış-Satış Raporu</h2>
                {/* Grafik */}
                <Card className="bg-muted/40 rounded-xl p-6 shadow text-center min-h-[200px]">
                  <Bar
                    data={{
                      labels: monthlyData.map(d => d.month),
                      datasets: [
                        {
                          label: 'Satış',
                          data: monthlyData.map(d => d.sales),
                          backgroundColor: 'rgba(34,197,94,0.7)',
                        },
                        {
                          label: 'Alış',
                          data: monthlyData.map(d => d.purchases),
                          backgroundColor: 'rgba(239,68,68,0.7)',
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'top' as const },
                        title: { display: true, text: 'Aylık Alış-Satış Grafiği' },
                      },
                    }}
                  />
                </Card>
                {/* Tablo */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-center border">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-4 py-2 border">Ay</th>
                        <th className="px-4 py-2 border">Toplam Satış</th>
                        <th className="px-4 py-2 border">Toplam Alış</th>
                        <th className="px-4 py-2 border">Net Kar/Zarar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.length === 0 && !loading && (
                        <tr>
                          <td colSpan={4} className="border px-4 py-2 text-muted-foreground">Veri bulunamadı</td>
                        </tr>
                      )}
                      {monthlyData.map((row) => (
                        <tr key={row.month}>
                          <td className="border px-4 py-2">{row.month}</td>
                          <td className="border px-4 py-2">{formatCurrency(row.sales, currency as any)}</td>
                          <td className="border px-4 py-2">{formatCurrency(row.purchases, currency as any)}</td>
                          <td className="border px-4 py-2">{formatCurrency(row.sales - row.purchases, currency as any)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12">Rapor verisi bulunamadı.</div>
        )}
      </main>
    </div>
  );
}
