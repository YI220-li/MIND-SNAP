"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChatAssistant } from "@/components/chat-assistant";
import { ToolboxPanel } from "@/components/toolbox/toolbox-panel";

interface Note {
  id: number;
  content: string;
  tags: string[];
  createdAt: string;
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
      {/* 导航栏 */}
      <nav className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-xl dark:bg-zinc-900/80">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-lg font-bold text-transparent">
            MindSnap
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setToolboxOpen(true)}
              className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-all duration-200 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-50/10"
            >
              🔧 工具箱
            </button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* 搜索框 */}
        <div className="relative mb-6">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索笔记内容..."
            className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-10 text-sm text-foreground placeholder:text-zinc-400 transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 transition-colors hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        {/* 输入区域 */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写点什么..."
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-zinc-400 transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />

          {/* 标签输入 */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="添加标签"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-zinc-400 transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button
              onClick={addTag}
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-50/10"
            >
              添加
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
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 transition-transform duration-150 hover:scale-105"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 opacity-60 transition-opacity hover:opacity-100"
                  >
                    ✕
                  </button>
                </motion.span>
              ))}
            </div>
          )}

          {/* 保存按钮 */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/25 disabled:opacity-50"
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
              className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm"
            >
              {searchQuery.trim() && (
                <span className="text-zinc-500 dark:text-zinc-400">
                  搜索 &ldquo;<span className="font-medium text-foreground">{searchQuery.trim()}</span>&rdquo; 的结果：
                </span>
              )}
              {filterTag && (
                <>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    标签筛选：<span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 font-medium text-brand-600">#{filterTag}</span>
                  </span>
                  <button
                    onClick={() => setFilterTag(null)}
                    className="text-zinc-400 transition-colors hover:text-red-500"
                  >
                    ✕ 清除
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
              <span className="mb-4 text-5xl">📝</span>
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
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
                  transition={{ delay: index * 0.03, duration: 0.3 }}
                  className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md"
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
                        className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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
                          className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-zinc-400 transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                        <button
                          onClick={addEditTag}
                          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-50/10"
                        >
                          添加
                        </button>
                      </div>

                      {editingNote.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {editingNote.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600"
                            >
                              {tag}
                              <button
                                onClick={() => removeEditTag(tag)}
                                className="ml-0.5 opacity-60 transition-opacity hover:opacity-100"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={handleEditSave}
                          className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/25"
                        >
                          保存更改
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* === 展示模式 === */
                    <div>
                      <div className="flex items-start justify-between">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">
                          {note.content}
                        </p>
                        <div className="ml-4 flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => handleEdit(note)}
                            className="rounded-lg p-1.5 text-zinc-400 transition-all duration-150 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-50/10"
                            title="编辑"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="rounded-lg p-1.5 text-zinc-400 transition-all duration-150 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                            title="删除"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {note.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {note.tags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => setFilterTag(tag)}
                              className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 transition-all duration-150 hover:scale-105 hover:bg-brand-100"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      )}

                      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
                        {new Date(note.createdAt).toLocaleString("zh-CN")}
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

      {/* AI 聊天助手 */}
      <ChatAssistant />
    </div>
  );
}
