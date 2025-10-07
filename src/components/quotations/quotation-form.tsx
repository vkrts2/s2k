// src/components/quotations/quotation-form.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle, Save, Trash2, Percent, MinusCircle, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Quotation, QuotationItem, Currency, Customer, StockItem, PortfolioItem } from "@/lib/types";
import { getStockItems, getStockItemById, getCustomerById } from "@/lib/storage";
import { format, parseISO, isValid, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import type { JSX } from 'react';

// 1. Adım: Form Giriş Değerleri İçin Zod şeması (string olarak tutulur)
const quotationItemInputSchema = z.object({
  id: z.string().optional(),
  stockItemId: z.string().optional(),
  productName: z.string().min(1, "Ürün/Hizmet adı gereklidir."),
  quantity: z.string().optional().refine((val: string | undefined) => {
    if (val === undefined || val === "") return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, {
    message: "Miktar geçerli bir sayı olmalı veya boş olmalıdır.",
  }),
  unitPrice: z.string().optional().refine((val: string | undefined) => {
    if (val === undefined || val === "") return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, {
    message: "Birim fiyat geçerli bir sayı olmalı veya boş olmalıdır.",
  }),
  taxRate: z.string().min(1, "KDV oranı gereklidir."),
  unit: z.string().min(1, "Birim gereklidir."),
});

const quotationFormInputSchema = z.object({
  status: z.enum(["Taslak", "Gönderildi", "Kabul Edildi", "Reddedildi", "Süresi Doldu"]),
  date: z.date(),
  customerName: z.string().min(2, "Müşteri adı en az 2 karakter olmalıdır."),
  items: z.array(quotationItemInputSchema),
  currency: z.enum(["TRY", "USD", "EUR"]),
  subTotal: z.number().min(0),
  taxAmount: z.number().min(0),
  grandTotal: z.number().min(0),
  validUntil: z.date().optional(),
  notes: z.string().optional(),
});

// 2. Adım: Çıktı Değerleri İçin Zod şeması (transformasyonları içerir)
const quotationItemOutputSchema = z.object({
  id: z.string().optional(),
  stockItemId: z.string().optional().transform((val: string | undefined) => val === "manual" || !val ? undefined : val),
  productName: z.string(),
  quantity: z.string().transform((val: string) => parseFloat(val || "0") || 0),
  unitPrice: z.string().transform((val: string) => parseFloat(val || "0") || 0),
  taxRate: z.string().transform((val: string) => parseFloat(val || "0") || 0),
  unit: z.string(),
}).transform((item: any) => ({
  ...item,
  total: parseFloat((item.quantity * item.unitPrice).toFixed(2))
}));

const quotationFormOutputSchema = quotationFormInputSchema.extend({
  items: z.array(quotationItemOutputSchema),
});

// 3. Adım: Formun React Hook Form İçin Tip Tanımları
type QuotationFormInputValues = z.input<typeof quotationFormInputSchema>;
export type QuotationFormOutputValues = z.output<typeof quotationFormOutputSchema>;

interface QuotationFormProps {
  onSubmit: (data: QuotationFormOutputValues) => void;
  initialData?: Quotation;
  customers: Customer[];
  className?: string;
}

const fixedQuotationText = `SEVKİYAT YERİ : İSTANBUL
PAKETLEME : Rulo ve P.e. Torba
QUANTITY : 10% +/- Acceptable
ÖDEME : NAKİT
COUNTRY OF ORIGIN : TURKEY

BANKA ADI : TÜRKİYE İŞ BANKASI A.Ş.
ŞUBE ADI : TEKSTİLKENT ŞB. (0064)
IBAN NO : TR12 0006 4000 0011 4420 1300 34
SWIFT CODE : ISBKTRIS
BANKA ADRESİ : Oruçreis, Tekstilkent Cd Tekstilkent Plaza D:NO:12/B, 34235 Esenler/İstanbul
             0212 438 25 61

NOT : Bu proforma fatura sadece usulüne uygun olarak imzalanmış, kaşelenmiş olarak geçerlidir.`;

export function QuotationForm({
  onSubmit,
  initialData,
  customers,
  className,
}: QuotationFormProps) {
  const { toast } = useToast();
  const [availableStockItems, setAvailableStockItems] = useState<StockItem[]>([]);
  const { user, loading: authLoading } = useAuth();
  const [lockedItems, setLockedItems] = useState<boolean[]>([]);

  useEffect(() => {
    const fetchStockItems = async () => {
      if (!user || authLoading) {
        return;
      }
      try {
        const fetchedItems = await getStockItems(user.uid); 
        setAvailableStockItems(fetchedItems);
      } catch (error: any) {
        console.error("Stok kalemleri yüklenirken hata oluştu:", error);
        const message = typeof error?.message === 'string' ? error.message : '';
        if (message.includes('auth/invalid-credential')) {
          toast({
            title: "Oturum geçersiz",
            description: "Lütfen tekrar giriş yapın.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Hata",
            description: "Stok kalemleri yüklenirken bir sorun oluştu.",
            variant: "destructive",
          });
        }
      }
    };

    fetchStockItems();
  }, [user, authLoading, toast]); 

  const defaultValues = initialData
    ? {
        status: initialData.status,
        date: typeof initialData.date === 'string' ? parseISO(initialData.date) : initialData.date,
        customerName: initialData.customerName || "",
        items: initialData.items.map((item: any) => ({
          id: item.id,
          stockItemId: item.stockItemId,
          productName: item.productName,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          taxRate: item.taxRate ? item.taxRate.toString() : "20",
          unit: typeof item.unit === 'string' && item.unit.length > 0 ? item.unit : 'adet',
        })),
        currency: initialData.currency,
        subTotal: initialData.subTotal,
        taxAmount: initialData.taxAmount,
        grandTotal: initialData.grandTotal,
        validUntil: initialData.validUntil ? parseISO(initialData.validUntil as string) : undefined,
        notes: initialData.notes || "",
      }
    : {
        status: "Taslak" as const,
        date: new Date(),
        customerName: "",
        items: [] as {
          id?: string;
          stockItemId?: string;
          productName: string;
          quantity?: string;
          unitPrice?: string;
          taxRate: string;
          unit: string;
        }[],
        currency: "TRY" as const,
        subTotal: 0,
        taxAmount: 0,
        grandTotal: 0,
        validUntil: undefined as Date | undefined,
        notes: "",
      };

  const form = useForm<QuotationFormInputValues>({
    resolver: zodResolver(quotationFormInputSchema),
    defaultValues,
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchCurrency = form.watch("currency");
  const watchedItems = form.watch("items");

  const calculateTotals = useCallback(() => {
    const currentItems = form.getValues("items");
    let subTotal = 0;
    let kdvMap: Record<string, number> = {};
    currentItems.forEach((item) => {
      const quantity = parseFloat(String(item.quantity) || "0") || 0;
      const unitPrice = parseFloat(String(item.unitPrice) || "0") || 0;
      const itemTotal = quantity * unitPrice;
      subTotal += itemTotal;
      const taxRate = parseFloat(String(item.taxRate) || "0") || 0;
      if (!kdvMap[taxRate]) kdvMap[taxRate] = 0;
      kdvMap[taxRate] += itemTotal * (taxRate / 100);
    });
    const taxAmount = Object.values(kdvMap).reduce((sum, v) => sum + v, 0);
    const grandTotal = subTotal + taxAmount;
    if (Number(form.getValues("subTotal")) !== subTotal) {
      form.setValue("subTotal", parseFloat(subTotal.toFixed(2)), { shouldDirty: true });
    }
    if (Number(form.getValues("taxAmount")) !== taxAmount) {
      form.setValue("taxAmount", parseFloat(taxAmount.toFixed(2)), { shouldDirty: true });
    }
    if (Number(form.getValues("grandTotal")) !== grandTotal) {
      form.setValue("grandTotal", parseFloat(grandTotal.toFixed(2)), { shouldDirty: true });
    }
  }, [form]);

  const handleStockItemSelect = useCallback(async (index: number, stockItemId: string) => {
    if (!user) return;

    if (stockItemId && stockItemId !== "manual") {
      const stockItem = await getStockItemById(user.uid, stockItemId);
      if (stockItem) {
        form.setValue(`items.${index}.stockItemId`, stockItemId, { shouldDirty: true });
        form.setValue(`items.${index}.productName`, stockItem.name, { shouldDirty: true });
        form.setValue(`items.${index}.unitPrice`, "", { shouldDirty: true });
        calculateTotals();
      }
    } else if (stockItemId === "manual") {
      form.setValue(`items.${index}.stockItemId`, "manual", { shouldDirty: true });
      form.setValue(`items.${index}.productName`, "", { shouldDirty: true });
      form.setValue(`items.${index}.unitPrice`, "", { shouldDirty: true });
      calculateTotals();
    }
  }, [form, calculateTotals, user]);

  const handleCustomerSelect = useCallback(async (customerId: string) => {
    if (!user) return;

    if (customerId && customerId !== "manual") {
      const customer = await getCustomerById(user.uid, customerId);
      if (customer) {
        form.setValue("customerName", customer.name, { shouldDirty: true });
      }
    } else if (customerId === "manual") {
      form.setValue("customerName", "", { shouldDirty: true });
    }
  }, [form, user]);

  useEffect(() => {
    calculateTotals();
  }, [watchedItems]);

  const processSubmit = (data: QuotationFormInputValues) => {
    const itemsWithUnit = data.items.map((item) => ({
      ...item,
      unit: typeof item.unit === 'string' && item.unit.length > 0 ? item.unit : 'adet',
      taxRate: item.taxRate !== undefined && item.taxRate !== '' ? item.taxRate : '0',
      description: item.productName,
    }));
    const selectedCustomer = customers.find((c) => c.name === data.customerName);
    const outputData = {
      ...quotationFormOutputSchema.parse({ ...data, items: itemsWithUnit }),
      customer: selectedCustomer || null,
    };
    onSubmit(outputData);
  };

  const currencySymbol = useMemo(() => {
    switch (form.watch("currency")) {
      case "USD":
        return "$";
      case "TRY":
      default:
        return "₺";
    }
  }, [form.watch("currency")]);

  const customerSelectField = (
    <FormField
      control={form.control}
      name="customerName"
      render={({ field }: { field: any }) => (
        <FormItem>
          <FormLabel>Müşteri Adı</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Input
                  placeholder="Müşteri ara veya yaz"
                  value={field.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value)}
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                  autoComplete="off"
                />
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[300px]">
              <Command>
                <CommandInput placeholder="Müşteri ara..." />
                <CommandList>
                  <CommandEmpty>Müşteri bulunamadı</CommandEmpty>
                  {customers.map((customer) => {
                    console.log("QuotationForm'da gösterilen müşteri:", customer);
                    return (
                      <CommandItem
                        key={customer.name}
                        value={customer.name}
                        onSelect={() => form.setValue("customerName", customer.name, { shouldDirty: true })}
                      >
                        {customer.name}
                      </CommandItem>
                    );
                  })}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const stockItemSelectField = (index: number) => (
    <FormField
      control={form.control}
      name={`items.${index}.stockItemId`}
      render={({ field }: { field: any }) => (
        <FormItem>
          <FormLabel>Stoktan Seç (Opsiyonel)</FormLabel>
          <Select
            onValueChange={(value: string) => {
              field.onChange(value);
              if (value !== "manual") {
                const selectedStockItem = availableStockItems.find((s: StockItem) => s.id === value);
                if (selectedStockItem) {
                  form.setValue(`items.${index}.productName`, selectedStockItem.name, { shouldDirty: true });
                  if (selectedStockItem.salePrice) {
                    form.setValue(`items.${index}.unitPrice`, selectedStockItem.salePrice.amount.toString(), { shouldDirty: true });
                  } else {
                    form.setValue(`items.${index}.unitPrice`, "", { shouldDirty: true });
                  }
                  form.setValue(`items.${index}.quantity`, "1", { shouldDirty: true });
                  calculateTotals();
                }
              } else {
                form.setValue(`items.${index}.productName`, "", { shouldDirty: true });
                form.setValue(`items.${index}.unitPrice`, "", { shouldDirty: true });
                form.setValue(`items.${index}.quantity`, "", { shouldDirty: true });
                calculateTotals();
              }
            }}
            value={field.value || "manual"}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Stok Kalemi Seçin" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="manual">-- Manuel Giriş --</SelectItem>
              {availableStockItems.map((item: StockItem) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} (Stok: {item.currentStock} {item.unit || 'Adet'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(processSubmit)}
        className={cn("space-y-4 sm:max-w-[800px] mx-auto w-full", className)}
      >
        {customerSelectField}
        <FormField
          control={form.control}
          name="date"
          render={({ field }: { field: any }) => (
            <FormItem>
              <FormLabel>Teklif Tarihi</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? format(field.value, "dd.MM.yyyy") : <span>Tarih seçin</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(value) => field.onChange(value)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Teklif Kalemleri */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel>Teklif Kalemleri</FormLabel>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ productName: "", quantity: "", unitPrice: "", taxRate: "20", unit: "adet" })}>
              <PlusCircle className="mr-1 h-4 w-4" /> Kalem Ekle
            </Button>
          </div>
          {fields.length === 0 && <div className="text-muted-foreground text-sm">Henüz kalem eklenmedi.</div>}
          {fields.map((field, index: number) => {
            const locked = lockedItems[index] || false;
            return (
              <div key={field.id} className="flex flex-col gap-2 border rounded-md p-2 mb-2">
                <FormField
                  control={form.control}
                  name={`items.${index}.productName`}
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Ürün/Hizmet</FormLabel>
                      <FormControl>
                        <Input placeholder="Ürün veya hizmet adı" {...field} disabled={locked} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }: { field: any }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Miktar</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            value={field.value}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              field.onChange(e.target.value);
                              calculateTotals();
                            }}
                            disabled={locked}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.unit`}
                    render={({ field }: { field: any }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Birim</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue(`items.${index}.unit`, value, { shouldDirty: true });
                          }}
                          value={field.value || "adet"}
                          defaultValue={field.value || "adet"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Birim seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="adet">Adet</SelectItem>
                            <SelectItem value="mt">mt</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="top">top</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }: { field: any }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Birim Fiyat</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={field.value}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              field.onChange(e.target.value);
                              calculateTotals();
                            }}
                            disabled={locked}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.taxRate`}
                    render={({ field }: { field: any }) => (
                      <FormItem className="flex-1">
                        <FormLabel>KDV Oranı (%)</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setTimeout(() => calculateTotals(), 0);
                          }}
                          value={field.value || "20"}
                          defaultValue={field.value || "20"}
                          disabled={locked}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="KDV oranı seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">%1</SelectItem>
                            <SelectItem value="10">%10</SelectItem>
                            <SelectItem value="20">%20</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={locked}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {!locked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const valid = await form.trigger(`items.${index}`);
                        if (valid) {
                          setLockedItems((prev) => {
                            const updated = [...prev];
                            updated[index] = true;
                            return updated;
                          });
                          calculateTotals();
                        }
                      }}
                      className="ml-2"
                    >
                      Kaydet
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* Para Birimi, Teklif Durumu */}
        <div className="flex flex-col gap-2">
          <FormField
            control={form.control}
            name="currency"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Para Birimi</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "TRY"} defaultValue={field.value || "TRY"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Para birimi seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="TRY">₺ - Türk Lirası</SelectItem>
                    <SelectItem value="USD">$ - Dolar</SelectItem>
                    <SelectItem value="EUR">€ - Euro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Teklif Durumu</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "Taslak"} defaultValue={field.value || "Taslak"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Durum seçin" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Taslak">Taslak</SelectItem>
                    <SelectItem value="Gönderildi">Gönderildi</SelectItem>
                    <SelectItem value="Kabul Edildi">Kabul Edildi</SelectItem>
                    <SelectItem value="Reddedildi">Reddedildi</SelectItem>
                    <SelectItem value="Süresi Doldu">Süresi Doldu</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* Toplamlar */}
        <div className="space-y-1 text-right">
          <div className="text-sm">Ara Toplam: {currencySymbol} {(form.watch("subTotal") ?? 0).toFixed(2)}</div>
          <div className="text-sm">KDV Tutarı: {currencySymbol} {(form.watch("taxAmount") ?? 0).toFixed(2)}</div>
          <div className="font-bold">Genel Toplam: {currencySymbol} {(form.watch("grandTotal") ?? 0).toFixed(2)}</div>
        </div>
        {/* Notlar */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }: { field: any }) => (
            <FormItem>
              <FormLabel>Ek Notlar</FormLabel>
              <FormControl>
                <Textarea placeholder="Teklif ile ilgili ek notlar..." {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {form.formState.isSubmitting ? (initialData ? "Kaydediliyor..." : "Ekleniyor...") : (initialData ? "Değişiklikleri Kaydet" : "Teklif Oluştur")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
