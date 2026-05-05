"use client";

import { useState } from "react";
import { PROCESS_TEMPLATE_PROMPT } from "@/lib/ai-prompts";

type ProcessRow = {
  id: number;
  name: string;
  device: string;
  clamping: string;
  params: string;
  inspection: string;
};

const OPERATION_OPTIONS = [
  "下料", "车", "铣", "钻", "磨", "热处理", "线切割", "检验", "钳工", "表面处理",
];

const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10";

function createRow(step: number): ProcessRow {
  return { id: step, name: "", device: "", clamping: "", params: "", inspection: "" };
}

export function ProcessTemplate() {
  const [partName, setPartName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [material, setMaterial] = useState("");
  const [processes, setProcesses] = useState<ProcessRow[]>([createRow(1)]);
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const addRow = () => {
    setProcesses((prev) => [...prev, createRow(prev.length + 1)]);
  };

  const removeRow = (id: number) => {
    setProcesses((prev) => prev.filter((r) => r.id !== id).map((r, i) => ({ ...r, id: i + 1 })));
  };

  const updateRow = (id: number, field: keyof Omit<ProcessRow, "id">, value: string) => {
    setProcesses((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleAiRecommend = async () => {
    if (!partName.trim()) {
      window.alert("请先填写零件名称");
      return;
    }
    setAiLoading(true);
    setAiResponse("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: PROCESS_TEMPLATE_PROMPT,
          messages: [
            {
              role: "user",
              content: `请为以下零件推荐一条合理的加工工艺路线，包含工序号、工序名称、建议设备、装夹方式和关键工艺参数。零件名称：${partName}，材料：${material || "未指定"}。用结构化列表输出。`,
            },
          ],
        }),
      });
      if (!res.ok) {
        setAiResponse("AI 请求失败，请重试");
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
              setAiResponse(text);
            } else if (json.type === "reasoning-delta" && json.delta) {
              // skip reasoning
            }
          } catch {
            // skip unparseable lines
          }
        }
      }
      if (!text) setAiResponse("AI 未返回有效内容，请重试");
    } catch {
      setAiResponse("网络错误，请重试");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!partName.trim()) {
      window.alert("请先填写零件名称");
      return;
    }
    const tableRows = processes
      .filter((p) => p.name)
      .map(
        (p) =>
          `| ${p.id} | ${p.name} | ${p.device || "-"} | ${p.clamping || "-"} | ${p.params || "-"} | ${p.inspection || "-"} |`,
      )
      .join("\n");

    const content = `## 工艺卡 — ${partName}

- 图号：${partNumber || "未填写"}
- 材料：${material || "未填写"}

| 序号 | 工序 | 设备 | 装夹 | 参数 | 检验 |
|------|------|------|------|------|------|
${tableRows || "| - | - | - | - | - | - |"}
${aiResponse ? `\n---\n### AI 推荐\n${aiResponse}` : ""}`;

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, tags: ["工艺", partName] }),
      });
      if (!res.ok) {
        const err = await res.json();
        window.alert(err.error ?? "保存失败");
        return;
      }
      setSaveMsg("工艺卡已保存为笔记");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch {
      window.alert("网络错误，请重试");
    }
  };

  const handleClear = () => {
    setPartName("");
    setPartNumber("");
    setMaterial("");
    setProcesses([createRow(1)]);
    setAiResponse("");
    setSaveMsg("");
  };

  return (
    <div className="space-y-5">
      {/* 零件信息 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">零件名称</label>
          <input value={partName} onChange={(e) => setPartName(e.target.value)} placeholder="如：主轴" className={INPUT_CLASS} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">零件图号</label>
          <input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder="如：ZC-001" className={INPUT_CLASS} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">材料牌号</label>
          <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="如：45钢" className={INPUT_CLASS} />
        </div>
      </div>

      {/* 工艺路线表 */}
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/50 text-left text-xs font-medium text-muted">
              <th className="px-3 py-2.5">序号</th>
              <th className="px-3 py-2.5">工序</th>
              <th className="px-3 py-2.5">设备</th>
              <th className="px-3 py-2.5">装夹</th>
              <th className="px-3 py-2.5">参数</th>
              <th className="px-3 py-2.5">检验</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {processes.map((row) => (
              <tr key={row.id} className="border-b border-border/30 transition-colors hover:bg-surface/30">
                <td className="px-3 py-2 text-center text-xs text-zinc-500">{row.id}</td>
                <td className="px-2 py-1.5">
                  <select
                    value={row.name}
                    onChange={(e) => updateRow(row.id, "name", e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                  >
                    <option value="">选择</option>
                    {OPERATION_OPTIONS.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input value={row.device} onChange={(e) => updateRow(row.id, "device", e.target.value)} placeholder="设备" className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10" />
                </td>
                <td className="px-2 py-1.5">
                  <input value={row.clamping} onChange={(e) => updateRow(row.id, "clamping", e.target.value)} placeholder="装夹" className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10" />
                </td>
                <td className="px-2 py-1.5">
                  <input value={row.params} onChange={(e) => updateRow(row.id, "params", e.target.value)} placeholder="参数" className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10" />
                </td>
                <td className="px-2 py-1.5">
                  <input value={row.inspection} onChange={(e) => updateRow(row.id, "inspection", e.target.value)} placeholder="检验" className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10" />
                </td>
                <td className="px-2 py-1.5">
                  <button onClick={() => removeRow(row.id)} className="rounded-lg p-1.5 text-zinc-400 transition-all hover:bg-red-50 hover:text-red-500 active:scale-90 dark:hover:bg-red-500/10" title="删除">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 添加工序按钮 */}
      <button onClick={addRow} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm text-zinc-500 transition-all hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600 active:scale-[0.99] dark:hover:bg-indigo-500/5">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        添加工序
      </button>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleAiRecommend}
          disabled={aiLoading}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/15 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:shadow-none"
        >
          {aiLoading ? (
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              AI 推荐工艺
            </>
          )}
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 active:scale-95 dark:hover:border-indigo-700 dark:hover:bg-indigo-500/10"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 3v4h4M12 11v6m-3-3h6" />
          </svg>
          保存为笔记
        </button>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-zinc-500 transition-all hover:bg-zinc-100 hover:text-foreground active:scale-95 dark:hover:bg-zinc-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          清空
        </button>
      </div>

      {saveMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {saveMsg}
        </div>
      )}

      {/* AI 推荐预览 */}
      {(aiResponse || aiLoading) && (
        <div className="rounded-2xl border border-border/50 bg-surface/50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
              <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-muted">AI 推荐工艺路线</p>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {aiResponse || (
              <div className="flex items-center gap-2 text-zinc-400">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
                </div>
                正在生成推荐...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
