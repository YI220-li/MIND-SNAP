"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

  // 初始加载
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // 搜索防抖
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

  const filteredNotes = filterTag
    ? notes.filter((n) => n.tags.includes(filterTag))
    : notes;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      {/* 导航栏 */}
      <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            MindSnap
          </span>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* 搜索框 */}
        <div className="relative mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索笔记内容..."
            className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-4 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              &times;
            </button>
          )}
        </div>

        {/* 输入区域 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写点什么..."
            rows={3}
            className="w-full resize-none rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />

          {/* 标签输入 */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="添加标签"
              className="flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            <button
              onClick={addTag}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              添加
            </button>
          </div>

          {/* 已添加的标签 */}
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* 保存按钮 */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="mt-4 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isLoading ? "保存中..." : "保存笔记"}
          </button>
        </div>

        {/* 筛选栏 */}
        {(filterTag || searchQuery.trim()) && (
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            {searchQuery.trim() && (
              <span>
                搜索 &ldquo;<span className="font-medium text-zinc-900 dark:text-zinc-100">{searchQuery.trim()}</span>&rdquo; 的结果：
              </span>
            )}
            {filterTag && (
              <>
                <span>
                  筛选标签：<span className="font-medium text-zinc-900 dark:text-zinc-100">{filterTag}</span>
                </span>
                <button
                  onClick={() => setFilterTag(null)}
                  className="text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  清除筛选
                </button>
              </>
            )}
          </div>
        )}

        {/* 笔记列表 */}
        <div className="mt-6 space-y-4">
          {filteredNotes.length === 0 ? (
            <p className="py-16 text-center text-sm text-zinc-400 dark:text-zinc-600">
              {searchQuery.trim() ? "没有找到匹配的笔记" : "还没有笔记，写一条吧 ✍️"}
            </p>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {note.content}
                </p>

                {note.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {note.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setFilterTag(tag)}
                        className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}

                <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-600">
                  {new Date(note.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
