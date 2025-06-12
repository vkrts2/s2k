// src/components/todos/todo-form.tsx
"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TodoFormProps {
  onAddTodo: (text: string) => void;
}

export function TodoForm({ onAddTodo }: TodoFormProps) {
  const [text, setText] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!text.trim()) {
      toast({
        title: "Hata",
        description: "Yapılacak iş metni boş olamaz.",
        variant: "destructive",
      });
      return;
    }
    onAddTodo(text);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
      <Input
        type="text"
        placeholder="Yeni yapılacak iş ekle..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-grow"
      />
      <Button type="submit" size="icon" aria-label="Yeni yapılacak iş ekle">
        <PlusCircle className="h-5 w-5" />
      </Button>
    </form>
  );
}
