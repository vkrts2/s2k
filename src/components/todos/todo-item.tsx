// src/components/todos/todo-item.tsx
"use client";

import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2 } from 'lucide-react';
import type { TodoItem as TodoItemType } from '@/lib/types';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TodoItemProps {
  todo: TodoItemType;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const formatRelativeTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: tr });
    } catch (error) {
      return dateString; // Fallback in case of invalid date
    }
  };

  return (
    <li
      className={cn(
        "flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 transition-colors",
        todo.completed ? "bg-card/60 opacity-70" : "bg-card"
      )}
    >
      <div className="flex items-center space-x-3">
        <Checkbox
          id={`todo-item-${todo.id}`}
          checked={todo.completed}
          onCheckedChange={() => onToggle(todo.id)}
          aria-label={todo.completed ? "Görevi tamamlanmamış olarak işaretle" : "Görevi tamamlanmış olarak işaretle"}
        />
        <label
          htmlFor={`todo-item-${todo.id}`}
          className={cn(
            "flex-grow cursor-pointer",
            todo.completed ? 'line-through text-muted-foreground' : ''
          )}
        >
          {todo.text}
        </label>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-xs text-muted-foreground" title={new Date(todo.createdAt).toLocaleString()}>
          {formatRelativeTime(todo.createdAt)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(todo.id)}
          className="text-destructive hover:text-destructive/80 h-8 w-8"
          aria-label="Görevi sil"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
