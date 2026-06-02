import { useEffect } from "react";
import { THEMES, useTheme } from "@/hooks/useTheme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    THEMES.forEach((t) => root.classList.remove(`kx-theme-${t.id}`));
    root.classList.add(`kx-theme-${theme}`);
    root.dataset.theme = theme;
  }, [theme]);

  return <>{children}</>;
}
