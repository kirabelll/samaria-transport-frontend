interface Props { total: number; page: number; limit: number; onChange: (p:number)=>void; }
export default function Pagination({ total, page, limit, onChange }: Props) {
  const pages = Math.ceil(total / limit);
  const from = (page-1)*limit+1, to = Math.min(page*limit, total);
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between py-3 px-4 border-t border-gray-100">
      <p className="text-sm text-gray-500">Showing {from}-{to} of {total}</p>
      <div className="flex gap-2">
        <button onClick={()=>onChange(page-1)} disabled={page<=1} className="btn-secondary text-xs px-2 py-1">Prev</button>
        <span className="text-sm text-gray-600 px-2 py-1">{page} / {pages}</span>
        <button onClick={()=>onChange(page+1)} disabled={page>=pages} className="btn-secondary text-xs px-2 py-1">Next</button>
      </div>
    </div>
  );
}