"use client";

import { useState } from "react";

interface ShaftParams {
  power: string;
  speed: string;
  span: string;
  loadType: string;
  material: string;
}

const LOAD_TYPES = [
  { value: "轻微冲击", label: "轻微冲击" },
  { value: "中等冲击", label: "中等冲击" },
  { value: "重冲击", label: "重冲击" },
];

const MATERIALS = [
  { value: "45钢调质", label: "45钢调质" },
  { value: "40Cr调质", label: "40Cr调质" },
  { value: "20CrMnTi渗碳淬火", label: "20CrMnTi渗碳淬火" },
];

const STEPS = [
  { num: 1, label: "输入参数" },
  { num: 2, label: "AI 计算" },
  { num: 3, label: "结果操作" },
];

function buildPrompt(p: ShaftParams): string {
  return `你是一个机械设计 Agent。请根据以下参数完成轴系设计，并严格按照格式输出每个步骤的计算过程和结论。
已知：功率 P=${p.power} kW，转速 n=${p.speed} r/min，跨距 L=${p.span} mm，载荷类型=${p.loadType}，轴材料=${p.material}（材料系数A按手册选取）。
请按顺序执行以下步骤，每一步都要给出计算过程和最终取值：

1. 按扭转强度初步估算轴端直径 d_min，使用公式 d≥A×(P/n)^(1/3)，材料系数 A 根据材料选取（45钢A=126~135，40Cr A=112~126，20CrMnTi A=102~112，有冲击取偏大值）。

2. 根据跨距和载荷类型，估算轴上安装轴承处的直径，并推荐至少2个深沟球轴承型号（给出基本额定动载荷 Cr，并说明选择依据）。

3. 为轴端估算平键截面尺寸（按 GB/T 1096），给出键宽 b×键高 h 和键槽深度（轴 t1、毂 t2）。

4. 进行弯扭复合强度校核：计算轴端扭矩 T=9550×P/n (N·m)，计算扭转切应力 τ=T/(0.2d³)，与许用切应力 [τ] 比较（45钢调质 [τ]=30~40MPa，40Cr [τ]=40~52MPa，20CrMnTi [τ]=55~70MPa），给出安全系数。

5. 对轴端推荐配合代号（如 H7/k6、H7/n6 等），并给出建议的形位公差等级（圆度、圆柱度）。

6. 输出一条建议的工艺路线（简要：下料→车→铣键槽→热处理→磨→检验）。

7. 最后将所有数据汇总成一个表格，包含：参数名、数值、单位、备注。`;
}

interface ShaftDesignAgentProps {
  open: boolean;
  onClose: () => void;
}

export function ShaftDesignAgent({ open, onClose }: ShaftDesignAgentProps) {
  const [step, setStep] = useState(1);
  const [params, setParams] = useState<ShaftParams>({
    power: "",
    speed: "",
    span: "",
    loadType: "轻微冲击",
    material: "45钢调质",
  });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  if (!open) return null;

  const handleStart = async () => {
    if (!params.power || !params.speed || !params.span) {
      setError("请填写所有必要参数");
      return;
    }
    setError("");
    setResult("");
    setSaveMsg("");
    setStep(2);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: buildPrompt(params) }],
        }),
      });
      if (!res.ok) {
        setError("AI 请求失败，请重试");
        setLoading(false);
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) { setLoading(false); return; }
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
              setResult(text);
            }
          } catch {
            // skip
          }
        }
      }
      if (text) {
        setStep(3);
      } else {
        setError("AI 未返回有效内容，请重试");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert("复制失败");
    }
  };

  const handleSave = async () => {
    if (!result.trim()) return;
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `# 轴系设计概要\n\n**参数**: P=${params.power}kW, n=${params.speed}rpm, L=${params.span}mm, ${params.loadType}, ${params.material}\n\n${result}`,
          tags: ["轴系设计", "Agent"],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        window.alert(err.error ?? "保存失败");
        return;
      }
      setSaveMsg("设计概要已保存为笔记");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch {
      window.alert("网络错误，请重试");
    }
  };

  const handleReset = () => {
    setStep(1);
    setParams({ power: "", speed: "", span: "", loadType: "轻微冲击", material: "45钢调质" });
    setResult("");
    setError("");
    setSaveMsg("");
  };

  const update = (field: keyof ShaftParams, value: string) => {
    setParams((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white/90 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/90"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-border/50 bg-white/50 px-6 py-4 backdrop-blur-sm dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">轴系设计向导</span>
              <p className="text-xs text-muted">Shaft Design Agent</p>
            </div>
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

        {/* 步骤条 */}
        <div className="flex items-center justify-center gap-2 border-b border-border/50 px-6 py-4">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step > s.num
                    ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                    : step === s.num
                      ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20"
                      : "bg-surface text-muted"
                }`}
              >
                {step > s.num ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  s.num
                )}
              </div>
              <span className={`text-xs font-medium ${step === s.num ? "text-foreground" : "text-muted"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 h-px w-8 ${step > s.num ? "bg-emerald-400" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 步骤 1：输入参数 */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    传递功率 P <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={params.power}
                      onChange={(e) => update("power", e.target.value)}
                      placeholder="如：7.5"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-sm text-foreground transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted">kW</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    转速 n <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={params.speed}
                      onChange={(e) => update("speed", e.target.value)}
                      placeholder="如：1450"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-16 text-sm text-foreground transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted">rpm</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    轴跨距 L <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={params.span}
                      onChange={(e) => update("span", e.target.value)}
                      placeholder="如：300"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-sm text-foreground transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted">mm</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">载荷类型</label>
                  <select
                    value={params.loadType}
                    onChange={(e) => update("loadType", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  >
                    {LOAD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">轴材料</label>
                <select
                  value={params.material}
                  onChange={(e) => update("material", e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                >
                  {MATERIALS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                onClick={handleStart}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/15 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.99]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                开始设计
              </button>
            </div>
          )}

          {/* 步骤 2：AI 计算中 */}
          {step === 2 && (
            <div className="space-y-4">
              {/* 参数摘要 */}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  P={params.power}kW
                </span>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  n={params.speed}rpm
                </span>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  L={params.span}mm
                </span>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                  {params.loadType}
                </span>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                  {params.material}
                </span>
              </div>

              {/* 结果预览 */}
              <div className="rounded-2xl border border-border/50 bg-gray-950 p-5 dark:bg-gray-800">
                <div className="mb-3 flex items-center gap-2">
                  {loading && (
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
                    </div>
                  )}
                  <span className="text-xs font-medium text-gray-400">
                    {loading ? "Agent 正在计算..." : "计算完成"}
                  </span>
                </div>
                <div className="max-h-96 overflow-y-auto font-mono text-sm leading-relaxed text-gray-100 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                  {result ? (
                    <pre className="whitespace-pre-wrap">{result}</pre>
                  ) : (
                    <span className="text-gray-500">等待 AI 响应...</span>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* 完成后自动跳到步骤3，但也允许在步骤2时手动进入 */}
              {result && !loading && (
                <button
                  onClick={() => setStep(3)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/15 transition-all duration-200 hover:shadow-lg active:scale-[0.99]"
                >
                  查看操作选项
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* 步骤 3：结果操作 */}
          {step === 3 && (
            <div className="space-y-4">
              {/* 参数摘要 */}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  P={params.power}kW
                </span>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  n={params.speed}rpm
                </span>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  L={params.span}mm
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  设计完成
                </span>
              </div>

              {/* 结果预览 */}
              <div className="rounded-2xl border border-border/50 bg-gray-950 p-5 dark:bg-gray-800">
                <div className="mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium text-gray-400">设计概要</span>
                </div>
                <div className="max-h-96 overflow-y-auto font-mono text-sm leading-relaxed text-gray-100 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                  <pre className="whitespace-pre-wrap">{result}</pre>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                    copied
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "border border-border text-foreground hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:border-indigo-700 dark:hover:bg-indigo-500/10"
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      已复制
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                      </svg>
                      复制全文
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 dark:hover:border-indigo-700 dark:hover:bg-indigo-500/10"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 3v4h4M12 11v6m-3-3h6" />
                  </svg>
                  保存为笔记
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-zinc-500 transition-all hover:bg-zinc-100 hover:text-foreground active:scale-95 dark:hover:bg-zinc-800"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  重新设计
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
