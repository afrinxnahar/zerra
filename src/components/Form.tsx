/** Small form building blocks shared by every form in the app. */

type Msg = { error?: string; notice?: string } | undefined;

export function Field({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="eyebrow">{label}</span>
      <input className="input" {...props} />
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, hint, ...props }: { label: string; hint?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="eyebrow">{label}</span>
      <textarea className="input min-h-24" {...props} />
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function FormMessage({ state }: { state: Msg }) {
  if (state?.notice) {
    return (
      <p role="status" className="rounded-xl border border-ok/30 bg-ok/10 px-4 py-2.5 text-sm text-ok">
        {state.notice}
      </p>
    );
  }
  return state?.error ? (
    <p role="alert" className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-2.5 text-sm text-bad">
      {state.error}
    </p>
  ) : null;
}

export const usd = (n: number | null | undefined) =>
  n == null ? "" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
