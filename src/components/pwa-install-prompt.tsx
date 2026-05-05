"use client";

import { useState, useEffect, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [browserType, setBrowserType] = useState<"chrome" | "ios-safari" | "ios-other" | "other">("other");
  const [isStandalone, setIsStandalone] = useState(false);
  const promptReceived = useRef(false);

  useEffect(() => {
    // 已安装（standalone 模式）→ 不显示
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // 检查是否之前关闭过（7 天内不再提示）
    const dismissedAt = localStorage.getItem("pwa-dismissed");
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);

    if (isIOS) {
      const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
      setBrowserType(isSafari ? "ios-safari" : "ios-other");
      // iOS 不触发 beforeinstallprompt，直接显示引导
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);
    const isEdge = /Edg/.test(ua);
    setBrowserType(isChrome || isEdge ? "chrome" : "other");

    // 监听 beforeinstallprompt（Chrome/Edge Android）
    const handler = (e: Event) => {
      e.preventDefault();
      promptReceived.current = true;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // 5 秒后如果 beforeinstallprompt 还没触发 → 非 Chrome 浏览器，直接显示引导
    const fallbackTimer = setTimeout(() => {
      if (!promptReceived.current) {
        setBrowserType("other");
        setShowBanner(true);
      }
    }, 5000);

    return () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
    } catch {
      // 某些浏览器可能抛出异常
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-dismissed", String(Date.now()));
  };

  if (isStandalone || !showBanner) return null;

  const showInstallButton = browserType === "chrome" && deferredPrompt;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="rounded-2xl border border-white/20 bg-white/90 p-4 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/90">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/20">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">安装 MindSnap 到手机</p>
            <p className="mt-1 text-xs text-muted">
              {browserType === "chrome" && "将应用安装到手机桌面，随时快速记录想法"}
              {browserType === "ios-safari" && '点击底部"分享"按钮，选择"添加到主屏幕"'}
              {browserType === "ios-other" && "请在 Safari 浏览器中打开此页面进行安装"}
              {browserType === "other" && "将此页面添加到桌面，像 App 一样使用"}
            </p>

            {/* Chrome/Edge：系统安装按钮 */}
            {showInstallButton && (
              <button
                onClick={handleInstall}
                className="mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/15 transition-all hover:shadow-lg active:scale-[0.99]"
              >
                安装应用
              </button>
            )}

            {/* 非 Chrome Android 浏览器：通用引导 */}
            {browserType === "other" && (
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2">
                  <span className="shrink-0 text-sm">1️⃣</span>
                  <p className="text-xs text-muted">点击浏览器右上角 <strong>菜单</strong>（三个点 ⋮）</p>
                </div>
                <div className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2">
                  <span className="shrink-0 text-sm">2️⃣</span>
                  <p className="text-xs text-muted">找到 <strong>"添加到桌面"</strong> 或 <strong>"安装"</strong> 选项</p>
                </div>
                <div className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2">
                  <span className="shrink-0 text-sm">3️⃣</span>
                  <p className="text-xs text-muted">确认后 MindSnap 会出现在手机桌面</p>
                </div>
              </div>
            )}

            {/* iOS Safari：分步引导 */}
            {browserType === "ios-safari" && (
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2">
                  <span className="shrink-0 text-sm">1️⃣</span>
                  <p className="text-xs text-muted">点击屏幕底部 <strong>分享按钮</strong> <span className="inline-block">⬆️</span></p>
                </div>
                <div className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2">
                  <span className="shrink-0 text-sm">2️⃣</span>
                  <p className="text-xs text-muted">向下滚动找到 <strong>"添加到主屏幕"</strong></p>
                </div>
                <div className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2">
                  <span className="shrink-0 text-sm">3️⃣</span>
                  <p className="text-xs text-muted">点击右上角 <strong>"添加"</strong></p>
                </div>
              </div>
            )}

            {/* iOS 非 Safari：提示切换 */}
            {browserType === "ios-other" && (
              <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-500/10">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  iOS 只能通过 Safari 添加。请点击 <strong>「在 Safari 中打开」</strong> 后操作。
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
