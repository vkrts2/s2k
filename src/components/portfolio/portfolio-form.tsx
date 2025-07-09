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
  email: z.string().email("Geçerli bir e-posta girin.").optional(),
  website: z.string().url("Geçerli bir internet adresi girin.").optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  sector: z.string().min(2, "Sektör en az 2 karakter olmalı"),
  notes: z.string().optional(),
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
        email: initialData.email || "",
        website: initialData.website || "",
        address: initialData.address || "",
        city: initialData.city || "",
        district: initialData.district || "",
        sector: initialData.sector,
        notes: initialData.notes || "",
      }
    : {
        companyName: "",
        phone: "",
        email: "",
        website: "",
        address: "",
        city: "",
        district: "",
        sector: portfolioSectors[0],
        notes: "",
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
        className={cn("space-y-4 max-w-md mx-auto w-full", className)}
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
              <FormLabel>Telefon Numarası</FormLabel>
              <FormControl>
                <Input placeholder="Telefon numarası" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-posta Adresi</FormLabel>
              <FormControl>
                <Input placeholder="E-posta adresi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>İnternet Sitesi</FormLabel>
              <FormControl>
                <Input placeholder="https://firma.com" {...field} />
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
              <FormLabel>Adres</FormLabel>
              <FormControl>
                <Textarea placeholder="Firma adresi" {...field} />
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
              <FormControl>
                <Input placeholder="Sektör girin" {...field} />
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
              <FormLabel>İl</FormLabel>
              <FormControl>
                <Input placeholder="İl adı" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="district"
          render={({ field }) => (
            <FormItem>
              <FormLabel>İlçe</FormLabel>
              <FormControl>
                <Input placeholder="İlçe adı" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notlar</FormLabel>
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
