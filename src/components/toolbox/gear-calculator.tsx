"use client";

import { useState } from "react";

export function GearCalculator() {
  const [mod, setMod] = useState("");
  const [z, setZ] = useState("");
  const [alpha, setAlpha] = useState("20");

  const m = parseFloat(mod) || 0;
  const teeth = parseFloat(z) || 0;
  const a = (parseFloat(alpha) || 20) * Math.PI / 180;

  const d = m * teeth;                    // 分度圆直径
  const da = m * (teeth + 2);             // 齿顶圆直径
  const df = m * (teeth - 2.5);           // 齿根圆直径
  const p = Math.PI * m;                  // 齿距
  const s = Math.PI * m / 2;              // 齿厚
  const ha = m;                           // 齿顶高
  const hf = 1.25 * m;                    // 齿根高
  const h = ha + hf;                      // 全齿高

  const hasResult = m > 0 && teeth > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">模数 m (mm)</label>
          <input
            type="number"
            value={mod}
            onChange={(e) => setMod(e.target.value)}
            placeholder="如 2"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">齿数 z</label>
          <input
            type="number"
            value={z}
            onChange={(e) => setZ(e.target.value)}
            placeholder="如 20"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">压力角 α (°)</label>
          <input
            type="number"
            value={alpha}
            onChange={(e) => setAlpha(e.target.value)}
            placeholder="20"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {hasResult && (
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-3 text-xs text-zinc-500">
            m={m}, z={teeth}, α={alpha}°
          </div>
          <div className="space-y-2 text-sm">
            {[
              { name: "分度圆直径 d", formula: "d = m × z", value: d },
              { name: "齿顶圆直径 da", formula: "da = m × (z + 2)", value: da },
              { name: "齿根圆直径 df", formula: "df = m × (z - 2.5)", value: df },
              { name: "齿距 p", formula: "p = π × m", value: p },
              { name: "齿厚 s", formula: "s = π × m / 2", value: s },
              { name: "齿顶高 ha", formula: "ha = m", value: ha },
              { name: "齿根高 hf", formula: "hf = 1.25 × m", value: hf },
              { name: "全齿高 h", formula: "h = ha + hf = 2.25 × m", value: h },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                <div>
                  <span className="font-medium text-foreground">{item.name}</span>
                  <span className="ml-2 text-xs text-zinc-400">({item.formula})</span>
                </div>
                <span className="font-mono font-semibold text-brand-600">{item.value.toFixed(3)} mm</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
