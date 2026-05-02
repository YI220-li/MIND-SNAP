"use client";

import { useState } from "react";
import { ToleranceQuery } from "./tolerance-query";
import { GearCalculator } from "./gear-calculator";
import { StandardParts } from "./standard-parts";
import { FormulaLibrary } from "./formula-library";
import { UnitConverter } from "./unit-converter";
import { StressSimulator } from "./stress-simulator";

type Tool = "tolerance" | "gear" | "parts" | "formula" | "unit" | "stress";

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: "tolerance", label: "公差查询", icon: "📐" },
  { id: "gear", label: "齿轮计算", icon: "⚙️" },
  { id: "parts", label: "标准件", icon: "🔩" },
  { id: "formula", label: "公式库", icon: "📐" },
  { id: "unit", label: "单位换算", icon: "📏" },
  { id: "stress", label: "应力集中", icon: "🔬" },
];

interface ToolboxPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ToolboxPanel({ open, onClose }: ToolboxPanelProps) {
  const [activeTool, setActiveTool] = useState<Tool>("tolerance");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">🔧 机械设计工具箱</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        {/* 工具选择标签 */}
        <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTool === tool.id
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-50/10"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
              }`}
            >
              {tool.icon} {tool.label}
            </button>
          ))}
        </div>

        {/* 工具内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTool === "tolerance" && <ToleranceQuery />}
          {activeTool === "gear" && <GearCalculator />}
          {activeTool === "parts" && <StandardParts />}
          {activeTool === "formula" && <FormulaLibrary />}
          {activeTool === "unit" && <UnitConverter />}
          {activeTool === "stress" && <StressSimulator />}
        </div>
      </div>
    </div>
  );
}
