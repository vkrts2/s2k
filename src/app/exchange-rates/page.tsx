"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import BackToHomeButton from '@/components/common/back-to-home-button';

interface ExchangeRate {
  currency: string;
  rate: number;
  change: number;
  lastUpdate: string;
}

interface ApiResponse {
  success: boolean;
  rates: Record<string, number>;
  timestamp: number;
}

export default function ExchangeRatesPage() {
  const { toast } = useToast();
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [converter, setConverter] = useState({
    fromCurrency: 'TRY',
    toCurrency: 'USD',
    amount: 1,
    result: 0
  });

  const API_KEY = '2809075e75b36c6b3b096151fd8201e4';
  const API_BASE_URL = 'http://api.exchangerate.host';

  const currencies = [
    { code: 'TRY', name: 'Türk Lirası', symbol: '₺' },
    { code: 'USD', name: 'Amerikan Doları', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'İngiliz Sterlini', symbol: '£' },
    { code: 'JPY', name: 'Japon Yeni', symbol: '¥' },
    { code: 'CHF', name: 'İsviçre Frangı', symbol: 'CHF' }
  ];

  const fetchRates = async () => {
    setLoading(true);
    try {
      // Gerçek API'den veri çek
      const response = await fetch(`${API_BASE_URL}/latest?base=TRY&apikey=${API_KEY}`);
      const data: ApiResponse = await response.json();

      if (data.success) {
        const exchangeRates: ExchangeRate[] = [
          { 
            currency: 'USD', 
            rate: 1 / data.rates.USD, 
            change: Math.random() * 2 - 1, // Mock değişim
            lastUpdate: new Date(data.timestamp * 1000).toISOString() 
          },
          { 
            currency: 'EUR', 
            rate: 1 / data.rates.EUR, 
            change: Math.random() * 2 - 1,
            lastUpdate: new Date(data.timestamp * 1000).toISOString() 
          },
          { 
            currency: 'GBP', 
            rate: 1 / data.rates.GBP, 
            change: Math.random() * 2 - 1,
            lastUpdate: new Date(data.timestamp * 1000).toISOString() 
          },
          { 
            currency: 'JPY', 
            rate: 1 / data.rates.JPY, 
            change: Math.random() * 2 - 1,
            lastUpdate: new Date(data.timestamp * 1000).toISOString() 
          },
          { 
            currency: 'CHF', 
            rate: 1 / data.rates.CHF, 
            change: Math.random() * 2 - 1,
            lastUpdate: new Date(data.timestamp * 1000).toISOString() 
          }
        ];

        setRates(exchangeRates);
        toast({
          title: "Kurlar Güncellendi",
          description: "Güncel döviz kurları yüklendi.",
        });
      } else {
        throw new Error('API yanıtı başarısız');
      }
    } catch (error) {
      console.error('API Error:', error);
      toast({
        title: "Hata",
        description: "Kurlar yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const convertCurrency = async () => {
    if (converter.fromCurrency === converter.toCurrency) {
      setConverter(prev => ({ ...prev, result: prev.amount }));
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/convert?from=${converter.fromCurrency}&to=${converter.toCurrency}&amount=${converter.amount}&apikey=${API_KEY}`
      );
      const data = await response.json();

      if (data.success) {
        setConverter(prev => ({ ...prev, result: data.result }));
      } else {
        throw new Error('Dönüştürme başarısız');
      }
    } catch (error) {
      console.error('Conversion Error:', error);
      toast({
        title: "Hata",
        description: "Para birimi dönüştürülürken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  useEffect(() => {
    if (converter.amount > 0) {
      convertCurrency();
    }
  }, [converter.fromCurrency, converter.toCurrency, converter.amount]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <BackToHomeButton />
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Döviz Kurları</h2>
        <Button onClick={fetchRates} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Kurları Güncelle
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Güncel Kurlar */}
        <Card>
          <CardHeader>
            <CardTitle>Güncel Kurlar (₺)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rates.map((rate) => (
                <div key={rate.currency} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{rate.currency}</span>
                    <span className="text-sm text-muted-foreground">
                      {currencies.find(c => c.code === rate.currency)?.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">{rate.rate.toFixed(4)}</span>
                    <div className={`flex items-center text-xs ${
                      rate.change > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {rate.change > 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(rate.change).toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Son güncelleme: {new Date().toLocaleString('tr-TR')}
            </div>
          </CardContent>
        </Card>

        {/* Döviz Çevirici */}
        <Card>
          <CardHeader>
            <CardTitle>Döviz Çevirici</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Miktar</Label>
                  <Input
                    type="number"
                    value={converter.amount}
                    onChange={(e) => setConverter(prev => ({ 
                      ...prev, 
                      amount: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Para Birimi</Label>
                  <Select 
                    value={converter.fromCurrency} 
                    onValueChange={(value) => setConverter(prev => ({ ...prev, fromCurrency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={() => {
                  setConverter(prev => ({
                    ...prev,
                    fromCurrency: prev.toCurrency,
                    toCurrency: prev.fromCurrency
                  }));
                }}>
                  ⇄ Değiştir
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hedef Para Birimi</Label>
                  <Select 
                    value={converter.toCurrency} 
                    onValueChange={(value) => setConverter(prev => ({ ...prev, toCurrency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sonuç</Label>
                  <div className="p-3 border rounded-lg bg-muted/50">
                    <span className="font-bold text-lg">
                      {formatCurrency(converter.result, converter.toCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kur Geçmişi */}
      <Card>
        <CardHeader>
          <CardTitle>Kur Geçmişi (Son 7 Gün)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Kur geçmişi grafiği burada görüntülenecek</p>
            <p className="text-sm">(Grafik özelliği yakında eklenecek)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 