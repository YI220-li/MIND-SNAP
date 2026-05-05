"use client";

import { useState, useEffect, useCallback } from "react";
import { WEEKLY_REPORT_PROMPT } from "@/lib/ai-prompts";

interface Note {
  id: number;
  content: string;
  tags: string[];
  createdAt: string;
}

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function WeeklyReport() {
  const defaults = getDefaultDateRange();
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      if (res.ok) {
        const data: Note[] = await res.json();
        setAllNotes(data);
        const tagSet = new Set<string>();
        data.forEach((n) => n.tags.forEach((t) => tagSet.add(t)));
        setAllTags(Array.from(tagSet).sort());
      }
    } catch {
      // silently fail, tags will be empty
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleGenerate = async () => {
    setError("");
    setReport("");
    setSaveMsg("");

    const filtered = allNotes.filter((n) => {
      const noteDate = n.createdAt.slice(0, 10);
      if (noteDate < startDate || noteDate > endDate) return false;
      if (selectedTags.length > 0) {
        return n.tags.some((t) => selectedTags.includes(t));
      }
      return true;
    });

    if (filtered.length === 0) {
      setError("所选时间和标签范围内没有笔记，请调整筛选条件。");
      return;
    }

    const notesContent = filtered
      .map(
        (n) =>
          `【${new Date(n.createdAt).toLocaleDateString("zh-CN")}】${n.content.slice(0, 200)}${n.content.length > 200 ? "..." : ""}`,
      )
      .join("\n\n");

    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: WEEKLY_REPORT_PROMPT,
          messages: [
            {
              role: "user",
              content: `请根据以下笔记内容，生成一份工作周报（时间范围：${startDate} 至 ${endDate}）。周报包含四个部分：1.本周已完成工作 2.进行中的任务 3.遇到的问题及解决方案 4.下周计划。\n\n笔记内容：\n${notesContent}`,
            },
          ],
        }),
      });
      if (!res.ok) {
        setError("AI 请求失败，请重试");
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            if (json.type === "text-delta" && json.delta) {
              text += json.delta;
              setReport(text);
            }
          } catch {
            // skip
          }
        }
      }
      if (!text) setError("AI 未返回有效内容，请重试");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert("复制失败");
    }
  };

  const handleSave = async () => {
    if (!report.trim()) return;
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `# 工作周报 ${startDate} ~ ${endDate}\n\n${report}`,
          tags: ["周报"],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        window.alert(err.error ?? "保存失败");
        return;
      }
      setSaveMsg("周报已保存为笔记");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch {
      window.alert("网络错误，请重试");
    }
  };

  return (
    <div className="space-y-5">
      {/* 标签筛选 */}
      {allTags.length > 0 && (
        <div>
          <label className="mb-2 block text-xs font-medium text-muted">按标签筛选（不选则包含全部）</label>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
                  selectedTags.includes(tag)
                    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/20"
                    : "bg-surface text-zinc-500 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 时间范围 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">开始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">结束日期</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>
      </div>

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/15 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            生成中...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            生成周报
          </>
        )}
      </button>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* 周报预览 */}
      {(report || loading) && (
        <div className="rounded-2xl border border-border/50 bg-surface/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-muted">工作周报</p>
            </div>
            {report && (
              <div className="flex gap-1">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                    copied
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      已复制
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                      </svg>
                      复制
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-all hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 3v4h4M12 11v6m-3-3h6" />
                  </svg>
                  保存为笔记
                </button>
              </div>
            )}
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {report || (
              <div className="flex items-center gap-2 text-zinc-400">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
                </div>
                正在生成周报...
              </div>
            )}
          </div>
        </div>
      )}

      {saveMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {saveMsg}
        </div>
      )}
    </div>
  );
}
