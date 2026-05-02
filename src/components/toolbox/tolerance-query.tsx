"use client";

import { useState } from "react";

// GB/T 1800.1 简化公差表 (基本尺寸 0-500mm, 单位 μm)
const TOLERANCE_TABLE: Record<string, Record<string, { upper: number; lower: number }>> = {
  // 基孔制 — 孔公差
  H7: { "0-3": { upper: 10, lower: 0 }, "3-6": { upper: 12, lower: 0 }, "6-10": { upper: 15, lower: 0 }, "10-18": { upper: 18, lower: 0 }, "18-30": { upper: 21, lower: 0 }, "30-50": { upper: 25, lower: 0 }, "50-80": { upper: 30, lower: 0 }, "80-120": { upper: 35, lower: 0 }, "120-180": { upper: 40, lower: 0 }, "180-250": { upper: 46, lower: 0 }, "250-315": { upper: 52, lower: 0 }, "315-400": { upper: 57, lower: 0 }, "400-500": { upper: 63, lower: 0 } },
  H8: { "0-3": { upper: 14, lower: 0 }, "3-6": { upper: 18, lower: 0 }, "6-10": { upper: 22, lower: 0 }, "10-18": { upper: 27, lower: 0 }, "18-30": { upper: 33, lower: 0 }, "30-50": { upper: 39, lower: 0 }, "50-80": { upper: 46, lower: 0 }, "80-120": { upper: 54, lower: 0 }, "120-180": { upper: 63, lower: 0 }, "180-250": { upper: 72, lower: 0 }, "250-315": { upper: 81, lower: 0 }, "315-400": { upper: 89, lower: 0 }, "400-500": { upper: 97, lower: 0 } },
  H9: { "0-3": { upper: 25, lower: 0 }, "3-6": { upper: 30, lower: 0 }, "6-10": { upper: 36, lower: 0 }, "10-18": { upper: 43, lower: 0 }, "18-30": { upper: 52, lower: 0 }, "30-50": { upper: 62, lower: 0 }, "50-80": { upper: 74, lower: 0 }, "80-120": { upper: 87, lower: 0 }, "120-180": { upper: 100, lower: 0 }, "180-250": { upper: 115, lower: 0 }, "250-315": { upper: 130, lower: 0 }, "315-400": { upper: 140, lower: 0 }, "400-500": { upper: 155, lower: 0 } },
  // 轴公差 — 间隙配合
  g6: { "0-3": { upper: -2, lower: -8 }, "3-6": { upper: -4, lower: -12 }, "6-10": { upper: -5, lower: -14 }, "10-18": { upper: -6, lower: -17 }, "18-30": { upper: -7, lower: -20 }, "30-50": { upper: -9, lower: -25 }, "50-80": { upper: -10, lower: -29 }, "80-120": { upper: -12, lower: -34 }, "120-180": { upper: -14, lower: -39 }, "180-250": { upper: -15, lower: -44 }, "250-315": { upper: -17, lower: -49 }, "315-400": { upper: -18, lower: -54 }, "400-500": { upper: -20, lower: -60 } },
  f7: { "0-3": { upper: -6, lower: -16 }, "3-6": { upper: -10, lower: -22 }, "6-10": { upper: -13, lower: -28 }, "10-18": { upper: -16, lower: -34 }, "18-30": { upper: -20, lower: -41 }, "30-50": { upper: -25, lower: -50 }, "50-80": { upper: -30, lower: -60 }, "80-120": { upper: -36, lower: -71 }, "120-180": { upper: -43, lower: -83 }, "180-250": { upper: -50, lower: -96 }, "250-315": { upper: -56, lower: -108 }, "315-400": { upper: -62, lower: -119 }, "400-500": { upper: -68, lower: -131 } },
  // 过渡配合
  k6: { "0-3": { upper: 6, lower: 0 }, "3-6": { upper: 9, lower: 1 }, "6-10": { upper: 10, lower: 1 }, "10-18": { upper: 12, lower: 1 }, "18-30": { upper: 15, lower: 2 }, "30-50": { upper: 18, lower: 2 }, "50-80": { upper: 21, lower: 2 }, "80-120": { upper: 25, lower: 3 }, "120-180": { upper: 28, lower: 3 }, "180-250": { upper: 33, lower: 4 }, "250-315": { upper: 36, lower: 4 }, "315-400": { upper: 40, lower: 4 }, "400-500": { upper: 45, lower: 5 } },
  // 过盈配合
  n6: { "0-3": { upper: 8, lower: 4 }, "3-6": { upper: 12, lower: 8 }, "6-10": { upper: 14, lower: 10 }, "10-18": { upper: 17, lower: 12 }, "18-30": { upper: 21, lower: 15 }, "30-50": { upper: 25, lower: 17 }, "50-80": { upper: 30, lower: 20 }, "80-120": { upper: 35, lower: 23 }, "120-180": { upper: 40, lower: 27 }, "180-250": { upper: 46, lower: 31 }, "250-315": { upper: 52, lower: 36 }, "315-400": { upper: 57, lower: 39 }, "400-500": { upper: 63, lower: 43 } },
  p6: { "0-3": { upper: 10, lower: 6 }, "3-6": { upper: 16, lower: 12 }, "6-10": { upper: 19, lower: 15 }, "10-18": { upper: 23, lower: 18 }, "18-30": { upper: 28, lower: 22 }, "30-50": { upper: 33, lower: 26 }, "50-80": { upper: 39, lower: 32 }, "80-120": { upper: 45, lower: 37 }, "120-180": { upper: 52, lower: 43 }, "180-250": { upper: 60, lower: 50 }, "250-315": { upper: 66, lower: 56 }, "315-400": { upper: 73, lower: 62 }, "400-500": { upper: 80, lower: 68 } },
};

const SIZE_RANGES = ["0-3", "3-6", "6-10", "10-18", "18-30", "30-50", "50-80", "80-120", "120-180", "180-250", "250-315", "315-400", "400-500"] as const;

function getSizeRange(size: number): string | null {
  for (const range of SIZE_RANGES) {
    const [min, max] = range.split("-").map(Number);
    if (size > min && size <= max) return range;
  }
  return null;
}

const FIT_OPTIONS = ["H7/g6", "H7/h6", "H7/k6", "H7/n6", "H7/p6", "H8/f7", "H9/f7"] as const;

export function ToleranceQuery() {
  const [size, setSize] = useState("");
  const [fit, setFit] = useState<string>("H7/g6");
  const [result, setResult] = useState<{
    holeUpper: number; holeLower: number;
    shaftUpper: number; shaftLower: number;
    maxClearance: number; minClearance: number;
    fitType: string;
  } | null>(null);

  const query = () => {
    const s = parseFloat(size);
    if (isNaN(s) || s <= 0 || s > 500) {
      return;
    }
    const range = getSizeRange(s);
    if (!range) return;

    const [holeCode, shaftCode] = fit.split("/");
    const hole = TOLERANCE_TABLE[holeCode]?.[range];
    const shaft = TOLERANCE_TABLE[shaftCode]?.[range];
    if (!hole || !shaft) return;

    const maxClearance = hole.upper - shaft.lower;
    const minClearance = hole.lower - shaft.upper;

    let fitType = "间隙配合";
    if (minClearance > 0) fitType = "间隙配合";
    else if (maxClearance < 0) fitType = "过盈配合";
    else fitType = "过渡配合";

    setResult({
      holeUpper: hole.upper, holeLower: hole.lower,
      shaftUpper: shaft.upper, shaftLower: shaft.lower,
      maxClearance, minClearance, fitType,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-zinc-500">基本尺寸 (mm)</label>
          <input
            type="number"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="如 25"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-zinc-500">配合代号</label>
          <select
            value={fit}
            onChange={(e) => setFit(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none"
          >
            {FIT_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <button
          onClick={query}
          className="self-end rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2 text-sm font-medium text-white hover:shadow-md"
        >
          查询
        </button>
      </div>

      {result && (
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">
              {fit}
            </span>
            <span className="text-xs text-zinc-500">基本尺寸 {size} mm</span>
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              {result.fitType}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-brand-50/50 p-3 dark:bg-brand-50/5">
              <p className="mb-1 text-xs font-medium text-brand-600">孔 ({fit.split("/")[0]})</p>
              <p>上偏差: <span className="font-mono font-medium">{result.holeUpper > 0 ? "+" : ""}{result.holeUpper} μm</span></p>
              <p>下偏差: <span className="font-mono font-medium">{result.holeLower > 0 ? "+" : ""}{result.holeLower} μm</span></p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <p className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">轴 ({fit.split("/")[1]})</p>
              <p>上偏差: <span className="font-mono font-medium">{result.shaftUpper > 0 ? "+" : ""}{result.shaftUpper} μm</span></p>
              <p>下偏差: <span className="font-mono font-medium">{result.shaftLower > 0 ? "+" : ""}{result.shaftLower} μm</span></p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-border p-3 text-sm">
            <p>最大间隙/过盈: <span className="font-mono font-medium">{result.maxClearance > 0 ? "+" : ""}{result.maxClearance} μm</span></p>
            <p>最小间隙/过盈: <span className="font-mono font-medium">{result.minClearance > 0 ? "+" : ""}{result.minClearance} μm</span></p>
          </div>
          <p className="mt-2 text-xs text-zinc-400">* 数据基于 GB/T 1800.1，仅供参考</p>
        </div>
      )}
    </div>
  );
}
