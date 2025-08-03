// src/components/stock/stock-form.tsx
"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    },
  });

  const handleSubmit = async (data: StockItemFormValues) => {
    setIsSubmitting(true);

    const stockDataToSubmitBase: Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'> = {
      name: data.name,
      description: "",
      currentStock: 0,
      unit: "",
      salePrice: {
        amount: 0,
        currency: "TRY",
      },
    };

    const stockDataToSubmit = initialData
      ? { ...initialData, ...stockDataToSubmitBase }
      : stockDataToSubmitBase;

    try {
      await onSubmit(stockDataToSubmit as Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'> | StockItem);
      if (!initialData) {
        form.reset({
          name: "",
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

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Kaydediliyor..." : (initialData ? "Güncelle" : "Kaydet")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
