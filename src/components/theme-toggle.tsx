"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-full" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition-all duration-300 hover:scale-110 hover:bg-black/5 dark:hover:bg-white/10"
      title="切换主题"
    >
      <span className="transition-transform duration-500 dark:rotate-180">
        {theme === "dark" ? "☀️" : "🌙"}
      </span>
    </button>
  );
}
