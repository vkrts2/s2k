"use client";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
// pdfjs-dist sadece metin çıkarımı için kullanılacak

export default function ConverterPage() {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Excel'den PDF'e dönüştür
  const handleExcelToPdf = async () => {
    if (!excelFile) {
      setError("Lütfen bir Excel dosyası seçin.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
        // PDF oluştur
        const doc = new jsPDF();
        // @ts-ignore
        doc.autoTable({ head: [json[0]], body: json.slice(1) });
        const pdfBlob = doc.output("blob");
        const url = URL.createObjectURL(pdfBlob);
        setResultUrl(url);
        setResultName("donusturulmus.pdf");
        setLoading(false);
      };
      reader.readAsArrayBuffer(excelFile);
    } catch (err) {
      setError("Dönüştürme sırasında hata oluştu.");
      setLoading(false);
    }
  };

  // PDF'den Excel'e dönüştür (sadece metin çıkarımı, tablo desteği yok)
  const handlePdfToExcel = async () => {
    if (!pdfFile) {
      setError("Lütfen bir PDF dosyası seçin.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // pdfjs-dist ile PDF'ten metin çıkar
      const pdfjsLib = await import("pdfjs-dist/build/pdf");
      // @ts-ignore
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const reader = new FileReader();
      reader.onload = async (e) => {
        const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        let allText: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(" ");
          allText.push(pageText);
        }
        // Her satırı bir hücreye koy
        const ws = XLSX.utils.aoa_to_sheet(allText.map(line => [line]));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbout], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
        setResultName("donusturulmus.xlsx");
        setLoading(false);
      };
      reader.readAsArrayBuffer(pdfFile);
    } catch (err) {
      setError("Dönüştürme sırasında hata oluştu.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">Dönüştürücü</h1>
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2 text-gray-700">Excel'den PDF'e</h2>
        <div className="flex items-center gap-4 mb-2">
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={e => setExcelFile(e.target.files?.[0] || null)}
            className=""
          />
          <button
            onClick={handleExcelToPdf}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
            disabled={loading}
          >
            {loading ? "Dönüştürülüyor..." : "PDF'e Dönüştür"}
          </button>
        </div>
      </div>
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2 text-gray-700">PDF'den Excel'e</h2>
        <div className="flex items-center gap-4 mb-2">
          <input
            type="file"
            accept=".pdf"
            onChange={e => setPdfFile(e.target.files?.[0] || null)}
            className=""
          />
          <button
            onClick={handlePdfToExcel}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
            disabled={loading}
          >
            {loading ? "Dönüştürülüyor..." : "Excel'e Dönüştür"}
          </button>
        </div>
      </div>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {resultUrl && resultName && (
        <div className="mt-4 text-green-700 font-semibold flex flex-col items-center gap-2">
          Dönüştürme başarılı!
          <a
            href={resultUrl}
            download={resultName}
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            {resultName.includes("pdf") ? "PDF Dosyasını İndir" : "Excel Dosyasını İndir"}
          </a>
        </div>
      )}
    </div>
  );
} 