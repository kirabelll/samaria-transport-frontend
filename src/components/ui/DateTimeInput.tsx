import { formatEthDate } from '../../utils/ethCalendar';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatEnglish(val: string): string {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${time}`;
}

function ethLabel(val: string): string {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  return formatEthDate(d) + ' EC';
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  required?: boolean;
}

export default function DateTimeInput({ value, onChange, className, required }: Props) {
  return (
    <div className="relative space-y-1">
      <input
        type="datetime-local"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={className || 'input'}
        required={required}
        lang="en"
      />
      {value && (
        <div className="flex items-center gap-2 px-1 text-[11px]">
          <span className="text-muted-foreground">{formatEnglish(value)}</span>
          <span className="text-primary font-medium">{ethLabel(value)}</span>
        </div>
      )}
    </div>
  );
}
