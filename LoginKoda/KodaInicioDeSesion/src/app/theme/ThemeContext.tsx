import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'kuota_theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* localStorage bloqueado: usamos el valor por defecto */
  }
  return 'dark';
}

function applyThemeClass(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 300);
  }
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0F172A' : '#F4F6FA');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    applyThemeClass(theme, false);
    // Solo la primera vez: sin animación
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyThemeClass(t, true);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* sin persistencia, no pasa nada */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}

/** Botón redondo para cambiar entre tema claro y oscuro. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className={`p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors ${className}`}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

/** Interruptor con texto, para menús laterales y configuración. */
export function ThemeSwitchRow() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-kbg/60 border border-slate-800">
      <div className="flex items-center gap-3">
        <div className="bg-kbg p-2.5 rounded-xl">
          {theme === 'dark' ? <Moon className="w-5 h-5 text-slate-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
        </div>
        <span className="font-medium text-slate-300">Tema</span>
      </div>
      <div className="flex bg-kbg border border-slate-700 rounded-xl p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${theme === 'light' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Claro
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Oscuro
        </button>
      </div>
    </div>
  );
}
