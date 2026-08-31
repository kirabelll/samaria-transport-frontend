import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  sub?: string;
  trend?: {
    value: number | string;
    isPositive?: boolean;
  };
}

const colorStyles: Record<string, { box: string; icon: string }> = {
  blue: {
    box: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    box: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  red: {
    box: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
    icon: 'text-rose-600 dark:text-rose-400',
  },
  yellow: {
    box: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  orange: {
    box: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  purple: {
    box: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  cyan: {
    box: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400',
    icon: 'text-cyan-600 dark:text-cyan-400',
  },
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  sub,
  trend,
}: Props) {
  const currentStyle = colorStyles[color] || colorStyles.blue;

  return (
    <div className="card group hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-heading">
          {title}
        </p>
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${currentStyle.box}`}
        >
          <Icon className={`w-4 h-4 ${currentStyle.icon}`} />
        </div>
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight text-foreground font-heading">
          {value}
        </p>
        {(sub || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span
                className={`text-xs font-semibold ${
                  trend.isPositive ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}
              </span>
            )}
            {sub && (
              <p className="text-xs text-muted-foreground truncate">{sub}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}