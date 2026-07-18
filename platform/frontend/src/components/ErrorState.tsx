import { AlertCircle, RotateCcw } from "lucide-react";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center" role="alert">
      <AlertCircle size={24} className="text-tier-critical" />
      <p className="text-sm text-slate-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-accent-400 ring-1 ring-inset ring-accent-600/30 hover:bg-accent-600/10"
        >
          <RotateCcw size={13} /> Retry
        </button>
      )}
    </div>
  );
}
