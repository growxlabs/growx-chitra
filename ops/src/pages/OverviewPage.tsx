import { TableState, FilterTabs, Panel, Button, PageHeader, Table } from '../components/Workspace';
import { MetricCharts } from '../components/MetricCharts';
import { AttentionWorkbench, type AttentionItemData } from '../components/AttentionWorkbench';
import React, { useEffect, useState } from 'react';
import { api, isMockModeActive } from '../api';
import type { OverviewResponse } from '../types';
import type { NavSection } from '../components/Navigation';
import { StatusBadge } from '../components/Badge';
interface OverviewPageProps { onNavigateToBusiness: (id: string) => void; onNavigateToJob: (id: string) => void; onNavigateToPayment: (id: string) => void; onNavigate: (section: NavSection) => void; }
type Category = 'all' | 'payments' | 'jobs' | 'deletions';
function age(value: string) { const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000)); return !Number.isFinite(minutes) ? 'Time unavailable' : minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`; }
const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;
export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigateToBusiness, onNavigateToJob, onNavigateToPayment, onNavigate }) => {
  const [window, setWindow] = useState<'today' | '7d' | '30d'>('today');
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [category, setCategory] = useState<Category>('all');
  const [jobFilter, setJobFilter] = useState('all');
  useEffect(() => { let active = true; setLoading(true); setError(null); api.getOverview(window).then(res => { if (active) setData(res); }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load overview'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [window, retry]);
  const m = data?.metrics;
  const activity = data?.activity;
  const businessName = (id: string, fallback: string) => activity?.latest_businesses.find(b => b.id === id)?.name || activity?.latest_jobs.find(j => j.business_id === id)?.business_name || activity?.latest_payments.find(p => p.business_id === id)?.business_name || fallback;
  const alerts: AttentionItemData[] = [
    ...(data?.alerts.uncredited_payments || []).map(p => ({ key: p.id, category: 'payments' as const, severity: 'High', title: 'Payment received, credits missing', detail: `${businessName(p.business_id, p.whatsapp_number)} · ${money(p.amount_minor / 100)} received`, time: p.paid_at, action: 'Review payment', open: () => onNavigateToPayment(p.id) })),
    ...(data?.alerts.recent_failures || []).map(j => ({ key: j.id, category: 'jobs' as const, severity: 'Review', title: j.failure_reason?.includes('TIMEOUT') ? 'Image generation timed out' : j.failure_reason?.includes('DECODE') ? 'Uploaded image could not be read' : 'Image processing failed', detail: `${businessName(j.business_id, 'Business')} · ${j.id}`, time: j.created_at, action: 'Inspect job', open: () => onNavigateToJob(j.id) })),
    ...(data?.alerts.pending_deletions || []).map(d => ({ key: d.id, category: 'deletions' as const, severity: 'Pending', title: 'Account deletion awaiting processing', detail: businessName(d.id, d.whatsapp_number), time: d.deletion_confirmed_at || d.deletion_requested_at, action: 'Review request', open: () => onNavigate('deletions') }))
  ];
  const jobs = (activity?.latest_jobs || []).filter(j => jobFilter === 'all' || (jobFilter === 'issues' ? ['failed', 'blocked'].includes(j.status) : j.status === jobFilter));
  return <div className="overview" aria-busy={loading}>
    <div className="overview-heading"><PageHeader title="Operations overview" description="Review jobs, payments, and customer requests." />
      <div className="period-switch" aria-label="Reporting period">{(['today', '7d', '30d'] as const).map(w => <Button key={w} aria-pressed={window === w} onClick={() => setWindow(w)}>{w === 'today' ? 'Today' : w === '7d' ? '7 days' : '30 days'}</Button>)}</div>
    </div>
    {isMockModeActive() && <div className="sample-note"><span className="status-dot" />Sample data <span>You’re viewing example records. Actions here do not change live accounts.</span></div>}
    {error && <div className="overview-error" role="alert">{data ? 'Showing previously loaded data. ' : ''}{error}<Button className="quiet-button" onClick={() => setRetry(r => r + 1)}>Try again</Button></div>}
    {!m ? <div className="empty-panel">{loading ? 'Loading overview…' : 'Overview unavailable. Check access and try again.'}</div> : <>
      <MetricCharts metrics={m} onNavigate={onNavigate} />
      <div className="overview-columns">
        <AttentionWorkbench
          alerts={alerts}
          category={category}
          onCategoryChange={setCategory}
          age={age}
        />
        <aside className="pulse-panel">
          <div className="section-heading"><h2>Processing summary</h2><span className="status-dot" /></div>
          <p className="pulse-description">Results for the selected period</p>
          <div className="outcome-summary"><strong>{m.jobs_total}</strong><span>total jobs</span></div>
          <div className="outcome-bar" aria-label={`${m.jobs_successful} successful, ${m.jobs_failed} failed, ${m.jobs_blocked} blocked, ${m.jobs_queued} queued`}>
            {[['success', m.jobs_successful], ['failed', m.jobs_failed], ['blocked', m.jobs_blocked], ['queued', Math.max(0, m.jobs_total - m.jobs_successful - m.jobs_failed - m.jobs_blocked)]].map(([key, value]) => <span key={key} className={`outcome-${key}`} style={{ flex: Number(value) }} />)}
          </div>
          <dl className="pulse-stats">
            <div><dt><span className="legend success" />Successful</dt><dd>{m.jobs_successful}</dd></div>
            <div><dt><span className="legend failed" />Failed</dt><dd>{m.jobs_failed}</dd></div>
            <div><dt><span className="legend blocked" />Blocked by safety checks</dt><dd>{m.jobs_blocked}</dd></div>
            <div><dt><span className="legend queued" />Queued</dt><dd>{m.jobs_queued}</dd></div>
          </dl>
          <Button className="pulse-link" onClick={() => onNavigate('jobs')}>View image jobs <span>→</span></Button>
          <div className="pulse-note">Credits are charged only after a verified delivery receipt.</div>
        </aside>
      </div>
      <Panel className="recent-section"><div className="section-heading"><div><h2>Recent image jobs</h2><p>Check progress and open a job for details.</p></div><Button className="text-link" onClick={() => onNavigate('jobs')}>View all jobs →</Button></div>
        <div className="jobs-toolbar"><FilterTabs label="Recent jobs filter" value={jobFilter} onChange={setJobFilter} options={[{ value: 'all', label: 'All jobs' }, { value: 'completed', label: 'Completed' }, { value: 'issues', label: 'Needs review' }]} /><span>Latest {activity?.latest_jobs.length || 0} records</span></div>
        <div className="overview-table-wrap"><Table className="overview-table"><thead><tr><th>Business</th><th>Status</th><th>Model</th><th>Received</th><th aria-label="Inspect" className="w-10"></th></tr></thead><tbody>{jobs.map(j => <tr key={j.id}><td><Button className="business-link" onClick={() => onNavigateToBusiness(j.business_id)}>{j.business_name || 'Unnamed business'}</Button><small title={j.id}>{j.id}</small></td><td><StatusBadge status={j.status} /></td><td className="model-cell">{j.model || 'Not assigned'}</td><td><time title={j.created_at}>{age(j.created_at)}</time></td><td><Button className="row-open" onClick={() => onNavigateToJob(j.id)} aria-label={`Inspect job ${j.id}`}>↗</Button></td></tr>)}{!jobs.length && <TableState colSpan={5}>No recent jobs match this filter.</TableState>}</tbody></Table></div>
      </Panel>
      <Panel className="recent-section"><div className="section-heading"><div><h2>Recent payments</h2><p>Check payment status and credits added.</p></div><Button className="text-link" onClick={() => onNavigate('payments')}>View all payments →</Button></div><div className="overview-table-wrap"><Table className="overview-table"><thead><tr><th>Business</th><th>Plan</th><th>Amount</th><th>Status</th><th>Received</th><th aria-label="Review" className="w-10"></th></tr></thead><tbody>{activity?.latest_payments.map(p => <tr key={p.id}><td><Button className="business-link" onClick={() => onNavigateToBusiness(p.business_id)}>{p.business_name || 'Unnamed business'}</Button></td><td>{p.plan_id}</td><td className="money">{money(p.amount_minor / 100)}</td><td><StatusBadge status={p.status} /></td><td><time title={p.created_at}>{age(p.created_at)}</time></td><td><Button className="row-open" aria-label={`Review payment ${p.id}`} onClick={() => onNavigateToPayment(p.id)}>↗</Button></td></tr>)}{!activity?.latest_payments.length && <TableState colSpan={6}>No recent payments.</TableState>}</tbody></Table></div></Panel>
      <footer className="overview-footer"><span>GROWX CHITRA / OPERATIONS</span><span>{isMockModeActive() ? 'Sample workspace' : 'Authenticated operations'} · Amounts in INR</span></footer>
    </>}
  </div>;
};
