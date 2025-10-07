// src/app/calculator/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import BackToHomeButton from '@/components/common/back-to-home-button';

export default function CalculatorPage() {
  const { toast } = useToast();

  // State for Toplam KG Hesaplama
  const [gramaj, setGramaj] = useState<string>("");
  const [enKg, setEnKg] = useState<string>("160"); // Default "En"
  const [sarim, setSarim] = useState<string>("");
  const [toplamKgSonuc, setToplamKgSonuc] = useState<string>("");
  const [calculatedToplamKg, setCalculatedToplamKg] = useState<string>(""); // For piping to next input

  // State for Top Fiyatı Hesaplama
  // `calculatedToplamKg` is used for this input's value
  const [kgFiyat, setKgFiyat] = useState<string>("");
  const [topFiyatSonuc, setTopFiyatSonuc] = useState<string>("");
  const [calculatedTopFiyat, setCalculatedTopFiyat] = useState<string>(""); // For piping to next input

  // State for Metrekare Hesaplama
  const [topBoy, setTopBoy] = useState<string>(""); // Automatically updated by 'sarim'
  const [metrekareSonuc, setMetrekareSonuc] = useState<string>("");
  const [calculatedMetrekare, setCalculatedMetrekare] = useState<string>(""); // For piping to next input
  
  // State for Birim Metrekare Maliyeti Hesaplama
  // `calculatedMetrekare` is used for 'Toplam Metrekare' input's value
  // `calculatedTopFiyat` is used for 'Top Fiyatı' input's value
  const [birimMaliyetSonuc, setBirimMaliyetSonuc] = useState<string>("");

  useEffect(() => {
    document.title = "Maliyet Hesaplama | ERMAY";
  }, []);

  const showValidationError = () => {
    toast({
      title: "Hata",
      description: "Lütfen tüm alanlara geçerli sayılar girin.",
      variant: "destructive",
    });
  };

  const handleSarimChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSarim(value);
    setTopBoy(value); // Update topBoy whenever sarim changes
  };

  const handleHesaplaToplamKg = () => {
    const numGramaj = parseFloat(gramaj);
    const numEn = parseFloat(enKg);
    const numSarim = parseFloat(sarim);

    if (isNaN(numGramaj) || numGramaj <= 0 || isNaN(numEn) || numEn <= 0 || isNaN(numSarim) || numSarim <= 0) {
      showValidationError();
      return;
    }
    
    const toplamKg = (numGramaj * numEn * numSarim) / 100000;
    setToplamKgSonuc(`Toplam KG: ${toplamKg.toFixed(2)} kg`);
    setCalculatedToplamKg(toplamKg.toFixed(2));
  };

  const handleHesaplaTopFiyat = () => {
    const numToplamKg = parseFloat(calculatedToplamKg); // Use the calculated value
    const numKgFiyat = parseFloat(kgFiyat);
    
    if (isNaN(numToplamKg) || numToplamKg <= 0 || isNaN(numKgFiyat) || numKgFiyat < 0) {
      showValidationError();
      return;
    }
    
    const topFiyat = numToplamKg * numKgFiyat;
    setTopFiyatSonuc(`Top Fiyatı: ${topFiyat.toFixed(2)} $`);
    setCalculatedTopFiyat(topFiyat.toFixed(2));
  };

  const handleHesaplaMetrekare = () => {
    const numTopBoy = parseFloat(topBoy);
    const enMetre = 1.60; // 160cm = 1.60m
    
    if (isNaN(numTopBoy) || numTopBoy <= 0) {
       toast({
        title: "Hata",
        description: "Lütfen geçerli bir Top Boy değeri girin.",
        variant: "destructive",
      });
      return;
    }
    
    const metrekare = numTopBoy * enMetre;
    setMetrekareSonuc(`Metrekare: ${metrekare.toFixed(2)} m²`);
    setCalculatedMetrekare(metrekare.toFixed(2));
  };

  const handleHesaplaBirimMaliyet = () => {
    const numToplamMetrekare = parseFloat(calculatedMetrekare);
    const numTopFiyat = parseFloat(calculatedTopFiyat);
    
    if (isNaN(numToplamMetrekare) || numToplamMetrekare <= 0 || isNaN(numTopFiyat) || numTopFiyat < 0) {
      showValidationError();
      return;
    }
    
    const birimMaliyet = numTopFiyat / numToplamMetrekare;
    setBirimMaliyetSonuc(`Birim Metrekare Maliyeti: ${birimMaliyet.toFixed(2)} $/m²`);
  };


  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <BackToHomeButton />
      <h1 className="text-3xl font-bold tracking-tight text-center mb-8">Maliyet Hesaplama</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Toplam KG Hesaplama</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="gramaj">Gramaj (gr):</Label>
              <Input type="number" id="gramaj" placeholder="Gramaj girin" value={gramaj} onChange={(e) => setGramaj(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="enKg">En (cm):</Label>
              <Input type="number" id="enKg" placeholder="En girin" value={enKg} onChange={(e) => setEnKg(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="sarim">Sarım (metre):</Label>
              <Input type="number" id="sarim" placeholder="Sarım girin" value={sarim} onChange={handleSarimChange} />
            </div>
            <Button onClick={handleHesaplaToplamKg} className="w-full">Hesapla</Button>
            {toplamKgSonuc && <p className="mt-2 font-semibold text-center">{toplamKgSonuc}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Fiyatı Hesaplama</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="calculatedToplamKg">Toplam KG:</Label>
              <Input type="number" id="calculatedToplamKg" placeholder="Toplam KG girin" value={calculatedToplamKg} onChange={(e) => setCalculatedToplamKg(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="kgFiyat">KG Fiyatı ($):</Label>
              <Input type="number" id="kgFiyat" placeholder="KG fiyatı girin" value={kgFiyat} onChange={(e) => setKgFiyat(e.target.value)} />
            </div>
            <Button onClick={handleHesaplaTopFiyat} className="w-full">Hesapla</Button>
            {topFiyatSonuc && <p className="mt-2 font-semibold text-center">{topFiyatSonuc}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metrekare Hesaplama (160cm en için)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="topBoy">Top Boy (metre):</Label>
              <Input type="number" id="topBoy" placeholder="Top boy girin" value={topBoy} onChange={(e) => setTopBoy(e.target.value)} />
            </div>
            <Button onClick={handleHesaplaMetrekare} className="w-full">Hesapla</Button>
            {metrekareSonuc && <p className="mt-2 font-semibold text-center">{metrekareSonuc}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Birim Metrekare Maliyeti Hesaplama</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="calculatedMetrekare">Toplam Metrekare:</Label>
              <Input type="number" id="calculatedMetrekare" placeholder="Toplam metrekare girin" value={calculatedMetrekare} onChange={(e) => setCalculatedMetrekare(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="calculatedTopFiyat">Top Fiyatı ($):</Label>
              <Input type="number" id="calculatedTopFiyat" placeholder="Top fiyatı girin" value={calculatedTopFiyat} onChange={(e) => setCalculatedTopFiyat(e.target.value)} />
            </div>
            <Button onClick={handleHesaplaBirimMaliyet} className="w-full">Hesapla</Button>
            {birimMaliyetSonuc && <p className="mt-2 font-semibold text-center">{birimMaliyetSonuc}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
