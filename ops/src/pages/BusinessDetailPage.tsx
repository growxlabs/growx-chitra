import { Field, TableState, SectionHeader, Button, EmptyState, Input, Table, Textarea } from '../components/Workspace';
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { BusinessDetail, OperatorUser } from '../types';
import { StatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';

interface BusinessDetailPageProps {
  businessId: string;
  currentUser: OperatorUser | null;
  onBack: () => void;
  onNavigateToJob?: (jobId: string) => void;
}

export const BusinessDetailPage: React.FC<BusinessDetailPageProps> = ({
  businessId,
  currentUser,
  onBack,
  onNavigateToJob: _onNavigateToJob
}) => {
  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState<number | string>(5);
  const [creditReason, setCreditReason] = useState('');

  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteIssue, setNoteIssue] = useState('');
  const [noteBody, setNoteBody] = useState('');

  const [brandingModalOpen, setBrandingModalOpen] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [bgStyle, setBgStyle] = useState('');
  const [logoEnabled, setLogoEnabled] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const loadDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getBusinessDetail(businessId);
      setDetail(res);

      if (res.brand_profile) {
        setBrandName(res.brand_profile.business_name || '');
        setPrimaryColor(res.brand_profile.primary_color || '');
        setSecondaryColor(res.brand_profile.secondary_color || '');
        setBgStyle(res.brand_profile.background_style || '');
        setLogoEnabled(Boolean(res.brand_profile.logo_enabled));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load business');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [businessId]);

  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(creditAmount);
    if (isNaN(amt) || amt === 0 || !creditReason.trim()) {
      alert('Please enter a valid non-zero amount and mandatory reason');
      return;
    }

    try {
      setActionLoading(true);
      await api.adjustCredits(businessId, amt, creditReason.trim());
      setCreditModalOpen(false);
      setCreditReason('');
      setActionSuccess(`Adjusted ${amt > 0 ? '+' + amt : amt} credits`);
      await loadDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to adjust credits');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendReason.trim()) {
      alert('A suspension reason is mandatory');
      return;
    }

    try {
      setActionLoading(true);
      await api.suspendBusiness(businessId, suspendReason.trim());
      setSuspendModalOpen(false);
      setSuspendReason('');
      setActionSuccess('Business account has been suspended');
      await loadDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to suspend account');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!confirm('Reactivate this business account? Image processing will resume immediately.')) return;

    try {
      setActionLoading(true);
      await api.reactivateBusiness(businessId, 'Operator manual reactivation');
      setActionSuccess('Business account reactivated');
      await loadDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reactivate account');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteReason.trim()) {
      alert('Mandatory reason required for account deletion');
      return;
    }

    try {
      setActionLoading(true);
      await api.deleteBusiness(businessId, deleteReason.trim());
      setDeleteModalOpen(false);
      setDeleteReason('');
      setActionSuccess('Account soft-deleted. Personal data queued for scrub; financial rows preserved.');
      await loadDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete business');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.updateBranding(businessId, {
        business_name: brandName.trim() || undefined,
        primary_color: primaryColor.trim() || undefined,
        secondary_color: secondaryColor.trim() || undefined,
        background_style: bgStyle.trim() || undefined,
        logo_enabled: logoEnabled
      });
      setBrandingModalOpen(false);
      setActionSuccess('Brand configuration updated');
      await loadDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update brand profile');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Remove this business logo? Customer will need to upload a new one via WhatsApp.')) return;
    try {
      setActionLoading(true);
      await api.removeLogo(businessId);
      setActionSuccess('Logo removed');
      await loadDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove logo');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteIssue.trim() || !noteBody.trim()) {
      alert('Issue title and note body are required');
      return;
    }

    try {
      setActionLoading(true);
      await api.addSupportNote(businessId, noteIssue.trim(), noteBody.trim());
      setNoteModalOpen(false);
      setNoteIssue('');
      setNoteBody('');
      setActionSuccess('Support note added');
      await loadDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add support note');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !detail) {
    return <EmptyState loading>Loading merchant dossier...</EmptyState>;
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Button onClick={onBack} className="font-sans text-[13px] font-medium underline text-[#1D1D1A] cursor-pointer">
          ← Back to directory
        </Button>
        <div className="border-l-2 border-[#9E4A43] pl-3 py-1 font-mono text-sm text-[#9E4A43]">
          {error || 'Business record not found'}
        </div>
      </div>
    );
  }

  const { business, brand_profile, usage, credits, payments, safety, support_notes, audit_logs } = detail;
  const isAdmin = currentUser?.role === 'admin';
  const isOperator = currentUser?.role === 'operator' || isAdmin;

  return (
    <div className="space-y-8 select-text">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-[#D8D0C4] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              onClick={onBack}
              className="font-sans text-[13px] font-medium text-[#6F6B63] hover:text-[#1D1D1A] cursor-pointer"
            >
              ← Back
            </Button>
            <h1 className="font-sans text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#1D1D1A]">
              {business.name || 'Unnamed Merchant'}
            </h1>
            <StatusBadge status={business.account_state} />
          </div>
          <div className="font-sans text-[14px] text-[#6F6B63]">
            WhatsApp: <span className="font-mono text-[13px] text-[#1D1D1A]">{business.whatsapp_number}</span> · ID: <span className="font-mono text-[13px]">{business.id}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isOperator && (
            <>
              <Button
                onClick={() => setCreditModalOpen(true)}
                className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#171714] text-[#F4EFE6] rounded-xs hover:bg-[#22221E] transition-colors cursor-pointer"
              >
                Adjust Credits
              </Button>
              <Button
                onClick={() => setNoteModalOpen(true)}
                className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#D8D0C4] bg-transparent text-[#1D1D1A] rounded-xs hover:bg-[#FBF8F2] transition-colors cursor-pointer"
              >
                Add Note
              </Button>
            </>
          )}

          {isAdmin && (
            <>
              {business.account_state === 'active' ? (
                <Button
                  onClick={() => setSuspendModalOpen(true)}
                  className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#A16D35]/40 text-[#A16D35] bg-transparent hover:bg-[#A16D35]/5 rounded-xs transition-colors cursor-pointer"
                >
                  Suspend
                </Button>
              ) : business.account_state === 'suspended' ? (
                <Button
                  onClick={handleReactivate}
                  className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#4F6B57]/40 text-[#4F6B57] bg-transparent hover:bg-[#4F6B57]/5 rounded-xs transition-colors cursor-pointer"
                >
                  Reactivate
                </Button>
              ) : null}

              {business.account_state !== 'deleted' && (
                <Button
                  onClick={() => setDeleteModalOpen(true)}
                  className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#9E4A43]/40 text-[#9E4A43] bg-transparent hover:bg-[#9E4A43]/5 rounded-xs transition-colors cursor-pointer"
                >
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="border-l-2 border-[#4F6B57] pl-3 py-1 font-sans text-[14px] text-[#4F6B57] flex items-center justify-between">
          <span>{actionSuccess}</span>
          <Button onClick={() => setActionSuccess(null)} className="text-[#6F6B63] hover:text-[#1D1D1A] cursor-pointer">
            ✕
          </Button>
        </div>
      )}

      {/* Horizontal Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-[#D8D0C4] pb-6">
        <div>
          <div className="font-sans text-[13px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">Available Credits</div>
          <div className="font-mono text-[34px] font-medium leading-none tracking-[-0.04em] text-[#1D1D1A] mt-2 tabular-nums">
            {credits.total_remaining}
          </div>
          <div className="font-mono text-[13px] font-normal text-[#6F6B63] mt-1.5">
            {credits.free_remaining} free · {credits.paid_remaining} purchased
          </div>
        </div>

        <div>
          <div className="font-sans text-[13px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">Images Processed</div>
          <div className="font-mono text-[34px] font-medium leading-none tracking-[-0.04em] text-[#1D1D1A] mt-2 tabular-nums">
            {usage.completed_images}
          </div>
          <div className="font-mono text-[13px] font-normal text-[#6F6B63] mt-1.5">
            {usage.failed_images} failed · {usage.blocked_images} safety blocked
          </div>
        </div>

        <div>
          <div className="font-sans text-[13px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">Total Paid Invoices</div>
          <div className="font-mono text-[34px] font-medium leading-none tracking-[-0.04em] text-[#1D1D1A] mt-2 tabular-nums">
            {payments.filter((p) => p.status === 'paid').length}
          </div>
          <div className="font-mono text-[13px] font-normal text-[#6F6B63] mt-1.5">
            ₹{(payments.filter((p) => p.status === 'paid').reduce((acc, p) => acc + p.amount_minor, 0) / 100).toLocaleString('en-IN')} total volume
          </div>
        </div>

        <div>
          <div className="font-sans text-[13px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">Average Duration</div>
          <div className="font-mono text-[34px] font-medium leading-none tracking-[-0.04em] text-[#1D1D1A] mt-2 tabular-nums">
            {usage.avg_duration_ms ? `${(usage.avg_duration_ms / 1000).toFixed(1)}s` : '—'}
          </div>
          <div className="font-sans text-[13px] text-[#6F6B63] mt-1.5">
            intake to delivery callback
          </div>
        </div>
      </div>

      {/* Account Dossier & Brand Spec */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-[#D8D0C4] pb-6">
        <div>
          <SectionHeader title="Business details" />
          <dl className="divide-y divide-[#D8D0C4] text-[14px]">
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Account Identifier</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A]">{business.id}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">WhatsApp Phone</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A]">{business.whatsapp_number}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Joined At</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A]">{new Date(business.created_at).toLocaleString('en-IN')}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Legal Notice Acceptance</dt>
              <dd className="font-sans text-[14px] text-[#1D1D1A]">
                {business.legal_notice_shown_at ? `Acknowledged (${new Date(business.legal_notice_shown_at).toLocaleDateString()})` : 'Pending'}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader title="Brand settings" />
            {isOperator && (
              <Button
                onClick={() => setBrandingModalOpen(true)}
                className="font-sans text-[13px] font-semibold text-[#1D1D1A] underline hover:text-[#6F6B63] cursor-pointer"
              >
                Edit Brand →
              </Button>
            )}
          </div>
          <dl className="divide-y divide-[#D8D0C4] text-[14px]">
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Display Brand Name</dt>
              <dd className="font-sans font-medium text-[#1D1D1A]">{brand_profile?.business_name || 'Not set'}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Color Palette</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A] flex items-center gap-2">
                {brand_profile?.primary_color && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs border border-[#D8D0C4]" style={{ backgroundColor: brand_profile.primary_color }} />
                    {brand_profile.primary_color}
                  </span>
                )}
                {brand_profile?.secondary_color && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs border border-[#D8D0C4]" style={{ backgroundColor: brand_profile.secondary_color }} />
                    {brand_profile.secondary_color}
                  </span>
                )}
                {!brand_profile?.primary_color && !brand_profile?.secondary_color && '—'}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Background Aesthetic</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A]">{brand_profile?.background_style || 'default'}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Brand Watermark / Logo</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A]">
                {brand_profile?.logo_r2_key ? (
                  <span className="inline-flex items-center gap-2">
                    <span>Configured ({brand_profile.logo_enabled ? 'Active' : 'Disabled'})</span>
                    {isOperator && (
                      <Button onClick={handleRemoveLogo} className="font-sans text-[#9E4A43] hover:underline cursor-pointer">
                        [Remove]
                      </Button>
                    )}
                  </span>
                ) : (
                  <span className="font-sans text-[14px] text-[#6F6B63]">No logo asset</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Credit history History */}
      <div className="space-y-3 border-b border-[#D8D0C4] pb-6">
        <SectionHeader title="Credit history" />
        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D8D0C4]">
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Amount</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Type</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Stated Reason</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Operator</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8D0C4]">
              {credits.history.length === 0 ? (
                <TableState colSpan={5}>No credit modifications recorded.</TableState>
              ) : (
                credits.history.map((h) => (
                  <tr key={h.id} className="hover:bg-[#FBF8F2] transition-colors">
                    <td className={`py-2.5 pr-4 font-mono text-[13px] font-medium ${h.amount > 0 ? 'text-[#4F6B57]' : 'text-[#1D1D1A]'}`}>
                      {h.amount > 0 ? `+${h.amount}` : h.amount}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">[{h.type}]</td>
                    <td className="py-2.5 pr-4 font-sans text-[14px] text-[#1D1D1A] italic">{h.reason || '—'}</td>
                    <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">{h.operator || 'system'}</td>
                    <td className="py-2.5 text-right font-mono text-[13px] text-[#6F6B63]">
                      {new Date(h.created_at).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="space-y-3 border-b border-[#D8D0C4] pb-6">
        <SectionHeader title="Payments and purchases" />
        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D8D0C4]">
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Payment ID</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Plan</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Amount</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Status</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 text-right">Paid At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8D0C4]">
              {payments.length === 0 ? (
                <TableState colSpan={5}>No payment attempts found.</TableState>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FBF8F2] transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-[13px] text-[#1D1D1A]">{p.id.slice(0, 8)}...</td>
                    <td className="py-2.5 pr-4 font-mono text-[13px] uppercase text-[#6F6B63]">{p.plan_id}</td>
                    <td className="py-2.5 pr-4 font-mono font-medium text-[13px] text-[#1D1D1A]">₹{p.amount_minor / 100}</td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-2.5 text-right font-mono text-[13px] text-[#6F6B63]">
                      {p.paid_at ? new Date(p.paid_at).toLocaleString('en-IN') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Safety Incidents */}
      {safety && safety.events.length > 0 && (
        <div className="space-y-3 border-b border-[#D8D0C4] pb-6">
          <h2 className="font-sans text-[14px] font-semibold tracking-[0.08em] uppercase text-[#9E4A43]">Safety Incidents ({safety.events.length})</h2>
          <div className="overflow-x-auto">
            <Table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#D8D0C4]">
                  <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Classification</th>
                  <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Details</th>
                  <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 text-right">Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D0C4]">
                {safety.events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#FBF8F2] transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-[13px] text-[#9E4A43] font-medium">{ev.event_type}</td>
                    <td className="py-2.5 pr-4 font-sans text-[14px] text-[#1D1D1A]">{ev.details || '—'}</td>
                    <td className="py-2.5 text-right font-mono text-[13px] text-[#6F6B63]">{new Date(ev.created_at).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {/* Support & Audit Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6">
        {/* Support Notes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeader title="Support notes" />
            {isOperator && (
              <Button onClick={() => setNoteModalOpen(true)} className="font-sans text-[13px] font-semibold underline text-[#1D1D1A] hover:text-[#6F6B63] cursor-pointer">
                + Note
              </Button>
            )}
          </div>
          <div className="divide-y divide-[#D8D0C4]">
            {support_notes.length === 0 ? (
              <div className="py-4 text-center font-sans text-[14px] text-[#6F6B63]">No operator notes</div>
            ) : (
              support_notes.map((n) => (
                <div key={n.id} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-[14px] font-semibold text-[#1D1D1A]">{n.issue}</span>
                    <span className="font-mono text-[12px] text-[#6F6B63]">{n.operator} · {new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="font-sans text-[14px] text-[#6F6B63] leading-relaxed">{n.note}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Trail */}
        <div className="space-y-3">
          <SectionHeader title="Recent actions" />
          <div className="divide-y divide-[#D8D0C4]">
            {audit_logs.length === 0 ? (
              <div className="py-4 text-center font-sans text-[14px] text-[#6F6B63]">No recorded actions</div>
            ) : (
              audit_logs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-baseline justify-between gap-3">
                  <div className="font-sans text-[14px]">
                    <span className="text-[#1D1D1A] font-medium">{log.action}</span>
                    {log.reason && <span className="text-[#6F6B63] ml-2 italic">"{log.reason}"</span>}
                  </div>
                  <div className="font-mono text-[12px] text-[#6F6B63] shrink-0">
                    {log.operator} · {new Date(log.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Credit Adjustment */}
      <Modal
        isOpen={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
        title="Credit history Manual Adjustment"
      >
        <form onSubmit={handleAdjustCredits} className="space-y-4">
          <Field label="Credit Amount (+ to grant, - to deduct)" htmlFor="businessdetailpage-field-1"><Input id="businessdetailpage-field-1"
              type="number"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="w-full font-mono text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
              required
            /></Field>

          <Field label="Mandatory Operational Reason" htmlFor="businessdetailpage-field-2"><Input id="businessdetailpage-field-2"
              type="text"
              value={creditReason}
              onChange={(e) => setCreditReason(e.target.value)}
              placeholder="e.g. Compensation for timeout during image processing"
              className="w-full font-sans text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
              required
            /></Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              onClick={() => setCreditModalOpen(false)}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#D8D0C4] rounded-xs text-[#6F6B63] hover:text-[#1D1D1A] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={actionLoading}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#171714] text-[#F4EFE6] rounded-xs hover:bg-[#22221E] cursor-pointer disabled:opacity-40"
            >
              {actionLoading ? 'Recording...' : 'Commit Adjustment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Suspend Account */}
      <Modal
        isOpen={suspendModalOpen}
        onClose={() => setSuspendModalOpen(false)}
        title="Suspend Account Execution"
      >
        <form onSubmit={handleSuspend} className="space-y-4">
          <Field label="Suspension Reason" htmlFor="businessdetailpage-field-3"><Textarea id="businessdetailpage-field-3"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
              placeholder="e.g. Investigation for repetitive prompt policy violation"
              className="w-full font-sans text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
              required
            /></Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              onClick={() => setSuspendModalOpen(false)}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#D8D0C4] rounded-xs text-[#6F6B63] hover:text-[#1D1D1A] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={actionLoading}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#A16D35] text-[#F4EFE6] rounded-xs hover:opacity-90 cursor-pointer disabled:opacity-40"
            >
              {actionLoading ? 'Suspending...' : 'Confirm Suspension'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Delete Account */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Soft-Delete Business Record"
      >
        <form onSubmit={handleDelete} className="space-y-4">
          <Field label="Deletion Reason" htmlFor="businessdetailpage-field-4"><Textarea id="businessdetailpage-field-4"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
              placeholder="e.g. Customer requested data deletion via WhatsApp or operator clearance"
              className="w-full font-sans text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
              required
            /></Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#D8D0C4] rounded-xs text-[#6F6B63] hover:text-[#1D1D1A] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={actionLoading}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#9E4A43] text-[#F4EFE6] rounded-xs hover:opacity-90 cursor-pointer disabled:opacity-40"
            >
              {actionLoading ? 'Processing...' : 'Confirm Deletion'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Brand Profile */}
      <Modal
        isOpen={brandingModalOpen}
        onClose={() => setBrandingModalOpen(false)}
        title="Modify Brand Parameters"
      >
        <form onSubmit={handleSaveBranding} className="space-y-4">
          <Field label="Brand Name" htmlFor="businessdetailpage-field-5"><Input id="businessdetailpage-field-5"
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full font-sans text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
            /></Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Primary Color (Hex)" htmlFor="businessdetailpage-field-6"><Input id="businessdetailpage-field-6"
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#1D1D1A"
                className="w-full font-mono text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
              /></Field>
            <Field label="Secondary Color (Hex)" htmlFor="businessdetailpage-field-7"><Input id="businessdetailpage-field-7"
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#F4EFE6"
                className="w-full font-mono text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
              /></Field>
          </div>

          <Field label="Background Style" htmlFor="businessdetailpage-field-8"><Input id="businessdetailpage-field-8"
              type="text"
              value={bgStyle}
              onChange={(e) => setBgStyle(e.target.value)}
              placeholder="minimalist, studio_clean, outdoor"
              className="w-full font-mono text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
            /></Field>

          <div className="flex items-center gap-2 pt-1 font-sans text-[14px]">
            <Input
              type="checkbox"
              id="logoEnabled"
              checked={logoEnabled}
              onChange={(e) => setLogoEnabled(e.target.checked)}
              className="cursor-pointer"
            />
            <label htmlFor="logoEnabled" className="text-[#1D1D1A] cursor-pointer">
              Enable Logo Watermark Overlay
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              onClick={() => setBrandingModalOpen(false)}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#D8D0C4] rounded-xs text-[#6F6B63] hover:text-[#1D1D1A] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={actionLoading}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#171714] text-[#F4EFE6] rounded-xs hover:bg-[#22221E] cursor-pointer disabled:opacity-40"
            >
              {actionLoading ? 'Saving...' : 'Save Parameters'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Add Support Note */}
      <Modal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title="Append Internal Support Note"
      >
        <form onSubmit={handleAddNote} className="space-y-4">
          <Field label="Issue Topic" htmlFor="businessdetailpage-field-9"><Input id="businessdetailpage-field-9"
              type="text"
              value={noteIssue}
              onChange={(e) => setNoteIssue(e.target.value)}
              placeholder="e.g. Refund inquiry or WhatsApp delivery delay"
              className="w-full font-sans text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
              required
            /></Field>

          <Field label="Detailed Note" htmlFor="businessdetailpage-field-10"><Textarea id="businessdetailpage-field-10"
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              rows={3}
              placeholder="Specific context or resolution steps taken"
              className="w-full font-sans text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
              required
            /></Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              onClick={() => setNoteModalOpen(false)}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#D8D0C4] rounded-xs text-[#6F6B63] hover:text-[#1D1D1A] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={actionLoading}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#171714] text-[#F4EFE6] rounded-xs hover:bg-[#22221E] cursor-pointer disabled:opacity-40"
            >
              {actionLoading ? 'Saving...' : 'Append Note'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
