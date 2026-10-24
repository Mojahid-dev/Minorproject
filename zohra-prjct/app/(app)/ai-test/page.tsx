import AIChat from "@/components/ui/ai-chat";

export default function AITestPage() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <h1 className="mb-2 text-2xl font-semibold">
        Zohra AI
      </h1>

      <p className="mb-8 text-neutral-500">
        Your personal academic assistant.
      </p>

      <AIChat />
    </main>
  );
}