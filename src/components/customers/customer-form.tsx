
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
import type { Customer } from "@/lib/types";
import { Save } from "lucide-react";

const customerFormSchema = z.object({
  name: z.string().min(2, "Müşteri adı en az 2 karakter olmalıdır."),
  email: z.string().email("Geçersiz e-posta adresi.").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(), // Notlar alanı eklendi
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  onSubmit: (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> | Customer) => void;
  initialData?: Customer;
  className?: string;
  onCancel?: () => void; // İptal butonu için
}

export function CustomerForm({
  onSubmit,
  initialData,
  className,
  onCancel,
}: CustomerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: Partial<CustomerFormValues> = initialData
    ? {
        name: initialData.name,
        email: initialData.email || "",
        phone: initialData.phone || "",
        address: initialData.address || "",
        taxId: initialData.taxId || "",
        notes: initialData.notes || "", // Notlar için varsayılan değer
      }
    : {
        name: "",
        email: "",
        phone: "",
        address: "",
        taxId: "",
        notes: "", // Notlar için varsayılan değer
      };

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const handleSubmit = async (data: CustomerFormValues) => {
    setIsSubmitting(true);
    const customerDataToSubmit: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> | Customer = initialData
      ? { ...initialData, ...data }
      : data;
    
    try {
      await onSubmit(customerDataToSubmit);
      if (!initialData && !onCancel) { // Sadece yeni müşteri ve iptal yoksa formu sıfırla
        form.reset(defaultValues); 
      }
    } catch (error) {
      // Toast handled by parent page
      console.error("Customer submission error:", error);
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
              <FormLabel>Müşteri Adı Soyadı / Firma Adı</FormLabel>
              <FormControl>
                <Input placeholder="örneğin, Ayşe Yılmaz veya ABC Ltd. Şti." {...field} />
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
                <Input type="email" placeholder="örneğin, ayse@example.com" {...field} />
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
                <Input placeholder="örneğin, 555 123 4567" {...field} />
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
                <Textarea placeholder="örneğin, Örnek Mah. Test Cad. No:1 D:2 İlçe/İl" {...field} />
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
              <FormLabel>Vergi Numarası / TC Kimlik No (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Input placeholder="Vergi veya TC Kimlik Numarası" {...field} />
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
              <FormLabel>Notlar (İsteğe Bağlı)</FormLabel>
              <FormControl>
                <Textarea placeholder="Müşteriyle ilgili ek notlar..." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-2 space-x-2">
          {onCancel && (
             <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                İptal
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? (initialData ? "Kaydediliyor..." : "Ekleniyor...") : (initialData ? "Değişiklikleri Kaydet" : "Müşteri Ekle")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
