import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  total: number;
  page: number;
  limit: number;
  onChange: (p: number) => void;
}

export default function Pagination({ total, page, limit, onChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = Math.min((page - 1) * limit + 1, total);
  const to = Math.min(page * limit, total);

  if (total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 border-t border-border bg-card/50 text-xs sm:text-sm text-muted-foreground">
      <p>
        Showing <span className="font-semibold text-foreground">{from}</span>–
        <span className="font-semibold text-foreground">{to}</span> of{' '}
        <span className="font-semibold text-foreground">{total}</span> entries
      </p>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="btn btn-secondary px-2.5 py-1.5 text-xs disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
          Prev
        </button>

        <span className="px-3 py-1 text-xs font-semibold text-foreground bg-muted/50 rounded-md border border-border">
          {page} / {pages}
        </span>

        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          className="btn btn-secondary px-2.5 py-1.5 text-xs disabled:opacity-40"
          aria-label="Next page"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
        </button>
      </div>
    </div>
  );
}