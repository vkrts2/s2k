// src/components/todos/todo-list.tsx
"use client";

import React from 'react';
import type { TodoItem as TodoItemType } from '@/lib/types';
import { TodoItem } from './todo-item'; 
import { ScrollArea } from '@/components/ui/scroll-area';

interface TodoListProps {
  title: string;
  todos: TodoItemType[];
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  emptyMessage?: string;
  className?: string;
  titleClassName?: string;
}

export function TodoList({
  title,
  todos,
  onToggleTodo,
  onDeleteTodo,
  emptyMessage = "Bu listede görev yok.",
  className = "",
  titleClassName = "text-lg font-semibold mb-2 text-primary",
}: TodoListProps) {
  if (todos.length === 0 && !emptyMessage) { // If no empty message specifically, render nothing for empty list
    return null;
  }

  return (
    <div className={className}>
      <h3 className={titleClassName}>{title}</h3>
      {todos.length === 0 ? (
        <p className="text-center text-muted-foreground py-3">{emptyMessage}</p>
      ) : (
        <ScrollArea className="h-[250px] pr-4"> {/* Adjust height as needed */}
          <ul className="space-y-2">
            {todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={onToggleTodo}
                onDelete={onDeleteTodo}
              />
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
