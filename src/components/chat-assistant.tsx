"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { QUICK_QUESTIONS } from "@/lib/ai-prompts";

export function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({ transport: new DefaultChatTransport({ api: "/api/chat" }) });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || status === "streaming") return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleQuickQuestion = (q: string) => {
    sendMessage({ text: q });
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-brand-600 to-brand-500 text-2xl shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
      >
        {open ? "✕" : "💬"}
      </button>

      {/* 聊天窗口 */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[500px] w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border bg-card shadow-2xl">
          {/* 头部 */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="text-lg">🤖</span>
            <span className="text-sm font-semibold text-foreground">
              AI 机械设计助手
            </span>
          </div>

          {/* 快捷提问 */}
          {messages.length === 0 && (
            <div className="border-b border-border px-4 py-3">
              <p className="mb-2 text-xs text-zinc-400">快捷提问：</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuickQuestion(q)}
                    className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-600 transition-colors hover:bg-brand-100 dark:bg-brand-50/10 dark:text-brand-500 dark:hover:bg-brand-50/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-zinc-400">
                <span className="mb-2 text-3xl">🔧</span>
                <p className="text-sm">问我任何机械设计问题</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white"
                      : "bg-zinc-100 text-foreground dark:bg-zinc-800"
                  }`}
                >
                  {msg.parts?.map((part, i) =>
                    part.type === "text" ? (
                      <span key={i} className="whitespace-pre-wrap">
                        {part.text}
                      </span>
                    ) : null
                  )}
                </div>
              </div>
            ))}
            {status === "streaming" && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-zinc-100 px-4 py-2.5 text-sm dark:bg-zinc-800">
                  <span className="animate-pulse text-zinc-400">思考中...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2 border-t border-border px-4 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入问题..."
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button
              type="submit"
              disabled={status === "streaming" || !input.trim()}
              className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-md disabled:opacity-50"
            >
              发送
            </button>
          </form>
        </div>
      )}
    </>
  );
}
