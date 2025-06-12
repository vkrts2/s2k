// src/components/portfolio/portfolio-form.tsx
"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { PortfolioItem, PortfolioSector } from "@/lib/types";
import { portfolioSectors } from "@/lib/types";
import { Save } from "lucide-react";

const portfolioItemFormSchema = z.object({
  companyName: z.string().min(2, "Firma adı en az 2 karakter olmalıdır."),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  sector: z.enum(portfolioSectors, {
    errorMap: () => ({ message: "Lütfen geçerli bir sektör seçin." }),
  }),
  notes: z.string().optional(), // Notlar alanı eklendi
});

type PortfolioItemFormValues = z.infer<typeof portfolioItemFormSchema>;

interface PortfolioFormProps {
  onSubmit: (data: Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'> | PortfolioItem) => void;
  initialData?: PortfolioItem;
  className?: string;
}

export function PortfolioForm({
  onSubmit,
  initialData,
  className,
}: PortfolioFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: Partial<PortfolioItemFormValues> = initialData
    ? {
        companyName: initialData.companyName,
        phone: initialData.phone || "",
        address: initialData.address || "",
        city: initialData.city || "",
        sector: initialData.sector,
        notes: initialData.notes || "", // Notlar için varsayılan değer
      }
    : {
        companyName: "",
        phone: "",
        address: "",
        city: "",
        sector: portfolioSectors[0], 
        notes: "", // Notlar için varsayılan değer
      };

  const form = useForm<PortfolioItemFormValues>({
    resolver: zodResolver(portfolioItemFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const handleSubmit = async (data: PortfolioItemFormValues) => {
    setIsSubmitting(true);
    const portfolioDataToSubmit = initialData
      ? { ...initialData, ...data }
      : data;
    
    try {
      await onSubmit(portfolioDataToSubmit);
      if (!initialData) {
        form.reset(defaultValues);
      }
    } catch (error) {
      console.error("Portföy kaydı gönderim hatası:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-4", className)}
      >
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Firma İsmi</FormLabel>
              <FormControl>
                <Input placeholder="Firma adı girin" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefon Numarası (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Input placeholder="Telefon numarası" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adres (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Textarea placeholder="Firma adresi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bulunduğu İl (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Input placeholder="İl adı" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sector"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sektör</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sektör seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {portfolioSectors.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notlar (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Textarea placeholder="Bu portföy kaydıyla ilgili ek notlar..." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? (initialData ? "Kaydediliyor..." : "Ekleniyor...") : (initialData ? "Değişiklikleri Kaydet" : "Portföy Kaydı Ekle")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
