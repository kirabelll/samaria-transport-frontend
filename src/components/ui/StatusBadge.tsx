interface Props {
  status: string;
  className?: string;
  dot?: boolean;
}

const map: Record<string, string> = {
  active: 'badge-green',
  completed: 'badge-green',
  paid: 'badge-green',
  approved: 'badge-green',
  received: 'badge-green',
  issued: 'badge-green',
  pending: 'badge-yellow',
  submitted: 'badge-yellow',
  draft: 'badge-yellow',
  upcoming: 'badge-yellow',
  open: 'badge-yellow',
  requested: 'badge-yellow',
  maintenance: 'badge-red',
  breakdown: 'badge-red',
  overdue: 'badge-red',
  rejected: 'badge-red',
  cancelled: 'badge-red',
  inactive: 'badge-gray',
  in_transit: 'badge-blue',
  dispatched: 'badge-blue',
  loading: 'badge-blue',
  in_progress: 'badge-blue',
  delivering: 'badge-blue',
  partial: 'badge-blue',
  planned: 'badge-orange',
  scheduled: 'badge-orange',
  credit: 'badge-orange',
  monthly: 'badge-blue',
  cash: 'badge-green',
};

const dotColors: Record<string, string> = {
  'badge-green': 'bg-emerald-500',
  'badge-yellow': 'bg-amber-500',
  'badge-red': 'bg-rose-500',
  'badge-blue': 'bg-blue-500',
  'badge-orange': 'bg-orange-500',
  'badge-purple': 'bg-purple-500',
  'badge-gray': 'bg-muted-foreground',
};

export default function StatusBadge({ status, className = '', dot = true }: Props) {
  const badgeCls = map[status?.toLowerCase()] || 'badge-gray';
  const dotColor = dotColors[badgeCls] || 'bg-muted-foreground';

  return (
    <span className={`${badgeCls} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      <span className="capitalize">{status?.replace(/_/g, ' ') || 'Unknown'}</span>
    </span>
  );
}