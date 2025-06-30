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
import type { Supplier } from "@/lib/types";
import { Save } from "lucide-react";

const supplierFormSchema = z.object({
  name: z.string().min(2, "Tedarikçi adı en az 2 karakter olmalıdır."),
  email: z.string().email("Geçersiz e-posta adresi.").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormProps {
  onSubmit: (data: Supplier) => Promise<void>;
  initialData?: Supplier;
  className?: string;
}

export function SupplierForm({
  onSubmit,
  initialData,
  className,
}: SupplierFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: Partial<SupplierFormValues> = initialData
    ? {
        name: initialData.name,
        email: initialData.email || "",
        phone: initialData.phone || "",
        address: initialData.address || "",
        taxId: initialData.taxId || "",
      }
    : {
        name: "",
        email: "",
        phone: "",
        address: "",
        taxId: "",
      };

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const handleSubmit = async (data: SupplierFormValues) => {
    setIsSubmitting(true);
    const supplierDataToSubmit: Supplier = initialData
      ? { ...initialData, ...data }
      : data as Supplier;
    
    try {
      await onSubmit(supplierDataToSubmit);
      if (!initialData) {
        form.reset(defaultValues); 
      }
    } catch (error) {
      console.error("Supplier submission error:", error);
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
              <FormLabel>Tedarikçi Adı / Firma Adı</FormLabel>
              <FormControl>
                <Input placeholder="örneğin, Tedarikçi A.Ş." {...field} />
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
              <FormLabel>E-posta (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="örneğin, info@tedarikcia.com" {...field} />
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
              <FormLabel>Telefon (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Input placeholder="örneğin, 212 123 4567" {...field} />
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
                <Textarea placeholder="örneğin, Sanayi Mah. Üretim Cad. No:10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="taxId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vergi Numarası (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Input placeholder="Vergi Numarası" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? (initialData ? "Kaydediliyor..." : "Ekleniyor...") : (initialData ? "Değişiklikleri Kaydet" : "Tedarikçi Ekle")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
