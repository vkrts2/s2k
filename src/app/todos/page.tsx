// src/app/todos/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, ListChecks, CalendarIcon, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TodoItem as TodoType } from '@/lib/types'; // Renamed to avoid conflict
import { getTodos, addTodo, deleteTodo, toggleTodoCompleted } from '@/lib/storage';
import { formatDistanceToNow, format, parseISO, isPast, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function TodosPage() {
  const [todos, setTodos] = useState<TodoType[]>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState<Date | undefined>(undefined);
  const [newTodoNotes, setNewTodoNotes] = useState('');
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const loadTodos = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedTodos = await getTodos(user.uid); // Pass uid and await
      setTodos(fetchedTodos);
    } catch (error) {
      console.error("Yapılacaklar yüklenirken hata oluştu:", error);
      toast({
        title: "Hata",
        description: "Yapılacak işler yüklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    document.title = "Yapılacaklar Listesi | ERMAY";
    if (!authLoading) {
      loadTodos();
    }
  }, [loadTodos, authLoading]);

  const handleAddTodo = useCallback(async () => {
    if (!user) return;
    if (!newTodoText.trim()) {
      toast({
        title: "Hata",
        description: "Yapılacak iş metni boş olamaz.",
        variant: "destructive",
      });
      return;
    }
    try {
      await addTodo(user.uid, { text: newTodoText, dueDate: newTodoDueDate, notes: newTodoNotes }); // Pass uid and await
      setNewTodoText('');
      setNewTodoDueDate(undefined);
      setNewTodoNotes('');
      loadTodos(); 
      toast({
        title: "Başarılı",
        description: "Yeni yapılacak iş eklendi.",
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Yapılacak iş eklenirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [newTodoText, newTodoDueDate, newTodoNotes, loadTodos, toast, user]);

  const handleToggleTodo = useCallback(async (id: string) => {
    if (!user) return;
    await toggleTodoCompleted(user.uid, id); // Pass uid and await
    loadTodos(); 
  }, [loadTodos, user]);

  const handleDeleteTodo = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteTodo(user.uid, id); // Pass uid and await
      loadTodos(); 
      toast({
        title: "Başarılı",
        description: "Yapılacak iş silindi.",
      });
    } catch (error: any) {
       toast({
        title: "Hata",
        description: error.message || "Yapılacak iş silinirken bir sorun oluştu.",
        variant: "destructive",
      });
    }
  }, [loadTodos, toast, user]);

  const formatRelativeTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: tr });
    } catch (error) {
      return dateString; 
    }
  };
  
  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Giriş Yapmanız Gerekiyor</h1>
        <p className="text-muted-foreground mb-4">
          Bu sayfayı görüntülemek için lütfen giriş yapın.
        </p>
        <Button asChild>
          <Link href="/login">Giriş Yap</Link>
        </Button>
      </div>
    );
  }

  const incompleteTodos = todos.filter(todo => !todo.completed);
  const completedTodos = todos.filter(todo => todo.completed);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <ListChecks className="mr-3 h-7 w-7 text-primary" />
            Yapılacaklar Listesi
          </CardTitle>
          <CardDescription>Görevlerinizi buradan yönetin ve takip edin.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex gap-2 items-start">
              <Input
                type="text"
                placeholder="Yeni yapılacak iş metni..."
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                className="flex-grow"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { // Allow shift+enter for textarea, but enter for input
                    e.preventDefault(); // Prevent form submission if wrapped in form
                    handleAddTodo();
                  }
                }}
              />
              <Button onClick={handleAddTodo} size="icon" aria-label="Yeni yapılacak iş ekle">
                <PlusCircle className="h-5 w-5" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dueDate" className="mb-1 block text-sm font-medium">Bitiş Tarihi (İsteğe Bağlı)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="dueDate"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newTodoDueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newTodoDueDate ? format(newTodoDueDate, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newTodoDueDate}
                      onSelect={setNewTodoDueDate}
                      initialFocus
                      locale={tr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="notes" className="mb-1 block text-sm font-medium">Notlar (İsteğe Bağlı)</Label>
                <Textarea
                  id="notes"
                  placeholder="Ek notlar..."
                  value={newTodoNotes}
                  onChange={(e) => setNewTodoNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {todos.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              Henüz yapılacak iş yok. Yukarıdan ekleyebilirsiniz!
            </p>
          )}

          {incompleteTodos.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-primary">Aktif Görevler ({incompleteTodos.length})</h3>
              <ScrollArea className="h-[250px] pr-3">
                <ul className="space-y-3">
                  {incompleteTodos.map((todo) => (
                    <li
                      key={todo.id}
                      className="flex flex-col p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id={`todo-${todo.id}`}
                            checked={todo.completed}
                            onCheckedChange={() => handleToggleTodo(todo.id)}
                            className="mt-1" // Align with first line of text
                          />
                          <label
                            htmlFor={`todo-${todo.id}`}
                            className={`font-medium cursor-pointer ${
                              todo.completed ? 'line-through text-muted-foreground' : ''
                            }`}
                          >
                            {todo.text}
                          </label>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground" title={new Date(todo.createdAt).toLocaleString()}>
                            {formatRelativeTime(todo.createdAt)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTodo(todo.id)}
                            className="text-destructive hover:text-destructive/80 h-8 w-8"
                            aria-label="Görevi sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {(todo.dueDate || todo.notes) && (
                        <div className="mt-2 pl-8 text-sm"> {/* Indent to align with text after checkbox */}
                          {todo.dueDate && (
                            <p className={cn(
                                "text-xs flex items-center",
                                todo.completed && !isPast(parseISO(todo.dueDate)) ? 'text-muted-foreground' : '',
                                !todo.completed && isPast(parseISO(todo.dueDate)) && !isToday(parseISO(todo.dueDate)) ? 'text-red-500 font-semibold' : 'text-primary/90'
                              )}>
                              <CalendarIcon className="inline-block h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                              Bitiş: {format(parseISO(todo.dueDate), "dd MMM yyyy", { locale: tr })}
                              {!todo.completed && isToday(parseISO(todo.dueDate)) && <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded bg-blue-500 text-white">Bugün</span>}
                              {!todo.completed && isPast(parseISO(todo.dueDate)) && !isToday(parseISO(todo.dueDate)) && <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded bg-destructive text-destructive-foreground">Geçmiş</span>}
                            </p>
                          )}
                          {todo.notes && (
                            <div className="text-xs text-muted-foreground mt-1.5 flex items-start">
                               <MessageSquare className="inline-block h-3.5 w-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                               <p className="whitespace-pre-wrap flex-1">{todo.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
          
          {completedTodos.length > 0 && (
             <div className="mt-8">
              <h3 className="text-lg font-semibold mb-3 text-green-500">Tamamlanan Görevler ({completedTodos.length})</h3>
               <ScrollArea className="h-[250px] pr-3">
                <ul className="space-y-3">
                  {completedTodos.map((todo) => (
                     <li
                      key={todo.id}
                      className="flex flex-col p-3 rounded-md border bg-card/70 opacity-80"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-3">
                           <Checkbox
                            id={`todo-${todo.id}`}
                            checked={todo.completed}
                            onCheckedChange={() => handleToggleTodo(todo.id)}
                            className="mt-1"
                          />
                          <label
                            htmlFor={`todo-${todo.id}`}
                            className={`font-medium cursor-pointer ${
                              todo.completed ? 'line-through text-muted-foreground' : ''
                            }`}
                          >
                            {todo.text}
                          </label>
                        </div>
                         <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground" title={new Date(todo.createdAt).toLocaleString()}>
                            {formatRelativeTime(todo.createdAt)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTodo(todo.id)}
                            className="text-destructive hover:text-destructive/80 h-8 w-8"
                            aria-label="Görevi sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {(todo.dueDate || todo.notes) && (
                        <div className="mt-2 pl-8 text-sm">
                          {todo.dueDate && (
                            <p className="text-xs text-muted-foreground/80 flex items-center">
                              <CalendarIcon className="inline-block h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                              Bitiş: {format(parseISO(todo.dueDate), "dd MMM yyyy", { locale: tr })}
                            </p>
                          )}
                          {todo.notes && (
                            <div className="text-xs text-muted-foreground/80 mt-1.5 flex items-start">
                               <MessageSquare className="inline-block h-3.5 w-3.5 mr-1.5 flex-shrink-0 mt-0.5" />
                               <p className="whitespace-pre-wrap flex-1">{todo.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
