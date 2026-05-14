"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getOrCreateFirstSession,
  sendFirstSessionMessage,
  wrapUpFirstSession,
} from "./actions";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function OnboardingPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [wrappingUp, setWrappingUp] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!loading && !initializing) inputRef.current?.focus();
  }, [loading, initializing]);

  useEffect(() => {
    initSession();
  }, []);

  async function initSession() {
    try {
      const { sessionId: sid, existingMessages } =
        await getOrCreateFirstSession();
      setSessionId(sid);

      if (existingMessages.length > 0) {
        setMessages(existingMessages);
      } else {
        // Get the AI's opening greeting
        const reply = await sendFirstSessionMessage(
          sid,
          [],
          "[System: This is the very first interaction. Greet the user warmly and ask what you should call them.]"
        );
        setMessages([{ role: "assistant", content: reply }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInitializing(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading || !sessionId) return;

    const userMessage = input.trim();
    setInput("");

    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const reply = await sendFirstSessionMessage(
        sessionId,
        messages,
        userMessage
      );
      setMessages([...updatedMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleWrapUp() {
    if (!sessionId || wrappingUp) return;
    setWrappingUp(true);
    try {
      await wrapUpFirstSession(sessionId, messages);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setWrappingUp(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  if (initializing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-stone-900">LifeStory</h1>
          <p className="text-stone-500">Getting ready...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-stone-50">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">LifeStory</h1>
          <p className="text-sm text-stone-500">
            Your life, in your words
          </p>
        </div>
        {messages.length >= 6 && (
          <button
            onClick={handleWrapUp}
            disabled={wrappingUp}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            {wrappingUp ? "Setting up your book..." : "Wrap up for today"}
          </button>
        )}
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

      {wrappingUp ? (
        <div className="border-t border-stone-200 bg-white px-6 py-4 text-center">
          <p className="text-stone-600">
            Setting up your story structure and writing your first chapter draft...
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
              placeholder="Share your story..."
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
