// src/lib/turkey.ts
"use client";

// Basit tipler
export type Province = {
  name: string;
  slug?: string;
  districts: string[];
};

// Yedek (offline) küçük veri seti – internet yoksa çalışır
const FALLBACK_PROVINCES: Province[] = [
  { name: "İstanbul", districts: ["Adalar", "Bakırköy", "Beşiktaş", "Beykoz", "Beyoğlu", "Kadıköy", "Kartal", "Şişli", "Üsküdar", "Bahçelievler", "Bağcılar", "Esenler", "Fatih", "Küçükçekmece", "Maltepe", "Pendik", "Sarıyer", "Sultanbeyli", "Tuzla", "Ümraniye", "Zeytinburnu"] },
  { name: "Ankara", districts: ["Altındağ", "Çankaya", "Etimesgut", "Keçiören", "Mamak", "Sincan", "Yenimahalle", "Gölbaşı", "Pursaklar", "Polatlı"] },
  { name: "İzmir", districts: ["Balçova", "Bayraklı", "Bornova", "Buca", "Çiğli", "Gaziemir", "Karabağlar", "Karşıyaka", "Konak", "Menemen", "Torbalı"] },
  { name: "Bursa", districts: ["Nilüfer", "Osmangazi", "Yıldırım", "Gemlik", "İnegöl", "Mustafakemalpaşa"] },
  { name: "Antalya", districts: ["Kepez", "Konyaaltı", "Muratpaşa", "Alanya", "Manavgat", "Serik"] }
];

// Vergi dairesi yedek küçük liste (il bazlı)
const FALLBACK_TAX_OFFICES_BY_CITY: Record<string, string[]> = {
  "İstanbul": [
    "Beyoğlu Vergi Dairesi",
    "Üsküdar Vergi Dairesi",
    "Kadıköy Vergi Dairesi",
    "Bakırköy Vergi Dairesi",
  ],
  "Ankara": [
    "Çankaya Vergi Dairesi",
    "Keçiören Vergi Dairesi",
    "Mamak Vergi Dairesi",
  ],
  "İzmir": [
    "Konak Vergi Dairesi",
    "Karşıyaka Vergi Dairesi",
    "Bornova Vergi Dairesi",
  ],
};

// Uzaktan kaynak URL'leri – istenirse .env ile değiştirilebilir
const CITIES_URL = process.env.NEXT_PUBLIC_TR_CITIES_JSON_URL || "https://turkiyeapi.dev/api/v1/provinces";
// Örn: GitHub üzerinde tüm vergi daireleri JSON. Ulaşılamazsa yedek kullanılacak.
const TAX_OFFICES_URL = process.env.NEXT_PUBLIC_TAX_OFFICES_JSON_URL || "https://raw.githubusercontent.com/aykutsarac/turkey-tax-offices/main/tax_offices.json";

export async function fetchProvinces(): Promise<Province[]> {
  try {
    const res = await fetch(CITIES_URL);
    if (!res.ok) throw new Error("Cities fetch failed");
    const data = await res.json();
    // turkiyeapi.dev formatı: { data: [{ name, districts: [{name}, ...] }, ...] }
    const provinces: Province[] = (Array.isArray(data?.data) ? data.data : data).map((p: any) => ({
      name: p?.name || p?.province || p?.il || "",
      slug: p?.slug,
      districts: (p?.districts || p?.counties || p?.ilceler || []).map((d: any) => d?.name || d?.ilce || d?.district || "").filter(Boolean),
    })).filter((p: Province) => p.name);
    if (provinces.length === 0) return FALLBACK_PROVINCES;
    return provinces;
  } catch {
    return FALLBACK_PROVINCES;
  }
}

export async function fetchDistrictsByProvince(provinceName: string): Promise<string[]> {
  const provinces = await fetchProvinces();
  const p = provinces.find((x) => x.name.toLowerCase() === provinceName.toLowerCase());
  return p?.districts || [];
}

export async function fetchTaxOfficesByCity(cityName: string): Promise<string[]> {
  try {
    const res = await fetch(TAX_OFFICES_URL);
    if (!res.ok) throw new Error("Tax offices fetch failed");
    const data = await res.json();
    // Beklenen basit format örneği: { "İstanbul": ["...", "..."], "Ankara": ["..."] }
    if (Array.isArray(data)) {
      // Alternatif format: [{city:"İstanbul", offices:["..."]}, ...]
      const found = data.find((x: any) => (x.city || x.il || x.name) && (x.city || x.il || x.name).toLowerCase() === cityName.toLowerCase());
      return found?.offices || found?.list || [];
    }
    const byCity: Record<string, string[]> = data;
    const list = byCity[cityName] || byCity[cityName.toUpperCase()] || byCity[cityName.toLowerCase()];
    if (Array.isArray(list)) return list;
    return FALLBACK_TAX_OFFICES_BY_CITY[cityName] || [];
  } catch {
    return FALLBACK_TAX_OFFICES_BY_CITY[cityName] || [];
  }
}

export function normalizeCityName(input: string): string {
  return (input || "").trim();
} 