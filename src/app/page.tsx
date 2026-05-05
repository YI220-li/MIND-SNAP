"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChatAssistant } from "@/components/chat-assistant";
import { ToolboxPanel } from "@/components/toolbox/toolbox-panel";
import { ShaftDesignAgent } from "@/components/toolbox/shaft-design-agent";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

interface Note {
  id: number;
  content: string;
  tags: string[];
  createdAt: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return new Date(dateStr).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTagInput, setEditTagInput] = useState("");
  const [toolboxOpen, setToolboxOpen] = useState(false);
  const [shaftOpen, setShaftOpen] = useState(false);

  const fetchNotes = useCallback(async (search?: string) => {
    const url = search ? `/api/notes?q=${encodeURIComponent(search)}` : "/api/notes";
    const res = await fetch(url);
    if (!res.ok) {
      window.alert("获取笔记失败");
      return;
    }
    const data: Note[] = await res.json();
    setNotes(data);
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchNotes(searchQuery.trim() || undefined);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, fetchNotes]);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      window.alert("请输入笔记内容");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, tags }),
      });
      if (!res.ok) {
        const err = await res.json();
        window.alert(err.error ?? "保存失败");
        return;
      }
      setContent("");
      setTags([]);
      await fetchNotes(searchQuery.trim() || undefined);
    } catch {
      window.alert("网络错误，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote({ ...note });
    setEditTagInput("");
  };

  const handleEditCancel = () => {
    setEditingNote(null);
    setEditTagInput("");
  };

  const addEditTag = () => {
    if (!editingNote) return;
    const trimmed = editTagInput.trim();
    if (trimmed && !editingNote.tags.includes(trimmed)) {
      setEditingNote({ ...editingNote, tags: [...editingNote.tags, trimmed] });
      setEditTagInput("");
    }
  };

  const removeEditTag = (tag: string) => {
    if (!editingNote) return;
    setEditingNote({ ...editingNote, tags: editingNote.tags.filter((t) => t !== tag) });
  };

  const handleEditSave = async () => {
    if (!editingNote || !editingNote.content.trim()) {
      window.alert("请输入笔记内容");
      return;
    }
    try {
      const res = await fetch(`/api/notes/${editingNote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingNote.content, tags: editingNote.tags }),
      });
      if (!res.ok) {
        const err = await res.json();
        window.alert(err.error ?? "更新失败");
        return;
      }
      setEditingNote(null);
      setEditTagInput("");
      await fetchNotes(searchQuery.trim() || undefined);
    } catch {
      window.alert("网络错误，请重试");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("确定要删除这条笔记吗？")) return;
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        window.alert(err.error ?? "删除失败");
        return;
      }
      await fetchNotes(searchQuery.trim() || undefined);
    } catch {
      window.alert("网络错误，请重试");
    }
  };

  const filteredNotes = filterTag
    ? notes.filter((n) => n.tags.includes(filterTag))
    : notes;

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-950 dark:to-gray-900" />

      {/* 导航栏 */}
      <nav className="sticky top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl dark:border-gray-700/30 dark:bg-gray-900/70">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-xl font-bold text-transparent">
            MindSnap
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShaftOpen(true)}
              className="rounded-full p-2.5 text-muted transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600 hover:rotate-12 dark:hover:bg-indigo-500/10"
              title="轴系设计"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93"/></svg>
            </button>
            <button
              onClick={() => setToolboxOpen(true)}
              className="rounded-full p-2.5 text-muted transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600 hover:rotate-12 dark:hover:bg-indigo-500/10"
              title="工具箱"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* 搜索框 */}
        <div className="relative mb-8">
          <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索笔记内容..."
            className="w-full rounded-full border border-border bg-card/80 py-3 pl-11 pr-20 text-sm text-foreground placeholder:text-muted backdrop-blur-sm transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-400/10"
          />
          <span className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted sm:block">
            Ctrl+K
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition-colors hover:text-foreground"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          )}
        </div>

        {/* 输入区域 */}
        <div className="rounded-2xl border border-white/20 bg-card/80 p-6 shadow-lg shadow-indigo-500/5 backdrop-blur-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-gray-700/30 dark:shadow-indigo-400/5 dark:hover:shadow-indigo-400/10">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写点什么..."
              rows={3}
              className="w-full resize-none border-0 bg-transparent px-0 py-3 text-[15px] leading-relaxed text-foreground placeholder:text-muted focus:outline-none"
            />
            <div className={`h-[2px] transition-all duration-300 ${content ? "bg-gradient-to-r from-indigo-500 to-violet-500" : "bg-border"}`} />
          </div>

          {/* 标签输入 */}
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="添加标签"
              className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={addTag}
              className={`flex h-10 w-10 items-center justify-center rounded-full border border-border text-lg font-light transition-all duration-200 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 dark:hover:bg-indigo-500/10 ${tagInput.trim() ? "animate-bounce border-indigo-300 text-indigo-500" : "text-muted"}`}
            >
              +
            </button>
          </div>

          {/* 已添加的标签 */}
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-100/70 px-3 py-1 text-xs font-medium text-indigo-700 transition-transform duration-150 hover:scale-105 dark:bg-indigo-900/40 dark:text-indigo-300"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 opacity-60 transition-opacity hover:opacity-100"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </motion.span>
              ))}
            </div>
          )}

          {/* 保存按钮 */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? "保存中..." : "保存笔记"}
          </button>
        </div>

        {/* 筛选栏 */}
        <AnimatePresence>
          {(filterTag || searchQuery.trim()) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/20 bg-card/80 px-5 py-3 text-sm backdrop-blur-sm dark:border-gray-700/30"
            >
              {searchQuery.trim() && (
                <span className="text-muted">
                  搜索 &ldquo;<span className="font-medium text-foreground">{searchQuery.trim()}</span>&rdquo; 的结果：
                </span>
              )}
              {filterTag && (
                <>
                  <span className="text-muted">
                    标签筛选：<span className="inline-flex items-center gap-1 rounded-full bg-indigo-100/70 px-2.5 py-0.5 font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">#{filterTag}</span>
                  </span>
                  <button
                    onClick={() => setFilterTag(null)}
                    className="text-muted transition-colors hover:text-red-500"
                  >
                    清除
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 笔记列表 */}
        <div className="mt-6 space-y-4">
          {filteredNotes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-20"
            >
              <motion.span
                className="mb-4 text-5xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                📝
              </motion.span>
              <p className="text-sm text-muted">
                {searchQuery.trim() ? "没有找到匹配的笔记" : "还没有笔记，写一条吧"}
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredNotes.map((note, index) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                  transition={{ delay: index * 0.05, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="group rounded-2xl border border-white/20 bg-card/80 px-5 py-4 shadow-lg shadow-indigo-500/5 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-gray-700/30 dark:shadow-indigo-400/5 dark:hover:shadow-indigo-400/10"
                >
                  {editingNote?.id === note.id ? (
                    /* === 编辑模式 === */
                    <div>
                      <textarea
                        value={editingNote.content}
                        onChange={(e) =>
                          setEditingNote({ ...editingNote, content: e.target.value })
                        }
                        rows={3}
                        className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-[15px] leading-relaxed text-foreground transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />

                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={editTagInput}
                          onChange={(e) => setEditTagInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && (e.preventDefault(), addEditTag())
                          }
                          placeholder="添加标签"
                          className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <button
                          onClick={addEditTag}
                          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 dark:hover:bg-indigo-500/10"
                        >
                          添加
                        </button>
                      </div>

                      {editingNote.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {editingNote.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-full bg-indigo-100/70 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                            >
                              {tag}
                              <button
                                onClick={() => removeEditTag(tag)}
                                className="ml-0.5 opacity-60 transition-opacity hover:opacity-100"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={handleEditSave}
                          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:shadow-xl active:scale-[0.98]"
                        >
                          保存更改
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-surface active:scale-95"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* === 展示模式 === */
                    <div>
                      <div className="flex items-start justify-between">
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-card-foreground">
                          {note.content}
                        </p>
                        <div className="ml-4 flex shrink-0 gap-0.5 opacity-0 transition-all duration-200 group-hover:opacity-100">
                          <button
                            onClick={() => handleEdit(note)}
                            className="rounded-lg p-1.5 text-muted transition-all duration-150 hover:bg-indigo-50 hover:text-indigo-600 active:scale-90 dark:hover:bg-indigo-500/10"
                            title="编辑"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="rounded-lg p-1.5 text-muted transition-all duration-150 hover:bg-red-50 hover:text-red-500 hover:rotate-12 active:scale-90 dark:hover:bg-red-500/10"
                            title="删除"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </div>

                      {note.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
                          {note.tags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => setFilterTag(tag)}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 active:scale-95 ${
                                filterTag === tag
                                  ? "bg-indigo-500 text-white ring-2 ring-indigo-500/30"
                                  : "bg-indigo-100/70 text-indigo-700 hover:bg-indigo-200/70 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                              }`}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      )}

                      <p className="mt-2.5 text-xs text-muted">
                        {formatRelativeTime(note.createdAt)}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* 工具箱面板 */}
      <ToolboxPanel open={toolboxOpen} onClose={() => setToolboxOpen(false)} />

      {/* 轴系设计向导 */}
      <ShaftDesignAgent open={shaftOpen} onClose={() => setShaftOpen(false)} />

      {/* AI 聊天助手 */}
      <ChatAssistant />

      {/* PWA 安装提示 */}
      <PwaInstallPrompt />
    </div>
  );
}
