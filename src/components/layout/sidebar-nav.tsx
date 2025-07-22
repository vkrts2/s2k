'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Users,
  Package,
  FileText,
  LineChart,
  Truck,
  Archive,
  ListTodo,
  Settings,
  Link2,
  ClipboardList,
} from "lucide-react";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col space-y-2">
      <Link
        href="/dashboard"
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          pathname === "/dashboard" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        )}
      >
        <BarChart3 className="h-4 w-4" />
        Gösterge Paneli
      </Link>
      <Link
        href="/customers"
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          pathname === "/customers" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        )}
      >
        <Users className="h-4 w-4" />
        Müşteriler
      </Link>
      <Link
        href="/stock"
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          pathname === "/stock" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        )}
      >
        <Package className="h-4 w-4" />
        Stok Kalemleri
      </Link>
      <Link
        href="/quotations"
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          pathname === "/quotations" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        )}
      >
        <FileText className="h-4 w-4" />
        Teklifler
      </Link>
      <Link
        href="/costs"
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          pathname === "/costs" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        )}
      >
        <ClipboardList className="h-4 w-4" />
        Maliyet Yönetimi
      </Link>
      <Link
        href="/reports"
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          pathname === "/reports" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        )}
      >
        <LineChart className="h-4 w-4" />
        Raporlar
      </Link>
      <Link
        href="/suppliers"
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          pathname === "/suppliers" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        )}
      >
        <Truck className="h-4 w-4" />
        Tedarikçiler
      </Link>
      <Link
        href="/archive"
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          pathname === "/archive" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        )}
      >
        <Archive className="h-4 w-4" />
        Arşiv
      </Link>
      <Link
        href="/settings"
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          pathname === "/settings" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        )}
      >
        <Settings className="h-4 w-4" />
        Ayarlar
      </Link>
      <Link
        href="/useful-links"
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          pathname === "/useful-links" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
        )}
      >
        <Link2 className="h-4 w-4" />
        Faydalı Linkler
      </Link>
    </nav>
  );
} 