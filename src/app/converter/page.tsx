"use client";
import React, { useState } from "react";

export default function ConverterPage() {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Henüz gerçek dönüştürme yok, sadece arayüz
  const handleExcelToPdf = async () => {
    if (!excelFile) {
      setError("Lütfen bir Excel dosyası seçin.");
      return;
    }
    setError(null);
    setLoading(true);
    // Burada backend'e gönderip dönüştürme yapılacak
    setTimeout(() => {
      setResultUrl("#");
      setLoading(false);
    }, 1500);
  };

  const handlePdfToExcel = async () => {
    if (!pdfFile) {
      setError("Lütfen bir PDF dosyası seçin.");
      return;
    }
    setError(null);
    setLoading(true);
    // Burada backend'e gönderip dönüştürme yapılacak
    setTimeout(() => {
      setResultUrl("#");
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-2xl font-bold mb-4 text-center">Dönüştürücü</h1>
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Excel'den PDF'e</h2>
        <input
          type="file"
          accept=".xls,.xlsx"
          onChange={e => setExcelFile(e.target.files?.[0] || null)}
          className="mb-2"
        />
        <button
          onClick={handleExcelToPdf}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          disabled={loading}
        >
          {loading ? "Dönüştürülüyor..." : "PDF'e Dönüştür"}
        </button>
      </div>
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">PDF'den Excel'e</h2>
        <input
          type="file"
          accept=".pdf"
          onChange={e => setPdfFile(e.target.files?.[0] || null)}
          className="mb-2"
        />
        <button
          onClick={handlePdfToExcel}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          disabled={loading}
        >
          {loading ? "Dönüştürülüyor..." : "Excel'e Dönüştür"}
        </button>
      </div>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {resultUrl && (
        <div className="mt-4 text-green-700 font-semibold">Dönüştürme başarılı! (Demo)</div>
      )}
    </div>
  );
} 