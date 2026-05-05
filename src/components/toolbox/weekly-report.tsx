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
    <div className="space-y-4">
      {/* 标签筛选 */}
      {allTags.length > 0 && (
        <div>
          <label className="mb-1 block text-xs text-zinc-500">按标签筛选（不选则包含全部）</label>
          <div className="flex flex-wrap gap-1">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-brand-500 text-white"
                    : "bg-zinc-100 text-zinc-500 hover:text-foreground dark:bg-zinc-800"
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
          <label className="mb-1 block text-xs text-zinc-500">开始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">结束日期</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/25 disabled:opacity-50"
      >
        {loading ? "生成中..." : "🤖 生成周报"}
      </button>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 周报预览 */}
      {(report || loading) && (
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-500">📊 工作周报：</p>
            <div className="flex gap-2">
              {report && (
                <>
                  <button
                    onClick={handleCopy}
                    className="rounded-lg px-3 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
                  >
                    {copied ? "已复制" : "📋 复制"}
                  </button>
                  <button
                    onClick={handleSave}
                    className="rounded-lg px-3 py-1 text-xs text-zinc-500 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-50/10"
                  >
                    💾 保存为笔记
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {report || <span className="animate-pulse text-zinc-400">生成中...</span>}
          </div>
        </div>
      )}

      {saveMsg && <p className="text-sm text-green-600 dark:text-green-400">{saveMsg}</p>}
    </div>
  );
}
