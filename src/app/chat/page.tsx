import ChatWidget from "@/components/ChatWidget";

export default function ChatPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Chat Bot</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-7">
          <ChatWidget />
        </div>
      </div>
    </div>
  );
}
