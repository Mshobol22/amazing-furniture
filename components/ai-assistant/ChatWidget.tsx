"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "Help me find a sofa under $500",
  "What beds do you have in stock?",
  "I need a dining table for 6 people",
  "Show me bedroom furniture",
];

const PRODUCT_LINK_REGEX = /\/products\/([a-zA-Z0-9-]+)/g;

function parseProductLinks(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = PRODUCT_LINK_REGEX.exec(text)) !== null) {
    parts.push(text.slice(lastIndex, match.index));
    parts.push(
      <Link
        key={match.index}
        href={`/products/${match[1]}`}
        className="inline-block rounded bg-walnut/10 px-2 py-1 text-walnut hover:bg-walnut/20"
      >
        View product →
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }
  parts.push(text.slice(lastIndex));
  return parts;
}

function extractProductCards(
  text: string
): Array<{ name: string; price: string; slug: string }> {
  const cards: Array<{ name: string; price: string; slug: string }> = [];
  const regex =
    /\*\*([^*]+)\*\*\s*-\s*\$([\d,]+)\s*→\s*\/products\/([a-zA-Z0-9-]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    cards.push({
      name: match[1].trim(),
      price: match[2],
      slug: match[3],
    });
  }
  return cards;
}

function textWithoutProductLines(text: string): string {
  return text
    .replace(/\*\*[^*]+\*\*\s*-\s*\$[\d,]+\s*→\s*\/products\/[a-zA-Z0-9-]+/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        let errMsg = `Error ${response.status}`;
        try {
          const parsed = JSON.parse(errBody);
          if (parsed.error) errMsg = parsed.error;
        } catch {
          if (errBody) errMsg = errBody.slice(0, 200);
        }
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: assistantContent };
            return next;
          });
        }
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to process request";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I couldn't process your request. ${errorMsg}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <>
      {/* Mobile tap-outside overlay — only when open, only on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-transparent"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 h-[520px] w-[380px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-walnut" />
                  <span className="font-display font-semibold text-charcoal">
                    AI Assistant
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-warm-gray">
                      Hi! I&apos;m your furniture shopping assistant. Ask me anything
                      or try one of these:
                    </p>
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleQuickPrompt(prompt)}
                        className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm text-charcoal transition-colors hover:bg-gray-100"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-4 py-2 ${
                            msg.role === "user"
                              ? "bg-walnut text-cream"
                              : "bg-gray-100 text-charcoal"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <p className="text-sm">{msg.content}</p>
                          ) : (
                            <div className="space-y-2 text-sm">
                              {textWithoutProductLines(msg.content) && (
                                <p className="whitespace-pre-wrap">
                                  {parseProductLinks(
                                    textWithoutProductLines(msg.content)
                                  )}
                                </p>
                              )}
                              {extractProductCards(msg.content).length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {extractProductCards(msg.content).map(
                                    (card) => (
                                      <Link
                                        key={card.slug}
                                        href={`/products/${card.slug}`}
                                        className="block rounded border border-gray-200 bg-white p-2 shadow-sm transition-shadow hover:shadow-md"
                                      >
                                        <p className="font-medium text-charcoal">
                                          {card.name}
                                        </p>
                                        <p className="text-xs text-warm-gray">
                                          ${card.price}
                                        </p>
                                      </Link>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-1 rounded-lg bg-gray-100 px-4 py-2">
                          <span
                            className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex gap-2 border-t border-gray-200 p-4"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about furniture..."
                  disabled={isLoading}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-walnut/50"
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-walnut text-cream hover:bg-walnut/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-walnut text-cream shadow-lg transition-shadow hover:shadow-xl"
            aria-label="Open AI Assistant"
          >
            <Sparkles className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
