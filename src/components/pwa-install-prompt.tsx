"use client";

import { useState, useEffect, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    setIsIOS(isIOSDevice);

    // Check if previously dismissed (remember for 7 days)
    const dismissedAt = localStorage.getItem("pwa-dismissed");
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    // Listen for beforeinstallprompt (Chrome/Edge Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after a short delay to not be intrusive
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // For browsers that don't fire beforeinstallprompt (most non-Chrome),
    // show iOS-style instructions after a delay
    if (isIOSDevice) {
      const timer = setTimeout(() => setShowBanner(true), 5000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    dismissedRef.current = true;
    setShowBanner(false);
    localStorage.setItem("pwa-dismissed", String(Date.now()));
  };

  if (isStandalone || !showBanner) return null;

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
            <p className="text-sm font-semibold text-foreground">安装 MindSnap</p>
            <p className="mt-1 text-xs text-muted">
              {isIOS
                ? '点击 Safari 底部的 "分享" 按钮，然后选择 "添加到主屏幕"'
                : "将 MindSnap 安装到手机，随时快速记录想法"}
            </p>
            {!isIOS && deferredPrompt && (
              <button
                onClick={handleInstall}
                className="mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/15 transition-all hover:shadow-lg active:scale-[0.99]"
              >
                安装应用
              </button>
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

        {isIOS && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
            <svg className="h-5 w-5 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-xs text-muted">
              在 Safari 中打开此页面 → 点击底部 <span className="inline-block">⬆️</span> 分享按钮 → 向下滚动 → "添加到主屏幕"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
