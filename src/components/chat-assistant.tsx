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
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-95"
      >
        {open ? "✕" : "💬"}
      </button>

      {/* 聊天窗口 */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[500px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-white/20 bg-white/80 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/80 max-md:inset-0 max-md:bottom-0 max-md:right-0 max-md:h-full max-md:w-full max-md:rounded-none max-md:max-w-full">
          {/* 头部 - 毛玻璃 */}
          <div className="flex items-center justify-between border-b border-border/50 bg-white/50 px-5 py-4 backdrop-blur-md dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/20">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">AI 机械设计助手</span>
                <p className="text-xs text-muted">基于 MiMo 大模型</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-xl p-2 text-zinc-400 transition-all hover:bg-zinc-100 hover:text-foreground active:scale-90 dark:hover:bg-zinc-800 md:hidden"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 快捷提问 */}
          {messages.length === 0 && (
            <div className="border-b border-border/50 px-5 py-3">
              <p className="mb-2.5 text-xs font-medium text-muted">快捷提问：</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuickQuestion(q)}
                    className="rounded-full bg-indigo-50/80 px-3.5 py-1.5 text-xs font-medium text-indigo-600 transition-all duration-200 hover:bg-indigo-100 hover:shadow-sm active:scale-95 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-muted">
                <span className="mb-3 text-4xl">🔧</span>
                <p className="text-sm font-medium">问我任何机械设计问题</p>
                <p className="mt-1 text-xs text-zinc-400">公差、齿轮、材料、工艺...</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-2xl rounded-br-sm bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/15"
                      : "rounded-2xl rounded-bl-sm border border-border/50 bg-surface/80 text-foreground"
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
                <div className="rounded-2xl rounded-bl-sm border border-border/50 bg-surface/80 px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
                    </div>
                    <span className="text-xs text-muted">思考中</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2 border-t border-border/50 bg-white/50 px-5 py-4 backdrop-blur-sm dark:bg-zinc-900/50"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入问题..."
              className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-zinc-400 transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
            <button
              type="submit"
              disabled={status === "streaming" || !input.trim()}
              className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95 disabled:opacity-50 disabled:shadow-none"
            >
              发送
            </button>
          </form>
        </div>
      )}
    </>
  );
}
