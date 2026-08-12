interface Props { status: string; }
const map: Record<string,string> = {
  active: 'badge-green', completed: 'badge-green', paid: 'badge-green',
  approved: 'badge-green', received: 'badge-green', issued: 'badge-green',
  pending: 'badge-yellow', submitted: 'badge-yellow', draft: 'badge-yellow',
  upcoming: 'badge-yellow', open: 'badge-yellow', requested: 'badge-yellow',
  maintenance: 'badge-red', breakdown: 'badge-red', overdue: 'badge-red',
  rejected: 'badge-red', cancelled: 'badge-red', inactive: 'badge-gray',
  in_transit: 'badge-blue', dispatched: 'badge-blue', loading: 'badge-blue',
  in_progress: 'badge-blue', delivering: 'badge-blue', partial: 'badge-blue',
  planned: 'badge-orange', scheduled: 'badge-orange', credit: 'badge-orange',
  monthly: 'badge-blue', cash: 'badge-green',
};
export default function StatusBadge({ status }: Props) {
  const cls = map[status?.toLowerCase()] || 'badge-gray';
  return <span className={cls}>{status?.replace(/_/g, ' ')}</span>;
}