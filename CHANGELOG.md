# MindSnap 开发日志

## 项目信息
- **技术栈**：Next.js 16 + TypeScript + Tailwind CSS v4 + Prisma v7 + PostgreSQL (Neon)
- **AI 模型**：小米 MiMo-V2.5-Pro（Anthropic 协议）
- **GitHub**：https://github.com/YI220-li/MIND-SNAP.git
- **线上地址**：https://mind-snap-neon.vercel.app

---

## Session 5：AI 聊天助手集成

### 核心问题与解决方案

| 问题 | 原因 | 修复 |
|------|------|------|
| useChat 报错 | AI SDK v6 改用 `DefaultChatTransport` | 改写传输配置 |
| 流式不响应 | `toTextStreamResponse()` 不兼容 | 换 `toUIMessageStreamResponse()` |
| MiMo 401 | MiMo 用 Anthropic 协议非 OpenAI | 安装 `@ai-sdk/anthropic` |
| MiMo Not Found | base URL 错误 | `https://token-plan-cn.xiaomimimo.com/anthropic/v1` |
| x-api-key 被拒 | MiMo 用 Bearer token | SDK 的 `authToken` 选项 |
| messages.some 报错 | UIMessage(parts) ≠ ModelMessage(content) | 手动映射转换 |

### 关键配置
```typescript
const mimo = createAnthropic({
  baseURL: "https://token-plan-cn.xiaomimimo.com/anthropic/v1",
  authToken: process.env.MIMO_API_KEY,
});
```

---

## Session 6-7：机械设计工具箱（10 个模块）

### 工具箱模块清单

| 模块 | 文件 | 功能 |
|------|------|------|
| 公差查询 | tolerance-query.tsx | GB/T 1800 基孔制/基轴制 |
| 齿轮计算 | gear-calculator.tsx | 模数、齿数、分度圆互算 |
| 标准件速查 | standard-parts.tsx | 螺栓/轴承/键标准参数 |
| 公式库 | formula-library.tsx | 常用机械公式 |
| 单位换算 | unit-converter.tsx | 力/应力/长度/功率互换 |
| 应力集中 | stress-simulator.tsx | 5 种 Peterson 模型 + SVG |
| 工艺模板 | process-template.tsx | 动态工序表 + AI 推荐 |
| 周报生成 | weekly-report.tsx | 笔记筛选 + AI 生成周报 |
| 轴系设计 | shaft-design-agent.tsx | 三步向导 + 7 项计算 |

### AI 提示词（ai-prompts.ts）
- `MECH_DESIGN_SYSTEM_PROMPT` — 主聊天（机械设计助手）
- `PROCESS_TEMPLATE_PROMPT` — 工艺路线推荐
- `WEEKLY_REPORT_PROMPT` — 周报生成（4 部分格式）

### 自定义 system 提示词
`/api/chat` 支持 `body.system` 参数，不传则用默认机械设计提示词。各工具模块通过直接 `fetch('/api/chat')` 调用 AI，互不冲突。

---

## Session 8：界面视觉升级

### 设计规范
- **主题色**：indigo-500 → violet-500 渐变
- **背景**：亮 #f8fafc / 暗 #020617
- **毛玻璃**：`bg-white/80 backdrop-blur-xl`
- **圆角**：按钮 xl/2xl，弹窗 3xl
- **阴影**：`shadow-indigo-500/5` (静态) / `/15` (悬停)
- **聚焦**：`focus:ring-4 focus:ring-indigo-500/10`

### 升级文件
`globals.css` / `page.tsx` / `chat-assistant.tsx` / `toolbox-panel.tsx` / `process-template.tsx` / `weekly-report.tsx`

---

## Session 10：PWA 修复

### 问题
手机浏览器不弹安装提示

### 解决
- manifest.json：icons 拆分 any + maskable，添加 display_override
- layout.tsx：添加 apple-touch-icon
- 新建 pwa-install-prompt.tsx：自定义安装引导（支持 Chrome Android 事件 + iOS 引导文字）

---

## 部署流程

```bash
# 构建（必须用 --webpack，next-pwa 不兼容 Turbopack）
npm run build --webpack

# 提交推送
git add -A && git commit -m "xxx" && git push origin master

# 部署到 Vercel 生产
npx vercel --prod --yes
```

---

## 关键踩坑清单

1. Prisma v7 schema 不能写 `url`，必须通过 prisma.config.ts 或 adapter
2. MiMo API 走 Anthropic 协议，不是 OpenAI
3. useChat 发 UIMessage(parts)，streamText 需要 ModelMessage(content)，必须手动转换
4. next-pwa 只在 `--webpack` 构建下工作，Turbopack 不支持
5. PWA dev 模式自动禁用，只在生产构建生效
6. Vercel 环境变量 MIMO_API_KEY 需在 Dashboard 单独配置
