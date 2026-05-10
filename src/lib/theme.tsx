import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const ThemeContext = createContext<{ theme: "light" | "dark" }>({ theme: "light" });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const [theme, setTheme] = useState<"light" | "dark">(mq.matches ? "dark" : "light");

  useEffect(() => {
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
