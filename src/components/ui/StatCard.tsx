import { LucideIcon } from 'lucide-react';
interface Props { title: string; value: string|number; icon: LucideIcon; color?: string; sub?: string; }
const colors: Record<string,string> = {
  blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600', yellow: 'bg-yellow-50 text-yellow-600',
  orange: 'bg-orange-50 text-orange-600', purple: 'bg-purple-50 text-purple-600',
};
export default function StatCard({ title, value, icon: Icon, color = 'blue', sub }: Props) {
  return (
    <div className="card flex items-start gap-4">
      <div className={"w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 " + (colors[color]||colors.blue)}>
        <Icon className="w-5 h-5"/>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}