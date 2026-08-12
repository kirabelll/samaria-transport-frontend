import Modal from './Modal';
interface Props { open: boolean; title: string; message: string; onConfirm: ()=>void; onCancel: ()=>void; }
export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-gray-600 mb-5">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={onConfirm} className="btn-danger">Confirm</button>
      </div>
    </Modal>
  );
}