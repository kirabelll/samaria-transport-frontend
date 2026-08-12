import { X } from 'lucide-react';
interface ModalProps { title: string; onClose: () => void; children: React.ReactNode; size?: string; }
export default function Modal({ title, onClose, children, size = 'max-w-lg' }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div className={"modal " + size}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5"/></button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}