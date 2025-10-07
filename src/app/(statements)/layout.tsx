// src/app/(statements)/layout.tsx
"use client";

// Bu layout, kenar çubukları veya gezinme olmadan yalnızca ekstre içeriğini göstermek içindir.
// Yazdırma için temiz bir görünüm sağlar.

// Ana stilleri burada dahil etmiyoruz, zaten ana layout.tsx'te dahil ediliyorlar.

export default function StatementLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="p-4 sm:p-6 md:p-8 print:p-2">
      {children}
    </main>
    // Toaster gibi global UI öğeleri istenirse eklenebilir ama yazdırmada gizlenmelidir.
  );
}
