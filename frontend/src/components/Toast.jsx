import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

export default function Toast({ message, type, onClose }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
  }, []);

  const bg = {
    success: 'bg-accent/10 border-accent/20 text-accent',
    error: 'bg-danger/10 border-danger/20 text-danger',
    warn: 'bg-warn/10 border-warn/20 text-warn',
    info: 'bg-elevated border-border text-text-primary',
  }[type] || 'bg-elevated border-border text-text-primary';

  const Icon = {
    success: CheckCircle2,
    error: XCircle,
    warn: AlertCircle,
    info: Info,
  }[type] || Info;

  return (
    <div
      onClick={onClose}
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl cursor-pointer transition-all duration-300 transform
        ${show ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
        ${bg} max-w-sm`}
    >
      <Icon size={18} className="shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
