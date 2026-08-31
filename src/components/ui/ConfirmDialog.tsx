import Modal from './Modal';
import { AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
}: Props) {
  if (!open) return null;

  return (
    <Modal title={title} onClose={onCancel} size="max-w-md">
      <div className="flex items-start gap-3.5">
        {danger && (
          <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="flex gap-2.5 justify-end mt-6 pt-4 border-t border-border">
        <button type="button" onClick={onCancel} className="btn btn-secondary text-xs sm:text-sm">
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'} text-xs sm:text-sm`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}