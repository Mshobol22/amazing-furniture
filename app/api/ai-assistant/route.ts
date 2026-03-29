import Groq from "groq-sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyAcmeComponentListingFilter } from "@/lib/supabase/products";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages } = (await request.json()) as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!messages?.length) {
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createAdminClient();
    let invQuery = supabase
      .from("products")
      .select("name, slug, price, category")
      .order("name", { ascending: true })
      .limit(300);
    invQuery = applyAcmeComponentListingFilter(invQuery);
    const { data: products } = await invQuery;

    const productList = (products ?? [])
      .map(
        (p) =>
          `${p.name}|${Number(p.price)}|${p.category}|${p.slug}`
      )
      .join("\n");

    const systemPrompt = `You are a helpful furniture shopping assistant for Amazing Home Furniture.
Help customers find furniture. When recommending products, format as:
**[Name]** - $[price] → /products/[slug]

Available inventory (name|price|category|slug):
${productList}`;

    const apiMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        ...apiMessages,
      ],
      stream: true,
    });

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              controller.enqueue(encoder.encode(text));
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
