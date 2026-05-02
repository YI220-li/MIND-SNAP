"use client";

import { useState } from "react";

// 平键数据 GB/T 1095 (简化)
const KEY_DATA: Record<string, { b: number; h: number; t1: number; t2: number }> = {
  "6-8": { b: 2, h: 2, t1: 1.2, t2: 1.0 },
  "8-10": { b: 3, h: 3, t1: 1.8, t2: 1.4 },
  "10-12": { b: 4, h: 4, t1: 2.5, t2: 1.8 },
  "12-17": { b: 5, h: 5, t1: 3.0, t2: 2.3 },
  "17-22": { b: 6, h: 6, t1: 3.5, t2: 2.8 },
  "22-30": { b: 8, h: 7, t1: 4.0, t2: 3.3 },
  "30-38": { b: 10, h: 8, t1: 5.0, t2: 3.3 },
  "38-44": { b: 12, h: 8, t1: 5.0, t2: 3.3 },
  "44-50": { b: 14, h: 9, t1: 5.5, t2: 3.8 },
  "50-58": { b: 16, h: 10, t1: 6.0, t2: 4.3 },
  "58-65": { b: 18, h: 11, t1: 7.0, t2: 4.4 },
  "65-75": { b: 20, h: 12, t1: 7.5, t2: 4.9 },
};

// 粗牙螺纹底孔
const TAP_DRILL: Record<string, { pitch: number; drill: number }> = {
  M3: { pitch: 0.5, drill: 2.5 },
  M4: { pitch: 0.7, drill: 3.3 },
  M5: { pitch: 0.8, drill: 4.2 },
  M6: { pitch: 1.0, drill: 5.0 },
  M8: { pitch: 1.25, drill: 6.8 },
  M10: { pitch: 1.5, drill: 8.5 },
  M12: { pitch: 1.75, drill: 10.2 },
  M14: { pitch: 2.0, drill: 12.0 },
  M16: { pitch: 2.0, drill: 14.0 },
  M18: { pitch: 2.5, drill: 15.5 },
  M20: { pitch: 2.5, drill: 17.5 },
  M22: { pitch: 2.5, drill: 19.5 },
  M24: { pitch: 3.0, drill: 21.0 },
  M27: { pitch: 3.0, drill: 24.0 },
  M30: { pitch: 3.5, drill: 26.5 },
};

const BOLT_GRADES = [
  { grade: "4.8", material: "低碳钢", tensile: 400, yield: 320 },
  { grade: "5.8", material: "低碳钢", tensile: 500, yield: 400 },
  { grade: "8.8", material: "中碳钢(调质)", tensile: 800, yield: 640 },
  { grade: "9.8", material: "中碳钢(调质)", tensile: 900, yield: 720 },
  { grade: "10.9", material: "合金钢(调质)", tensile: 1040, yield: 940 },
  { grade: "12.9", material: "合金钢(调质)", tensile: 1220, yield: 1100 },
];

type Tab = "key" | "tap" | "bolt";

export function StandardParts() {
  const [tab, setTab] = useState<Tab>("key");
  const [shaftDia, setShaftDia] = useState("");
  const [selectedThread, setSelectedThread] = useState("M10");

  const tabClass = (t: Tab) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
      tab === t
        ? "bg-brand-50 text-brand-600 dark:bg-brand-50/10"
        : "text-zinc-500 hover:text-foreground"
    }`;

  const getKeyResult = () => {
    const d = parseFloat(shaftDia);
    if (isNaN(d) || d <= 0) return null;
    const range = Object.keys(KEY_DATA).find((r) => {
      const [min, max] = r.split("-").map(Number);
      return d > min && d <= max;
    });
    return range ? { range, ...KEY_DATA[range] } : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        <button onClick={() => setTab("key")} className={tabClass("key")}>平键</button>
        <button onClick={() => setTab("tap")} className={tabClass("tap")}>螺纹底孔</button>
        <button onClick={() => setTab("bolt")} className={tabClass("bolt")}>螺栓等级</button>
      </div>

      {tab === "key" && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">轴径 (mm)</label>
            <input
              type="number"
              value={shaftDia}
              onChange={(e) => setShaftDia(e.target.value)}
              placeholder="如 30"
              className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {getKeyResult() && (
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[
                { label: "键宽 b", value: `${getKeyResult()!.b} mm` },
                { label: "键高 h", value: `${getKeyResult()!.h} mm` },
                { label: "轴槽深 t1", value: `${getKeyResult()!.t1} mm` },
                { label: "毂槽深 t2", value: `${getKeyResult()!.t2} mm` },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                  <p className="text-xs text-zinc-500">{item.label}</p>
                  <p className="font-mono font-semibold text-brand-600">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "tap" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-zinc-500">
                <th className="pb-2 pr-4">螺纹规格</th>
                <th className="pb-2 pr-4">螺距 (mm)</th>
                <th className="pb-2">底孔直径 (mm)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(TAP_DRILL).map(([spec, data]) => (
                <tr
                  key={spec}
                  className={`cursor-pointer border-b border-border/50 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                    selectedThread === spec ? "bg-brand-50/50 dark:bg-brand-50/5" : ""
                  }`}
                  onClick={() => setSelectedThread(spec)}
                >
                  <td className="py-2 pr-4 font-medium">{spec}</td>
                  <td className="py-2 pr-4 font-mono">{data.pitch}</td>
                  <td className="py-2 font-mono font-semibold text-brand-600">{data.drill}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "bolt" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-zinc-500">
                <th className="pb-2 pr-4">强度等级</th>
                <th className="pb-2 pr-4">材料</th>
                <th className="pb-2 pr-4">抗拉强度 (MPa)</th>
                <th className="pb-2">屈服强度 (MPa)</th>
              </tr>
            </thead>
            <tbody>
              {BOLT_GRADES.map((g) => (
                <tr key={g.grade} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-semibold">{g.grade}</td>
                  <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{g.material}</td>
                  <td className="py-2 pr-4 font-mono">{g.tensile}</td>
                  <td className="py-2 font-mono">{g.yield}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
