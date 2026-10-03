export function CommandFeedback({ message }: { message: string }) { return <p className="navi-feedback" role="status" aria-live="polite">{message}</p>; }
