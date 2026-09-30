interface StatusMessageProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const StatusMessage = ({ message, actionLabel, onAction }: StatusMessageProps) => (
  <div role="status" className="py-24 text-center">
    <p className="text-muted">{message}</p>
    {actionLabel && onAction && (
      <button type="button" onClick={onAction} className="btn-secondary mt-4">
        {actionLabel}
      </button>
    )}
  </div>
);
