"use client";

import { useState } from "react";
import { ToleranceQuery } from "./tolerance-query";
import { GearCalculator } from "./gear-calculator";
import { StandardParts } from "./standard-parts";
import { FormulaLibrary } from "./formula-library";
import { UnitConverter } from "./unit-converter";
import { StressSimulator } from "./stress-simulator";
import { ProcessTemplate } from "./process-template";
import { WeeklyReport } from "./weekly-report";

type Tool = "tolerance" | "gear" | "parts" | "formula" | "unit" | "stress" | "process" | "report";

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: "tolerance", label: "公差查询", icon: "📐" },
  { id: "gear", label: "齿轮计算", icon: "⚙️" },
  { id: "parts", label: "标准件", icon: "🔩" },
  { id: "formula", label: "公式库", icon: "📐" },
  { id: "unit", label: "单位换算", icon: "📏" },
  { id: "stress", label: "应力集中", icon: "🔬" },
  { id: "process", label: "工艺模板", icon: "🏭" },
  { id: "report", label: "周报生成", icon: "📊" },
];

interface ToolboxPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ToolboxPanel({ open, onClose }: ToolboxPanelProps) {
  const [activeTool, setActiveTool] = useState<Tool>("tolerance");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white/90 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/90"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-border/50 bg-white/50 px-6 py-4 backdrop-blur-sm dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.048.58.024 1.194-.14 1.743" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">机械设计工具箱</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 transition-all hover:bg-zinc-100 hover:text-foreground active:scale-90 dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 工具选择标签 - 下划线指示器 */}
        <div className="flex gap-0.5 overflow-x-auto border-b border-border/50 px-4 scrollbar-none">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`relative shrink-0 px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTool === tool.id
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-zinc-500 hover:text-foreground"
              }`}
            >
              <span className="mr-1.5">{tool.icon}</span>
              {tool.label}
              {activeTool === tool.id && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
              )}
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
          {activeTool === "process" && <ProcessTemplate />}
          {activeTool === "report" && <WeeklyReport />}
        </div>
      </div>
    </div>
  );
}
