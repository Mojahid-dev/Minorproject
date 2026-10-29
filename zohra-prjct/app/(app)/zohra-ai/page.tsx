import AIChat from "@/components/ui/ai-chat";

type Props = { searchParams: Promise<{ resource?: string | string[]; q?: string | string[] }> };

export default async function ZohraAIPage({ searchParams }: Props) {
  const { resource, q } = await searchParams;

  return (
    <AIChat
      initialResourceId={typeof resource === "string" ? resource : undefined}
      initialPrompt={typeof q === "string" ? q.slice(0, 4000) : undefined}
    />
  );
}
