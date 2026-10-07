import React, { forwardRef } from 'react';
const classes = (...values: (string | undefined | false)[]) => values.filter(Boolean).join(' ');

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  busy?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'ghost', busy, disabled, className, children, type = 'button', ...props }, ref) {
  return <button {...props} ref={ref} type={type} disabled={disabled || busy} aria-busy={busy || undefined} className={classes('ui-button', `ui-button-${variant}`, className)}>{busy && <span className="ui-spinner" aria-hidden="true" />}{children}</button>;
});
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input {...props} ref={ref} className={classes('ui-input', className)} />;
});
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select {...props} ref={ref} className={classes('ui-input', className)} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea {...props} ref={ref} className={classes('ui-input', className)} />;
});
export function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint?: string; error?: string; children: React.ReactNode }) {
  return <div className="ui-field"><label htmlFor={htmlFor}>{label}</label>{children}{hint && <p id={`${htmlFor}-hint`}>{hint}</p>}{error && <p id={`${htmlFor}-error`} className="ui-field-error" role="alert">{error}</p>}</div>;
}
export function PageHeader({ title, description, actions }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return <header className="ui-page-header"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="ui-header-actions">{actions}</div>}</header>;
}
export function SectionHeader({ title, description, actions }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return <div className="ui-section-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{actions}</div>;
}
export function Panel({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section {...props} className={classes('ui-panel', className)} />;
}
export function Toolbar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classes('ui-toolbar', className)} />;
}
/** Compose semantic thead/tbody rows. The containing page owns filtering and data fetching. */
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table {...props} className={classes('ui-table', className)} />;
}
export function TableState({ colSpan, children, loading = false }: { colSpan: number; children: React.ReactNode; loading?: boolean }) {
  return <tr><td colSpan={colSpan}><EmptyState loading={loading}>{children}</EmptyState></td></tr>;
}
export function EmptyState({ children, loading = false, action }: { children: React.ReactNode; loading?: boolean; action?: React.ReactNode }) {
  return <div className="ui-empty-state" role={loading ? 'status' : undefined} aria-live={loading ? 'polite' : undefined}>{loading && <span className="ui-spinner" aria-hidden="true" />}<div>{children}</div>{action}</div>;
}
export function Notice({ tone = 'info', children, action }: { tone?: 'info' | 'success' | 'error' | 'warning'; children: React.ReactNode; action?: React.ReactNode }) {
  return <div className={`ui-notice ui-notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}><div>{children}</div>{action}</div>;
}
export function Pagination({ page, totalPages, total, onPageChange }: { page: number; totalPages: number; total?: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return <nav className="ui-pagination" aria-label="Table pages"><span>Page {page} of {totalPages}{total !== undefined ? ` · ${total.toLocaleString('en-IN')} records` : ''}</span><div><Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>Previous</Button><Button variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>Next</Button></div></nav>;
}
export function MetricCard({ label, value, description, onClick }: { label: string; value: React.ReactNode; description?: React.ReactNode; onClick?: () => void }) {
  const content = <><span className="eyebrow">{label}{onClick && <span aria-hidden="true">↗</span>}</span><strong>{value}</strong>{description && <span>{description}</span>}</>;
  return onClick ? <Button className="metric" onClick={onClick}>{content}</Button> : <div className="metric">{content}</div>;
}
export function FilterTabs<T extends string>({ label, value, options, onChange, className }: { label: string; value: T; options: { value: T; label: string; count?: number }[]; onChange: (value: T) => void; className?: string }) {
  return <div className={classes('filter-tabs', className)} role="group" aria-label={label}>{options.map(option => <Button key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}{option.count !== undefined && <span>{option.count}</span>}</Button>)}</div>;
}
