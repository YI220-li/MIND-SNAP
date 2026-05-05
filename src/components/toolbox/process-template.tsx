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
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

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
    <div className="space-y-4">
      {/* 零件信息 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">零件名称</label>
          <input value={partName} onChange={(e) => setPartName(e.target.value)} placeholder="如：主轴" className={INPUT_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">零件图号</label>
          <input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder="如：ZC-001" className={INPUT_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">材料牌号</label>
          <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="如：45钢" className={INPUT_CLASS} />
        </div>
      </div>

      {/* 工艺路线表 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-zinc-500">
              <th className="px-2 py-2">序号</th>
              <th className="px-2 py-2">工序</th>
              <th className="px-2 py-2">设备</th>
              <th className="px-2 py-2">装夹</th>
              <th className="px-2 py-2">参数</th>
              <th className="px-2 py-2">检验</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {processes.map((row) => (
              <tr key={row.id} className="border-b border-border/50">
                <td className="px-2 py-1.5 text-center text-xs text-zinc-500">{row.id}</td>
                <td className="px-2 py-1.5">
                  <select
                    value={row.name}
                    onChange={(e) => updateRow(row.id, "name", e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">选择</option>
                    {OPERATION_OPTIONS.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input value={row.device} onChange={(e) => updateRow(row.id, "device", e.target.value)} placeholder="设备" className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-brand-500 focus:outline-none" />
                </td>
                <td className="px-2 py-1.5">
                  <input value={row.clamping} onChange={(e) => updateRow(row.id, "clamping", e.target.value)} placeholder="装夹" className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-brand-500 focus:outline-none" />
                </td>
                <td className="px-2 py-1.5">
                  <input value={row.params} onChange={(e) => updateRow(row.id, "params", e.target.value)} placeholder="参数" className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-brand-500 focus:outline-none" />
                </td>
                <td className="px-2 py-1.5">
                  <input value={row.inspection} onChange={(e) => updateRow(row.id, "inspection", e.target.value)} placeholder="检验" className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-brand-500 focus:outline-none" />
                </td>
                <td className="px-2 py-1.5">
                  <button onClick={() => removeRow(row.id)} className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10" title="删除">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 添加工序按钮 */}
      <button onClick={addRow} className="w-full rounded-lg border border-dashed border-border py-2 text-sm text-zinc-500 transition-colors hover:border-brand-500 hover:text-brand-600">
        ＋ 添加工序
      </button>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleAiRecommend}
          disabled={aiLoading}
          className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:shadow-md disabled:opacity-50"
        >
          {aiLoading ? "生成中..." : "🤖 AI 推荐工艺"}
        </button>
        <button
          onClick={handleSave}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-50/10"
        >
          💾 保存为笔记
        </button>
        <button
          onClick={handleClear}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-zinc-500 transition-all hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
        >
          🗑️ 清空
        </button>
      </div>

      {saveMsg && <p className="text-sm text-green-600 dark:text-green-400">{saveMsg}</p>}

      {/* AI 推荐预览 */}
      {(aiResponse || aiLoading) && (
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="mb-2 text-xs font-medium text-zinc-500">🤖 AI 推荐工艺路线：</p>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {aiResponse || <span className="animate-pulse text-zinc-400">生成中...</span>}
          </div>
        </div>
      )}
    </div>
  );
}
