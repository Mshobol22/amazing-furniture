import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractSku } from "@/lib/utils";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { messages, sessionId } = (await request.json()) as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      sessionId?: string;
    };

    if (!messages?.length) {
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createAdminClient();
    const { data: products } = await supabase
      .from("products")
      .select("id, name, slug, price, category")
      .order("name", { ascending: true })
      .limit(300);

    const productList = (products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      category: p.category,
      sku: extractSku(p.slug),
    }));

    const systemPrompt = `You are a helpful furniture shopping assistant for Amazing Furniture, a premium furniture store. You help customers find the perfect furniture for their home.

Available products: ${JSON.stringify(productList)}

When recommending products, always include the product slug so it can be linked.
Keep responses concise and friendly. Format product recommendations as:
**[Product Name]** - $[price] → /products/[slug]`;

    const apiMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const stream = await anthropic.messages.create({
      model: "claude-sonnet-4.6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: apiMessages,
      stream: true,
    });

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          console.error("AI stream error:", err);
          controller.enqueue(
            encoder.encode("Sorry, I encountered an error. Please try again.")
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("AI assistant error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Failed to process request",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
