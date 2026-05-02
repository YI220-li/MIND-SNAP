"use client";

import { useState } from "react";

/* ===== 模型定义 ===== */

type ParamDef = {
  key: string;
  label: string;
  unit: string;
  default: string;
};

type DetailRow = { label: string; value: string };

type ModelDef = {
  id: string;
  label: string;
  icon: string;
  params: ParamDef[];
  compute: (v: Record<string, number>) => { kt: number; details: DetailRow[] } | null;
  renderSvg: (v: Record<string, number>, r: { kt: number }) => React.ReactNode;
};

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

/* ===== 1. 带孔板拉伸 ===== */

const holePlateModel: ModelDef = {
  id: "hole-plate",
  label: "带孔板拉伸",
  icon: "⬜",
  params: [
    { key: "W", label: "板宽 W", unit: "mm", default: "100" },
    { key: "d", label: "孔径 d", unit: "mm", default: "20" },
    { key: "sigma0", label: "名义应力 σ₀", unit: "MPa", default: "10" },
  ],
  compute(v) {
    const { W, d, sigma0 } = v;
    if (W <= 0 || d <= 0 || d >= W || sigma0 <= 0) return null;
    const ratio = d / W;
    const kt = 3 - 3.14 * ratio + 3.67 * ratio * ratio - 1.53 * ratio * ratio * ratio;
    const sigmaMax = kt * sigma0;
    return {
      kt,
      details: [
        { label: "d/W 比值", value: ratio.toFixed(4) },
        { label: "应力集中系数 Kt", value: kt.toFixed(3) },
        { label: "名义应力 σ₀", value: `${sigma0} MPa` },
        { label: "最大应力 σ_max", value: `${sigmaMax.toFixed(2)} MPa` },
      ],
    };
  },
  renderSvg(v, r) {
    const { W, d } = v;
    if (W <= 0 || d <= 0 || d >= W) return null;
    const scale = 200 / W;
    const pw = W * scale;
    const ph = pw * 0.6;
    const cx = pw / 2;
    const cy = ph / 2;
    const radius = (d * scale) / 2;
    return (
      <svg viewBox={`-20 -10 ${pw + 40} ${ph + 50}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* 板 */}
        <rect x={0} y={0} width={pw} height={ph} fill="none" stroke="currentColor" strokeWidth={2} className="text-foreground" />
        {/* 孔 */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="4 2" className="text-brand-500" />
        {/* 拉伸箭头 - 左 */}
        <line x1={-15} y1={ph * 0.3} x2={-1} y2={ph * 0.3} stroke="currentColor" strokeWidth={2} className="text-red-500" markerEnd="url(#arrowR)" />
        <line x1={-15} y1={ph * 0.7} x2={-1} y2={ph * 0.7} stroke="currentColor" strokeWidth={2} className="text-red-500" markerEnd="url(#arrowR)" />
        {/* 拉伸箭头 - 右 */}
        <line x1={pw + 1} y1={ph * 0.3} x2={pw + 15} y2={ph * 0.3} stroke="currentColor" strokeWidth={2} className="text-red-500" markerEnd="url(#arrowR)" />
        <line x1={pw + 1} y1={ph * 0.7} x2={pw + 15} y2={ph * 0.7} stroke="currentColor" strokeWidth={2} className="text-red-500" markerEnd="url(#arrowR)" />
        {/* 标注 */}
        <text x={cx} y={ph + 15} textAnchor="middle" className="fill-zinc-500 text-xs">W = {W}mm</text>
        <line x1={cx - radius} y1={cy} x2={cx + radius} y2={cy} stroke="currentColor" strokeWidth={1} className="text-zinc-400" strokeDasharray="3 2" />
        <text x={cx} y={cy - radius - 5} textAnchor="middle" className="fill-brand-600 text-xs font-medium">d = {d}mm</text>
        {/* Kt 标注 */}
        <text x={cx} y={ph + 30} textAnchor="middle" className="fill-brand-600 text-xs font-semibold">Kt = {r.kt.toFixed(2)}</text>
        <defs>
          <marker id="arrowR" markerWidth={8} markerHeight={8} refX={8} refY={4} orient="auto">
            <path d="M0,0 L8,4 L0,8" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-red-500" />
          </marker>
        </defs>
      </svg>
    );
  },
};

/* ===== 2. 阶梯轴圆角 ===== */

const steppedShaftModel: ModelDef = {
  id: "stepped-shaft",
  label: "阶梯轴圆角",
  icon: "🔩",
  params: [
    { key: "D", label: "大径 D", unit: "mm", default: "60" },
    { key: "d", label: "小径 d", unit: "mm", default: "40" },
    { key: "r", label: "圆角半径 r", unit: "mm", default: "4" },
    { key: "loadType", label: "载荷(1弯曲 2扭转)", unit: "", default: "1" },
  ],
  compute(v) {
    const { D, d, r, loadType } = v;
    if (D <= d || d <= 0 || r <= 0) return null;
    const Dratio = D / d;
    const rRatio = r / d;
    const a = Dratio - 1;
    // Peterson 曲线多项式拟合
    const C1 = loadType === 1
      ? 0.927 + 1.149 * a - 0.533 * a * a
      : 0.863 + 1.328 * a - 0.667 * a * a;
    const n1 = loadType === 1 ? 0.286 : 0.235;
    const kt = C1 * Math.pow(rRatio, -n1);
    return {
      kt,
      details: [
        { label: "D/d 比值", value: Dratio.toFixed(3) },
        { label: "r/d 比值", value: rRatio.toFixed(3) },
        { label: "载荷类型", value: loadType === 1 ? "弯曲" : "扭转" },
        { label: "应力集中系数 Kt", value: kt.toFixed(3) },
      ],
    };
  },
  renderSvg(v) {
    const { D, d, r } = v;
    if (D <= d || d <= 0 || r <= 0) return null;
    const scale = 160 / D;
    const bigR = (D * scale) / 2;
    const smallR = (d * scale) / 2;
    const filletR = r * scale;
    const shaftLen = 80;
    const totalW = shaftLen * 2 + 30;
    const totalH = D * scale + 30;
    const mid = totalW / 2;
    return (
      <svg viewBox={`-10 -15 ${totalW + 20} ${totalH + 30}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* 轴轮廓 - 上半 */}
        <path
          d={`M${mid - shaftLen},${15} L${mid - filletR * 0.3},${15}
              Q${mid},${15} ${mid + filletR * 0.7},${15 + bigR - smallR - filletR * 0.3}
              L${mid + shaftLen},${15 + bigR - smallR}`}
          fill="none" stroke="currentColor" strokeWidth={2} className="text-foreground"
        />
        {/* 轴轮廓 - 下半 */}
        <path
          d={`M${mid - shaftLen},${totalH - 15} L${mid - filletR * 0.3},${totalH - 15}
              Q${mid},${totalH - 15} ${mid + filletR * 0.7},${totalH - 15 - bigR + smallR + filletR * 0.3}
              L${mid + shaftLen},${totalH - 15 - bigR + smallR}`}
          fill="none" stroke="currentColor" strokeWidth={2} className="text-foreground"
        />
        {/* 中心线 */}
        <line x1={mid - shaftLen - 5} y1={totalH / 2} x2={mid + shaftLen + 5} y2={totalH / 2} stroke="currentColor" strokeWidth={0.5} strokeDasharray="4 3" className="text-zinc-400" />
        {/* D 标注 */}
        <line x1={mid - shaftLen - 5} y1={15} x2={mid - shaftLen - 5} y2={totalH - 15} stroke="currentColor" strokeWidth={1} className="text-blue-500" />
        <text x={mid - shaftLen - 8} y={totalH / 2} textAnchor="end" dominantBaseline="middle" className="fill-blue-500 text-xs">D={D}</text>
        {/* d 标注 */}
        <line x1={mid + shaftLen + 5} y1={15 + bigR - smallR} x2={mid + shaftLen + 5} y2={totalH - 15 - bigR + smallR} stroke="currentColor" strokeWidth={1} className="text-brand-500" />
        <text x={mid + shaftLen + 8} y={totalH / 2} textAnchor="start" dominantBaseline="middle" className="fill-brand-500 text-xs">d={d}</text>
        {/* r 标注 */}
        <text x={mid + 2} y={15 + bigR - smallR / 2} className="fill-red-500 text-xs font-medium">r={r}</text>
      </svg>
    );
  },
};

/* ===== 3. 厚壁圆筒 (Lamé) ===== */

const thickCylinderModel: ModelDef = {
  id: "thick-cylinder",
  label: "厚壁圆筒",
  icon: "⭕",
  params: [
    { key: "a", label: "内半径 a", unit: "mm", default: "50" },
    { key: "b", label: "外半径 b", unit: "mm", default: "80" },
    { key: "Pi", label: "内压 Pi", unit: "MPa", default: "100" },
    { key: "Po", label: "外压 Po", unit: "MPa", default: "0" },
  ],
  compute(v) {
    const { a, b, Pi, Po } = v;
    if (a <= 0 || b <= a) return null;
    const a2 = a * a;
    const b2 = b * b;
    const denom = b2 - a2;
    // 内壁环向应力
    const sigmaThetaA = (Pi * a2 - Po * b2) / denom + (Pi - Po) * b2 / denom;
    // 外壁环向应力
    const sigmaThetaB = (Pi * a2 - Po * b2) / denom + (Pi - Po) * a2 / denom;
    // 内壁径向应力 = -Pi
    const sigmaRA = -Pi;
    // 外壁径向应力 = -Po
    const sigmaRB = -Po;
    // 最大剪应力
    const tauMax = (sigmaThetaA - sigmaRA) / 2;
    return {
      kt: sigmaThetaA / (Pi || 1),
      details: [
        { label: "内壁环向应力 σ_θ(a)", value: `${sigmaThetaA.toFixed(2)} MPa` },
        { label: "外壁环向应力 σ_θ(b)", value: `${sigmaThetaB.toFixed(2)} MPa` },
        { label: "内壁径向应力 σ_r(a)", value: `${sigmaRA.toFixed(2)} MPa` },
        { label: "外壁径向应力 σ_r(b)", value: `${sigmaRB.toFixed(2)} MPa` },
        { label: "最大剪应力 τ_max", value: `${tauMax.toFixed(2)} MPa` },
        { label: "径比 b/a", value: (b / a).toFixed(3) },
      ],
    };
  },
  renderSvg(v) {
    const { a, b } = v;
    if (a <= 0 || b <= a) return null;
    const scale = 140 / b;
    const outerR = b * scale;
    const innerR = a * scale;
    const cx = 90;
    const cy = 90;
    return (
      <svg viewBox="0 0 180 200" className="w-full" style={{ maxHeight: 220 }}>
        {/* 外圆 */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="currentColor" strokeWidth={2} className="text-foreground" />
        {/* 内圆 */}
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="currentColor" strokeWidth={2} className="text-brand-500" />
        {/* 填充环区域 */}
        <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke="currentColor" strokeWidth={outerR - innerR} strokeOpacity={0.06} className="text-brand-500" />
        {/* 内压箭头 - 指向壁面 */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = cx + (innerR * 0.5) * Math.cos(rad);
          const y1 = cy + (innerR * 0.5) * Math.sin(rad);
          const x2 = cx + (innerR - 3) * Math.cos(rad);
          const y2 = cy + (innerR - 3) * Math.sin(rad);
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={1.5} className="text-red-400" markerEnd="url(#arrowIn)" />;
        })}
        {/* 标注 */}
        <line x1={cx} y1={cy} x2={cx + outerR} y2={cy} stroke="currentColor" strokeWidth={1} strokeDasharray="3 2" className="text-zinc-400" />
        <text x={cx + outerR + 4} y={cy - 4} className="fill-zinc-500 text-xs">b={b}</text>
        <text x={cx + innerR / 2 + 3} y={cy - 4} className="fill-brand-600 text-xs">a={a}</text>
        <text x={cx} y={cy + outerR + 18} textAnchor="middle" className="fill-red-500 text-xs font-medium">Pi</text>
        <defs>
          <marker id="arrowIn" markerWidth={6} markerHeight={6} refX={6} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-red-400" />
          </marker>
        </defs>
      </svg>
    );
  },
};

/* ===== 4. 轴上键槽 ===== */

const keywayModel: ModelDef = {
  id: "keyway",
  label: "轴上键槽",
  icon: "🔧",
  params: [
    { key: "d", label: "轴径 d", unit: "mm", default: "50" },
    { key: "w", label: "键槽宽 w", unit: "mm", default: "14" },
    { key: "t", label: "键槽深 t", unit: "mm", default: "5.5" },
    { key: "T", label: "扭矩 T", unit: "N·mm", default: "50000" },
  ],
  compute(v) {
    const { d, w, t, T } = v;
    if (d <= 0 || w <= 0 || w >= d || T <= 0) return null;
    const wdRatio = w / d;
    const kt = 1.0 + 0.2 * wdRatio + 3.0 * wdRatio * wdRatio;
    const tauNom = (16 * T) / (Math.PI * Math.pow(d, 3));
    const tauMax = kt * tauNom;
    return {
      kt,
      details: [
        { label: "w/d 比值", value: wdRatio.toFixed(4) },
        { label: "应力集中系数 Kt", value: kt.toFixed(3) },
        { label: "名义剪应力 τ_nom", value: `${tauNom.toFixed(2)} MPa` },
        { label: "最大剪应力 τ_max", value: `${tauMax.toFixed(2)} MPa` },
      ],
    };
  },
  renderSvg(v) {
    const { d, w, t } = v;
    if (d <= 0 || w <= 0 || w >= d) return null;
    const scale = 150 / d;
    const r = (d * scale) / 2;
    const kwW = w * scale;
    const kwD = t * scale;
    const cx = 100;
    const cy = 100;
    return (
      <svg viewBox="0 0 200 220" className="w-full" style={{ maxHeight: 220 }}>
        {/* 轴截面圆 */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={2} className="text-foreground" />
        {/* 键槽 */}
        <rect
          x={cx - kwW / 2}
          y={cy - r}
          width={kwW}
          height={kwD}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-red-500"
        />
        {/* 中心线 */}
        <line x1={cx - r - 10} y1={cy} x2={cx + r + 10} y2={cy} stroke="currentColor" strokeWidth={0.5} strokeDasharray="4 3" className="text-zinc-400" />
        <line x1={cx} y1={cy - r - 10} x2={cx} y2={cy + r + 10} stroke="currentColor" strokeWidth={0.5} strokeDasharray="4 3" className="text-zinc-400" />
        {/* 扭转箭头 */}
        <path d={`M${cx + r * 0.7},${cy - r * 0.7} A${r * 0.8},${r * 0.8} 0 0,1 ${cx + r * 0.95},${cy}`} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-green-500" markerEnd="url(#arrowT)" />
        <path d={`M${cx - r * 0.7},${cy + r * 0.7} A${r * 0.8},${r * 0.8} 0 0,1 ${cx - r * 0.95},${cy}`} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-green-500" markerEnd="url(#arrowT)" />
        {/* 标注 */}
        <text x={cx} y={cy - r - 8} textAnchor="middle" className="fill-zinc-500 text-xs">d = {d}mm</text>
        <text x={cx - kwW / 2 - 5} y={cy - r + kwD / 2} textAnchor="end" dominantBaseline="middle" className="fill-red-500 text-xs">w={w}</text>
        <text x={cx + kwW / 2 + 5} y={cy - r + kwD / 2} textAnchor="start" dominantBaseline="middle" className="fill-red-500 text-xs">t={t}</text>
        <defs>
          <marker id="arrowT" markerWidth={6} markerHeight={6} refX={6} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke="currentColor" strokeWidth={1.2} className="text-green-500" />
          </marker>
        </defs>
      </svg>
    );
  },
};

/* ===== 5. V 型缺口板拉伸 ===== */

const vNotchModel: ModelDef = {
  id: "v-notch",
  label: "V 型缺口",
  icon: "📐",
  params: [
    { key: "W", label: "板宽 W", unit: "mm", default: "100" },
    { key: "a", label: "缺口深度 a", unit: "mm", default: "15" },
    { key: "theta", label: "缺口角度 θ", unit: "°", default: "60" },
    { key: "rho", label: "根部半径 ρ", unit: "mm", default: "2" },
  ],
  compute(v) {
    const { W, a, theta, rho } = v;
    if (W <= 0 || a <= 0 || a >= W / 2 || rho <= 0 || theta <= 0 || theta >= 180) return null;
    // Inglis 深窄缺口近似
    const ktInglis = 1 + 2 * Math.sqrt(a / rho);
    // Neuber 角度修正: f(θ) = 1 + 2*sin(θ/2) 退化为常数近似
    // 更准确: 对于 V 形缺口, 角度修正系数 ≈ (1 - (θ/π)^0.5 * 0.3) 的经验修正
    const thetaRad = (theta * Math.PI) / 180;
    const angleFactor = 1 + (1 - Math.sqrt(thetaRad / Math.PI)) * 0.5;
    const kt = ktInglis * angleFactor;
    return {
      kt,
      details: [
        { label: "a/ρ 比值", value: (a / rho).toFixed(3) },
        { label: "Inglis 近似 Kt₀", value: ktInglis.toFixed(3) },
        { label: "角度修正系数", value: angleFactor.toFixed(3) },
        { label: "修正后 Kt", value: kt.toFixed(3) },
      ],
    };
  },
  renderSvg(v) {
    const { W, a, theta, rho } = v;
    if (W <= 0 || a <= 0 || rho <= 0) return null;
    const scale = 200 / W;
    const pw = W * scale;
    const ph = pw * 0.5;
    const notchDepth = a * scale;
    const halfAngle = ((theta / 2) * Math.PI) / 180;
    const notchHalfW = notchDepth * Math.tan(halfAngle);
    const filletR = rho * scale;
    const cx = pw / 2;
    return (
      <svg viewBox={`-15 -10 ${pw + 30} ${ph + 40}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* 板 */}
        <path
          d={`M0,0 L${cx - notchHalfW - filletR * 0.5},0
              Q${cx - notchHalfW + filletR * 0.3},${-filletR * 0.2} ${cx},${notchDepth}
              Q${cx + notchHalfW - filletR * 0.3},${-filletR * 0.2} ${cx + notchHalfW + filletR * 0.5},0
              L${pw},0 L${pw},${ph} L0,${ph} Z`}
          fill="none" stroke="currentColor" strokeWidth={2} className="text-foreground"
        />
        {/* 缺口深度线 */}
        <line x1={cx} y1={-5} x2={cx} y2={notchDepth + 2} stroke="currentColor" strokeWidth={1} strokeDasharray="3 2" className="text-brand-500" />
        <text x={cx + 5} y={notchDepth / 2} className="fill-brand-600 text-xs">a={a}</text>
        {/* 根部半径标注 */}
        <text x={cx} y={notchDepth + 14} textAnchor="middle" className="fill-red-500 text-xs">ρ={rho}</text>
        {/* 角度标注弧 */}
        <path d={`M${cx - 15},${notchDepth + 2} A15,15 0 0,1 ${cx + 15},${notchDepth + 2}`} fill="none" stroke="currentColor" strokeWidth={1} className="text-zinc-400" />
        <text x={cx} y={notchDepth + 25} textAnchor="middle" className="fill-zinc-500 text-xs">θ={theta}°</text>
        {/* 板宽标注 */}
        <text x={pw / 2} y={ph + 15} textAnchor="middle" className="fill-zinc-500 text-xs">W = {W}mm</text>
      </svg>
    );
  },
};

/* ===== 模型列表 ===== */

const MODELS: ModelDef[] = [holePlateModel, steppedShaftModel, thickCylinderModel, keywayModel, vNotchModel];

/* ===== 主组件 ===== */

export function StressSimulator() {
  const [selected, setSelected] = useState(0);
  const [values, setValues] = useState<string[]>(MODELS[0].params.map((p) => p.default));

  const model = MODELS[selected];

  const handleSelect = (idx: number) => {
    setSelected(idx);
    setValues(MODELS[idx].params.map((p) => p.default));
  };

  const handleChange = (idx: number, val: string) => {
    const next = [...values];
    next[idx] = val;
    setValues(next);
  };

  const numValues: Record<string, number> = {};
  model.params.forEach((p, i) => {
    numValues[p.key] = parseFloat(values[i]) || 0;
  });

  const result = model.compute(numValues);

  return (
    <div className="space-y-4">
      {/* 模型选择 */}
      <div className="flex flex-wrap gap-1">
        {MODELS.map((m, i) => (
          <button
            key={m.id}
            onClick={() => handleSelect(i)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selected === i
                ? "bg-brand-50 text-brand-600 dark:bg-brand-50/10"
                : "bg-zinc-100 text-zinc-500 hover:text-foreground dark:bg-zinc-800"
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* 参数输入 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {model.params.map((p, i) => (
          <div key={p.key}>
            <label className="mb-1 block text-xs text-zinc-500">
              {p.label} {p.unit && <span className="text-zinc-400">({p.unit})</span>}
            </label>
            <input
              type="number"
              value={values[i]}
              onChange={(e) => handleChange(i, e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        ))}
      </div>

      {/* SVG 示意图 */}
      {result && (
        <div className="rounded-xl border border-border bg-background p-4 text-foreground">
          {model.renderSvg(numValues, result)}
        </div>
      )}

      {/* 结果 */}
      {result && (
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="space-y-2 text-sm">
            {result.details.map((d) => (
              <div key={d.label} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                <span className="font-medium text-foreground">{d.label}</span>
                <span className="font-mono font-semibold text-brand-600">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!result && (
        <div className="rounded-xl border border-border bg-background p-8 text-center text-sm text-zinc-400">
          请输入有效参数查看计算结果
        </div>
      )}
    </div>
  );
}
