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

const stockItemFormSchema = z.object({
  name: z.string().min(2, "Ürün adı en az 2 karakter olmalıdır."),
  description: z.string().optional(),
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
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
    },
  });

  const handleSubmit = async (data: StockItemFormValues) => {
    setIsSubmitting(true);

    const stockDataToSubmitBase: Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'> = {
      name: data.name,
      description: data.description,
      currentStock: 0,
      unit: "adet",
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
                <Input placeholder="Örn: Kumaş A, Fermuar Tip B" {...field} />
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
              <FormLabel>Açıklama (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Textarea placeholder="Ürün hakkında detaylı bilgi" {...field} rows={3}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
