"use client";

import React, { useState, useEffect } from "react";
import { Users } from "lucide-react";
import type { Customer } from "@/lib/types";
import { getCustomers } from "@/lib/storage";
import { SummaryCard } from "./summary-card";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function DashboardOverview() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      // TODO: Burada gerçek kullanıcı id'sini kullanmalısın
      const loadedCustomers = await getCustomers('demo-uid');
      setCustomers(loadedCustomers);
      setIsLoading(false);
    };
    fetchCustomers();
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Kontrol paneli verileri yükleniyor...</p></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Kontrol Paneli</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Toplam Müşteri"
          value={customers.length}
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        {/* Add more summary cards here as new metrics become available */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hoş Geldiniz!</CardTitle>
          <CardDescription>FinansAkışı AI ile müşteri ve finans yönetiminizi kolaylaştırın.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Başlamak için müşteri ekleyebilir veya mevcut müşterilerinizi yönetebilirsiniz.</p>
          <Button asChild className="mt-4">
            <Link href="/customers">Müşterileri Yönet</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
