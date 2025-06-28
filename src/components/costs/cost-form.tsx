"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import type { Cost } from "@/lib/types";
import { Save } from "lucide-react";

const costFormSchema = z.object({
  description: z.string().min(3, "Açıklama en az 3 karakter olmalıdır."),
});

type CostFormValues = z.infer<typeof costFormSchema>;

interface CostFormProps {
  onSubmit: (data: Omit<Cost, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => void;
  initialData?: Cost;
  isSubmitting: boolean;
}

export function CostForm({ onSubmit, initialData, isSubmitting }: CostFormProps) {
  const form = useForm<CostFormValues>({
    resolver: zodResolver(costFormSchema),
    defaultValues: initialData || {
      description: "",
    },
  });

  const handleSubmit = (data: CostFormValues) => {
    onSubmit(data);
    if (!initialData) {
      form.reset();
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maliyet Açıklaması</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Örn: Ofis kirası, elektrik faturası vb."
                  {...field}
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Kaydediliyor..." : (initialData ? "Güncelle" : "Kaydet")}
          </Button>
        </div>
      </form>
    </Form>
  );
} 