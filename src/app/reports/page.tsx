// src/app/reports/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { ReportService } from "@/lib/reportService";
import { ReportType, ReportFilters } from "@/lib/reportTypes";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { formatCurrency } from "@/lib/reportUtils";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";

const REPORT_TYPES: { key: ReportType; label: string }[] = [
  { key: "income-expense", label: "Gelir-Gider" },
  { key: "profit-loss", label: "Kar-Zarar" },
  { key: "cash-flow", label: "Nakit Akış" },
  { key: "customer-sales-payments", label: "Müşteri Bazlı" },
  { key: "receivables-payables", label: "Tahsilat/Borç" },
  { key: "expense-analysis", label: "Gider Analizi" },
];

const CURRENCIES = ["TRY", "USD", "EUR"];

export default function ReportsPage() {
  // Varsayılan tarih aralığı: bu ay
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });
  const [selectedReport, setSelectedReport] = useState<ReportType>("income-expense");
  const [currency, setCurrency] = useState("TRY");
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  // TODO: Kullanıcı kimliği gerçek auth ile alınmalı
  const userId = "demo-user";
  const reportService = new ReportService(userId);

  // Raporu getir
  useEffect(() => {
    setLoading(true);
    setError(null);
    const filters: ReportFilters = {
      dateRange,
      currency: currency as any,
      customerId: selectedReport === "customer-sales-payments" ? customerId : undefined,
    };
    reportService
      .generateReport(selectedReport, filters)
      .then((data: any) => setReportData(data))
      .catch((err: any) => setError(err.message || "Bilinmeyen hata"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [selectedReport, dateRange, currency, customerId]);

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
    // TODO: Gerçek müşteri listesini çek
    const customers = [
      { id: "1", name: "Müşteri 1" },
      { id: "2", name: "Müşteri 2" },
    ];
    return (
      <select
        value={customerId || ""}
        onChange={(e) => setCustomerId(e.target.value || undefined)}
        className="border rounded px-2 py-1 bg-background"
      >
        <option value="">Tüm Müşteriler</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    );
  }

  // PDF/Excel çıktı butonları (şimdilik pasif)
  function ExportButtons() {
    return (
      <div className="flex gap-2">
        <Button variant="outline">PDF</Button>
        <Button variant="outline">Excel</Button>
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
            {/* Özet kutuları */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedReport === "income-expense" && (
                <>
                  <Card className="bg-green-100 dark:bg-green-900/60 rounded-xl p-4 shadow text-center">
                    <div className="text-lg font-semibold">Toplam Gelir</div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(reportData.income.total, currency as any)}
                    </div>
                  </Card>
                  <Card className="bg-red-100 dark:bg-red-900/60 rounded-xl p-4 shadow text-center">
                    <div className="text-lg font-semibold">Toplam Gider</div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {formatCurrency(reportData.expenses.total, currency as any)}
                    </div>
                  </Card>
                  <Card className="bg-blue-100 dark:bg-blue-900/60 rounded-xl p-4 shadow text-center">
                    <div className="text-lg font-semibold">Net Gelir</div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {formatCurrency(reportData.netIncome, currency as any)}
                    </div>
                  </Card>
                </>
              )}
              {selectedReport === "profit-loss" && (
                <>
                  <Card className="bg-green-100 dark:bg-green-900/60 rounded-xl p-4 shadow text-center">
                    <div className="text-lg font-semibold">Toplam Satış</div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(reportData.revenue.total, currency as any)}
                    </div>
                  </Card>
                  <Card className="bg-red-100 dark:bg-red-900/60 rounded-xl p-4 shadow text-center">
                    <div className="text-lg font-semibold">Toplam Alış</div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {formatCurrency(reportData.costs.total, currency as any)}
                    </div>
                  </Card>
                  <Card className="bg-blue-100 dark:bg-blue-900/60 rounded-xl p-4 shadow text-center">
                    <div className="text-lg font-semibold">Net Kar</div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {formatCurrency(reportData.netProfit, currency as any)}
                    </div>
                  </Card>
                </>
              )}
              {/* Diğer raporlar için de benzer özet kutuları eklenebilir */}
            </div>
            {/* Grafik ve tablo alanı (şimdilik placeholder) */}
            <Card className="bg-muted/40 rounded-xl p-6 shadow text-center min-h-[200px]">
              <span className="text-muted-foreground">Grafik ve detaylı tablo burada olacak (geliştirilebilir)</span>
            </Card>
            {/* JSON çıktısı */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground">JSON çıktısını göster</summary>
              <pre className="bg-background p-2 rounded text-xs text-left overflow-x-auto mt-2">
                {JSON.stringify(reportData, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12">Rapor verisi bulunamadı.</div>
        )}
      </main>
    </div>
  );
}
