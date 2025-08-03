import Link from "next/link";
import { cn } from "@/lib/utils";

export function MainNav() {
  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      <Link href="/" className="text-lg font-bold transition-colors hover:text-primary">
        ERMAY
      </Link>
    </nav>
  );
} 