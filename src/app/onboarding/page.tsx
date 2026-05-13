"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendIntakeMessage, completeIntake } from "./actions";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function OnboardingPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  async function startConversation() {
    setStarted(true);
    setLoading(true);
    try {
      const { reply } = await sendIntakeMessage([], "Hello, I'd like to start telling my life story.");
      setMessages([
        { role: "user", content: "Hello, I'd like to start telling my life story." },
        { role: "assistant", content: reply },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");

    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const { reply, intakeComplete } = await sendIntakeMessage(
        messages,
        userMessage
      );

      const finalMessages: ChatMessage[] = [
        ...updatedMessages,
        { role: "assistant", content: reply },
      ];
      setMessages(finalMessages);

      if (intakeComplete) {
        setCompleting(true);
        await completeIntake(finalMessages);
        router.push("/chapters");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  if (!started) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="max-w-lg text-center">
          <h1 className="mb-4 text-4xl font-bold text-stone-900">
            Welcome to LifeStory
          </h1>
          <p className="mb-8 text-lg text-stone-600">
            We&apos;re going to have a short conversation to get to know you and
            understand what kind of story you&apos;d like to tell. It&apos;ll take about
            5-10 minutes.
          </p>
          <button
            onClick={startConversation}
            className="rounded-lg bg-amber-600 px-8 py-4 text-lg font-medium text-white hover:bg-amber-700 transition-colors"
          >
            Let&apos;s begin
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-stone-900">Getting to know you</h1>
        <p className="text-sm text-stone-500">
          Tell us a bit about yourself so we can shape your story
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-amber-600 text-white"
                    : "bg-white text-stone-800 shadow-sm border border-stone-100"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm border border-stone-100">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 rounded-full bg-stone-400 animate-bounce" />
                  <div className="h-2 w-2 rounded-full bg-stone-400 animate-bounce [animation-delay:0.1s]" />
                  <div className="h-2 w-2 rounded-full bg-stone-400 animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {completing ? (
        <div className="border-t border-stone-200 bg-white px-6 py-4 text-center">
          <p className="text-stone-600">
            Setting up your story structure...
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSend}
          className="border-t border-stone-200 bg-white px-4 py-4"
        >
          <div className="mx-auto flex max-w-2xl gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none rounded-xl border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-amber-600 px-6 py-3 font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
