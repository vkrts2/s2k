"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChatWidget() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "İstek başarısız");
      setMessages((m) => [...m, { role: "assistant", text: data.text }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", text: `Hata: ${e.message || "İstek başarısız"}` }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ask();
    }
  };

  return (
    <div className="flex flex-col h-[420px]">
      <div className="flex-1 overflow-auto border rounded p-3 space-y-2 bg-background">
        {messages.length === 0 && (
          <div className="text-sm text-muted-foreground">Bir soru sorun; örn: "Stok raporunu nasıl alırım?"</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div className={`inline-block px-3 py-2 rounded text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={loading ? "Yanıt bekleniyor…" : "Mesajınızı yazın…"}
          disabled={loading}
        />
        <Button onClick={ask} disabled={loading || !input.trim()}>Gönder</Button>
      </div>
    </div>
  );
}
