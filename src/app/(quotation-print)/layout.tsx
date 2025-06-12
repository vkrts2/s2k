// src/app/(quotation-print)/layout.tsx
"use client";

// Bu layout, kenar çubukları veya gezinme olmadan yalnızca teklif içeriğini göstermek içindir.
// Yazdırma için temiz bir görünüm sağlar.
// Ana stilleri burada dahil etmiyoruz, zaten ana layout.tsx'te dahil ediliyorlar.

export default function QuotationPrintLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="p-4 sm:p-6 md:p-8 print:p-2 bg-white print:bg-white text-black print:text-black">
      {children}
    </main>
  );
}
