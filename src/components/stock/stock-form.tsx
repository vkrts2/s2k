// src/components/stock/stock-form.tsx
"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { StockItem } from "@/lib/types";
import { Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const stockItemFormSchema = z.object({
  name: z.string().min(2, "Ürün adı en az 2 karakter olmalıdır."),
  description: z.string().optional(),
  unit: z.string().optional(),
  currentStock: z.number().min(0, "Stok miktarı 0'dan küçük olamaz."),
  salePrice: z.object({
    amount: z.number().min(0, "Fiyat 0'dan küçük olamaz."),
    currency: z.enum(["TRY", "USD", "EUR"]),
  }).optional(),
});

type StockItemFormValues = z.infer<typeof stockItemFormSchema>;

interface StockFormProps {
  onSubmit: (data: Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'> | StockItem) => void;
  initialData?: StockItem;
  className?: string;
}

export function StockForm({
  onSubmit,
  initialData,
  className,
}: StockFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StockItemFormValues>({
    resolver: zodResolver(stockItemFormSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      unit: "",
      currentStock: 0,
      salePrice: {
        amount: 0,
        currency: "TRY",
      },
    },
  });

  const handleSubmit = async (data: StockItemFormValues) => {
    setIsSubmitting(true);

    const stockDataToSubmitBase: Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'> = {
      name: data.name,
      description: data.description,
      currentStock: data.currentStock,
      unit: data.unit,
      salePrice: data.salePrice,
    };

    const stockDataToSubmit = initialData
      ? { ...initialData, ...stockDataToSubmitBase }
      : stockDataToSubmitBase;

    try {
      await onSubmit(stockDataToSubmit as Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'> | StockItem);
      if (!initialData) {
        form.reset({
          name: "",
          description: "",
          unit: "",
          currentStock: 0,
          salePrice: {
            amount: 0,
            currency: "TRY",
          },
        });
      }
    } catch (error) {
      console.error("Stok kalemi gönderim hatası:", error);
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ürün Adı</FormLabel>
              <FormControl>
                <Input placeholder="Ürün adını girin" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Açıklama</FormLabel>
              <FormControl>
                <Textarea placeholder="Ürün açıklaması" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Birim</FormLabel>
              <FormControl>
                <Input placeholder="Adet, kg, lt vb." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currentStock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mevcut Stok</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="0" 
                  placeholder="0" 
                  {...field} 
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Satış Fiyatı</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="salePrice.amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fiyat</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      placeholder="0.00" 
                      {...field} 
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="salePrice.currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Para Birimi</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Para birimi seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="TRY">₺ - Türk Lirası</SelectItem>
                      <SelectItem value="USD">$ - Amerikan Doları</SelectItem>
                      <SelectItem value="EUR">€ - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? (initialData ? "Kaydediliyor..." : "Ekleniyor...") : (initialData ? "Değişiklikleri Kaydet" : "Stok Kalemi Ekle")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
