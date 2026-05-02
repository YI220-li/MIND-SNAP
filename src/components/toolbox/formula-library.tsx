"use client";

import { useState } from "react";

interface Formula {
  name: string;
  category: string;
  expression: string;
  params: { name: string; unit: string; default?: number }[];
  calc: (values: number[]) => { label: string; value: number; unit: string }[];
}

const FORMULAS: Formula[] = [
  {
    name: "实心轴估算直径",
    category: "轴",
    expression: "d ≥ A × (P/n)^(1/3)",
    params: [
      { name: "A (系数)", unit: "", default: 110 },
      { name: "P (功率)", unit: "kW", default: 5 },
      { name: "n (转速)", unit: "rpm", default: 1450 },
    ],
    calc: ([A, P, n]) => [{ label: "最小轴径 d", value: A * Math.pow(P / n, 1 / 3), unit: "mm" }],
  },
  {
    name: "平键挤压强度",
    category: "键",
    expression: "σ_p = 2T/(k×l×d) ≤ [σ_p]",
    params: [
      { name: "T (扭矩)", unit: "N·mm", default: 50000 },
      { name: "k (键与毂接触高)", unit: "mm", default: 4 },
      { name: "l (键工作长度)", unit: "mm", default: 30 },
      { name: "d (轴径)", unit: "mm", default: 30 },
    ],
    calc: ([T, k, l, d]) => [{ label: "挤压应力 σ_p", value: (2 * T) / (k * l * d), unit: "MPa" }],
  },
  {
    name: "螺栓预紧力",
    category: "螺纹",
    expression: "F = 0.2 × σ_s × A_s",
    params: [
      { name: "σ_s (屈服强度)", unit: "MPa", default: 640 },
      { name: "A_s (公称应力面积)", unit: "mm²", default: 84.3 },
    ],
    calc: ([sigmaS, As]) => [{ label: "预紧力 F", value: 0.2 * sigmaS * As, unit: "N" }],
  },
  {
    name: "齿轮接触强度 (简化)",
    category: "齿轮",
    expression: "σ_H = Z_E × √(2KT/(bd²))",
    params: [
      { name: "Z_E (弹性系数)", unit: "√MPa", default: 189.8 },
      { name: "K (载荷系数)", unit: "", default: 1.3 },
      { name: "T (扭矩)", unit: "N·mm", default: 100000 },
      { name: "b (齿宽)", unit: "mm", default: 30 },
      { name: "d (分度圆直径)", unit: "mm", default: 60 },
    ],
    calc: ([ZE, K, T, b, d]) => [{ label: "接触应力 σ_H", value: ZE * Math.sqrt((2 * K * T) / (b * d * d)), unit: "MPa" }],
  },
  {
    name: "弯矩 (简支梁集中载荷)",
    category: "应力",
    expression: "M = F×L/4 (中点加载)",
    params: [
      { name: "F (力)", unit: "N", default: 1000 },
      { name: "L (跨距)", unit: "mm", default: 200 },
    ],
    calc: ([F, L]) => [{ label: "最大弯矩 M", value: (F * L) / 4, unit: "N·mm" }],
  },
];

export function FormulaLibrary() {
  const [selected, setSelected] = useState(0);
  const [values, setValues] = useState<number[]>(FORMULAS[0].params.map((p) => p.default ?? 0));

  const formula = FORMULAS[selected];
  const results = formula.calc(values);

  const changeFormula = (idx: number) => {
    setSelected(idx);
    setValues(FORMULAS[idx].params.map((p) => p.default ?? 0));
  };

  const categories = [...new Set(FORMULAS.map((f) => f.category))];

  return (
    <div className="space-y-4">
      {/* 分类选择 */}
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => changeFormula(FORMULAS.findIndex((f) => f.category === cat))}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              formula.category === cat
                ? "bg-brand-50 text-brand-600 dark:bg-brand-50/10"
                : "bg-zinc-100 text-zinc-500 hover:text-foreground dark:bg-zinc-800"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 公式列表 */}
      <div className="flex flex-wrap gap-1">
        {FORMULAS.map((f, i) => (
          <button
            key={i}
            onClick={() => changeFormula(i)}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              selected === i
                ? "bg-brand-500 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* 公式详情 */}
      <div className="rounded-xl border border-border bg-background p-4">
        <h4 className="font-medium text-foreground">{formula.name}</h4>
        <p className="mt-1 font-mono text-sm text-brand-600">{formula.expression}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {formula.params.map((param, i) => (
            <div key={param.name}>
              <label className="mb-1 block text-xs text-zinc-500">
                {param.name} {param.unit && `(${param.unit})`}
              </label>
              <input
                type="number"
                value={values[i]}
                onChange={(e) => {
                  const next = [...values];
                  next[i] = parseFloat(e.target.value) || 0;
                  setValues(next);
                }}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-brand-50 p-4 dark:bg-brand-50/5">
          {results.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between">
              <span className="text-sm text-foreground">{r.label}</span>
              <span className="font-mono text-lg font-bold text-brand-600">
                {r.value.toFixed(3)} <span className="text-xs font-normal text-zinc-500">{r.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
