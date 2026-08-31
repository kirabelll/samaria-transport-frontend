import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeSwitch() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring"
        title="Toggle theme"
        aria-label="Toggle theme"
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="w-4 h-4 text-blue-400" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-popover text-popover-foreground rounded-xl border border-border shadow-dropdown py-1.5 z-50 animate-slideDown">
          <button
            onClick={() => { setTheme('light'); setOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-accent transition-colors ${
              theme === 'light' ? 'text-primary font-semibold' : 'text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light</span>
            </div>
            {theme === 'light' && <Check className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => { setTheme('dark'); setOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-accent transition-colors ${
              theme === 'dark' ? 'text-primary font-semibold' : 'text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-blue-400" />
              <span>Dark</span>
            </div>
            {theme === 'dark' && <Check className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => { setTheme('system'); setOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-accent transition-colors ${
              theme === 'system' ? 'text-primary font-semibold' : 'text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-muted-foreground" />
              <span>System</span>
            </div>
            {theme === 'system' && <Check className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
