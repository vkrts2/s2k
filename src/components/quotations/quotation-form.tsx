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
import type { Quotation, QuotationItem, Currency, QuotationStatus, Customer, StockItem, PortfolioItem } from "@/lib/types";
import { getStockItems, getStockItemById, getCustomerById } from "@/lib/storage";
import { format, parseISO, isValid, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// 1. Adım: Form Giriş Değerleri İçin Zod Şeması (string olarak tutulur)
const quotationItemInputSchema = z.object({
  id: z.string().optional(),
  stockItemId: z.string().optional(),
  productName: z.string().min(1, "Ürün/Hizmet adı gereklidir."),
  quantity: z.string().optional().refine(val => {
    if (val === undefined || val === "") return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, {
    message: "Miktar geçerli bir sayı olmalı veya boş olmalıdır.",
  }),
  unitPrice: z.string().optional().refine(val => {
    if (val === undefined || val === "") return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, {
    message: "Birim fiyat geçerli bir sayı olmalı veya boş olmalıdır.",
  }),
});

const quotationFormInputSchema = z.object({
  status: z.enum(["Taslak", "Gönderildi", "Kabul Edildi", "Reddedildi", "Süresi Doldu"]),
  date: z.date(),
  customerName: z.string().min(2, "Müşteri adı en az 2 karakter olmalıdır."),
  items: z.array(z.object({
    id: z.string().optional(),
    stockItemId: z.string().optional(),
    productName: z.string().min(1, "Ürün adı gereklidir."),
    quantity: z.string().optional(),
    unitPrice: z.string().optional(),
  })),
  currency: z.enum(["TRY", "USD", "EUR"]),
  taxRate: z.number().min(0).max(100),
  subTotal: z.number().min(0),
  taxAmount: z.number().min(0),
  grandTotal: z.number().min(0),
  validUntilDate: z.date().optional(),
});

// 2. Adım: Çıktı Değerleri İçin Zod Şeması (transformasyonları içerir)
const quotationItemOutputSchema = z.object({
  id: z.string().optional(),
  stockItemId: z.string().optional().transform(val => val === "manual" || !val ? undefined : val),
  productName: z.string(),
  quantity: z.string().transform(val => parseFloat(val || "0") || 0),
  unitPrice: z.string().transform(val => parseFloat(val || "0") || 0),
}).transform(item => ({
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

  useEffect(() => {
    const fetchStockItems = async () => {
      if (!user || authLoading) {
        return;
      }
      try {
        const fetchedItems = await getStockItems(user.uid); 
        setAvailableStockItems(fetchedItems);
      } catch (error) {
        console.error("Stok kalemleri yüklenirken hata oluştu:", error);
        toast({
          title: "Hata",
          description: "Stok kalemleri yüklenirken bir sorun oluştu.",
          variant: "destructive",
        });
      }
    };

    fetchStockItems();
  }, [user, authLoading, toast]); 

  const defaultValues = initialData
    ? {
        status: initialData.status,
        date: parseISO(initialData.date),
        customerName: initialData.customerName || "",
        items: initialData.items.map(item => ({
          id: item.id,
          stockItemId: item.stockItemId,
          productName: item.productName,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
        })),
        currency: initialData.currency,
        taxRate: initialData.taxRate,
        subTotal: initialData.subTotal,
        taxAmount: initialData.taxAmount,
        grandTotal: initialData.grandTotal,
        validUntilDate: initialData.validUntilDate ? parseISO(initialData.validUntilDate) : undefined,
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
        }[],
        currency: "TRY" as const,
        taxRate: 0,
        subTotal: 0,
        taxAmount: 0,
        grandTotal: 0,
        validUntilDate: undefined as Date | undefined,
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

  const [selectedKdvOption, setSelectedKdvOption] = useState<string>(
    initialData?.taxRate !== undefined ? (["0", "10", "20"].includes(initialData.taxRate.toString()) ? initialData.taxRate.toString() : "manual") : "0"
  );
  const [manualKdvRate, setManualKdvRate] = useState<string>(
    (initialData?.taxRate !== undefined && !["0", "10", "20"].includes(initialData.taxRate.toString()))
      ? initialData.taxRate.toString()
      : ""
  );

  const calculateTotals = useCallback(() => {
    const currentItems = form.getValues("items");
    let subTotal = 0;
    currentItems.forEach((item) => {
      const quantity = parseFloat(item.quantity || "0") || 0;
      const unitPrice = parseFloat(item.unitPrice || "0") || 0;
      const itemTotal = quantity * unitPrice;
      subTotal += itemTotal;
    });

    const taxRate = form.watch("taxRate") || 0;
    const taxAmount = parseFloat((subTotal * taxRate / 100).toFixed(2));
    const grandTotal = parseFloat((subTotal + taxAmount).toFixed(2));

    if (form.getValues("subTotal") !== subTotal) {
      form.setValue("subTotal", parseFloat(subTotal.toFixed(2)), { shouldDirty: true });
    }
    if (form.getValues("taxAmount") !== taxAmount) {
      form.setValue("taxAmount", taxAmount, { shouldDirty: true });
    }
    if (form.getValues("grandTotal") !== grandTotal) {
      form.setValue("grandTotal", grandTotal, { shouldDirty: true });
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
  }, [calculateTotals, watchedItems, form.watch("taxRate")]);

  const processSubmit = (data: QuotationFormInputValues) => {
    const outputData = quotationFormOutputSchema.parse(data);
    onSubmit(outputData);
  };

  const handleKdvOptionChange = (value: string) => {
    setSelectedKdvOption(value);
    if (value === "manual") {
      form.setValue("taxRate", parseFloat(manualKdvRate) || 0, { shouldDirty: true });
    } else {
      form.setValue("taxRate", parseFloat(value) || 0, { shouldDirty: true });
    }
  };

  const handleManualKdvRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setManualKdvRate(value);
    form.setValue("taxRate", parseFloat(value) || 0, { shouldDirty: true });
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
      render={({ field }) => (
        <FormItem>
          <FormLabel>Müşteri Adı</FormLabel>
          <FormControl>
            <Input placeholder="Müşteri tam adı" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const stockItemSelectField = (index: number) => (
    <FormField
      control={form.control}
      name={`items.${index}.stockItemId`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Stoktan Seç (Opsiyonel)</FormLabel>
          <Select
            onValueChange={(value) => {
              field.onChange(value);
              if (value !== "manual") {
                const selectedStockItem = availableStockItems.find(s => s.id === value);
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
              {availableStockItems.map((item) => (
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
      <form onSubmit={form.handleSubmit(processSubmit)} className={cn("space-y-6", className)}>
        <Card className="p-6">
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-0">
            {customerSelectField}

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
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
                          {field.value ? (
                            format(field.value, "PPP", { locale: tr })
                          ) : (
                            <span>Tarih seçin</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="validUntilDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Geçerlilik Tarihi (Opsiyonel)</FormLabel>
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
                          {field.value ? (
                            format(field.value, "PPP", { locale: tr })
                          ) : (
                            <span>Tarih seçin</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 mb-4">
            <CardTitle className="text-xl">Teklif Kalemleri</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ id: crypto.randomUUID(), productName: "", quantity: "1", unitPrice: "", stockItemId: "manual" })}
              className="mt-2"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Kalem Ekle
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {fields.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                Henüz kalem eklenmedi.
              </p>
            )}
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 sm:grid-cols-6 gap-4 border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
                <div className="sm:col-span-2">
                  {stockItemSelectField(index)}
                </div>
                <FormField
                  control={form.control}
                  name={`items.${index}.productName`}
                  render={({ field: itemField }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Ürün / Hizmet Adı</FormLabel>
                      <FormControl>
                        <Input placeholder="Ürün veya hizmet adı" {...itemField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Miktar</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...itemField} onChange={(e) => { itemField.onChange(e); calculateTotals(); }} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.unitPrice`}
                  render={({ field: itemField }) => (
                    <FormItem className="relative">
                      <FormLabel>Birim Fiyat</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100.00" {...itemField} onChange={(e) => { itemField.onChange(e); calculateTotals(); }} />
                      </FormControl>
                      <div className="absolute right-2 top-7 text-muted-foreground">
                        {currencySymbol}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Toplam</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      readOnly
                      value={((parseFloat(fields[index].quantity || "0") || 0) * (parseFloat(fields[index].unitPrice || "0") || 0)).toFixed(2)}
                    />
                  </FormControl>
                </FormItem>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      remove(index);
                      calculateTotals();
                    }}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-0">
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Para Birimi</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Para Birimi Seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="TRY">₺ - Türk Lirası</SelectItem>
                      <SelectItem value="USD">$ - Amerikan Doları</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teklif Durumu</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Durum Seçin" />
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

            <FormField
              control={form.control}
              name="taxRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>KDV Oranı (%)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseFloat(e.target.value) || 0);
                          calculateTotals();
                        }}
                        className="pr-8"
                      />
                      <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="col-span-full space-y-2 text-right">
              <p>Ara Toplam: {currencySymbol} {form.watch("subTotal").toFixed(2)}</p>
              <p>KDV Tutarı: {currencySymbol} {form.watch("taxAmount").toFixed(2)}</p>
              <p className="font-bold text-lg">Genel Toplam: {currencySymbol} {form.watch("grandTotal").toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl">Ek Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">
              {fixedQuotationText}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="submit"><Save className="mr-2 h-4 w-4" /> Teklifi Kaydet</Button>
        </div>
      </form>
    </Form>
  );
}
