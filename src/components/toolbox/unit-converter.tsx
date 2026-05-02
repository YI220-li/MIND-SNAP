"use client";

import { useState } from "react";

type Conversion = {
  name: string;
  units: [string, string];
  toSecond: (v: number) => number;
  toFirst: (v: number) => number;
};

const CONVERSIONS: Conversion[] = [
  {
    name: "长度",
    units: ["mm", "in"],
    toSecond: (v) => v / 25.4,
    toFirst: (v) => v * 25.4,
  },
  {
    name: "应力",
    units: ["MPa", "psi"],
    toSecond: (v) => v * 145.038,
    toFirst: (v) => v / 145.038,
  },
  {
    name: "扭矩",
    units: ["N·m", "kgf·m"],
    toSecond: (v) => v / 9.80665,
    toFirst: (v) => v * 9.80665,
  },
  {
    name: "扭矩",
    units: ["N·m", "lbf·in"],
    toSecond: (v) => v * 8.8507,
    toFirst: (v) => v / 8.8507,
  },
  {
    name: "质量",
    units: ["kg", "lb"],
    toSecond: (v) => v * 2.20462,
    toFirst: (v) => v / 2.20462,
  },
  {
    name: "角度",
    units: ["°", "rad"],
    toSecond: (v) => (v * Math.PI) / 180,
    toFirst: (v) => (v * 180) / Math.PI,
  },
];

export function UnitConverter() {
  const [selected, setSelected] = useState(0);
  const [firstVal, setFirstVal] = useState("");
  const [secondVal, setSecondVal] = useState("");

  const conv = CONVERSIONS[selected];

  const handleFirst = (v: string) => {
    setFirstVal(v);
    const n = parseFloat(v);
    setSecondVal(isNaN(n) ? "" : conv.toSecond(n).toFixed(6).replace(/\.?0+$/, ""));
  };

  const handleSecond = (v: string) => {
    setSecondVal(v);
    const n = parseFloat(v);
    setFirstVal(isNaN(n) ? "" : conv.toFirst(n).toFixed(6).replace(/\.?0+$/, ""));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {CONVERSIONS.map((c, i) => (
          <button
            key={`${c.name}-${c.units.join("-")}`}
            onClick={() => { setSelected(i); setFirstVal(""); setSecondVal(""); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selected === i
                ? "bg-brand-50 text-brand-600 dark:bg-brand-50/10"
                : "bg-zinc-100 text-zinc-500 hover:text-foreground dark:bg-zinc-800"
            }`}
          >
            {c.name} ({c.units[0]} ↔ {c.units[1]})
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-zinc-500">{conv.units[0]}</label>
          <input
            type="number"
            value={firstVal}
            onChange={(e) => handleFirst(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 font-mono text-lg text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <span className="mt-5 text-xl text-zinc-400">⇄</span>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-zinc-500">{conv.units[1]}</label>
          <input
            type="number"
            value={secondVal}
            onChange={(e) => handleSecond(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 font-mono text-lg text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>
    </div>
  );
}
