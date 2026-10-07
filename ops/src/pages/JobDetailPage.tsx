import { Field, SectionHeader, Button, EmptyState, Input, Table, Textarea } from '../components/Workspace';
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { JobDetail, OperatorUser } from '../types';
import { StatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';

interface JobDetailPageProps {
  jobId: string;
  currentUser: OperatorUser | null;
  onBack: () => void;
  onNavigateToBusiness?: (businessId: string) => void;
}

export const JobDetailPage: React.FC<JobDetailPageProps> = ({
  jobId,
  currentUser,
  onBack,
  onNavigateToBusiness
}) => {
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [retryModalOpen, setRetryModalOpen] = useState(false);
  const [retryReason, setRetryReason] = useState('');

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [investigateNote, setInvestigateNote] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const loadJob = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getJobDetail(jobId);
      setDetail(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const isOperator = currentUser?.role === 'operator' || currentUser?.role === 'admin';

  const handleRetry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await api.retryJob(jobId, retryReason.trim());
      setRetryModalOpen(false);
      setRetryReason('');
      setActionSuccess(res.message || 'Job re-queued successfully');
      await loadJob();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to retry job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.cancelJob(jobId, cancelReason.trim());
      setCancelModalOpen(false);
      setCancelReason('');
      setActionSuccess('Job marked cancelled');
      await loadJob();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInvestigate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investigateNote.trim()) return;
    try {
      setActionLoading(true);
      await api.investigateJob(jobId, investigateNote.trim());
      setNoteModalOpen(false);
      setInvestigateNote('');
      setActionSuccess('Investigation note recorded');
      await loadJob();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record note');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !detail) {
    return <EmptyState loading>Loading pipeline inspector...</EmptyState>;
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Button onClick={onBack} className="font-sans text-[13px] font-medium underline text-[#1D1D1A] cursor-pointer">
          ← Back to jobs
        </Button>
        <div className="border-l-2 border-[#9E4A43] pl-3 py-1 font-mono text-sm text-[#9E4A43]">
          {error || 'Job not found'}
        </div>
      </div>
    );
  }

  const { job, delivery_event, credit_charge, audit_logs } = detail;
  const isSafetyBlocked = job.status === 'blocked_input' || job.status === 'blocked_output' || job.status === 'blocked';
  const canRetry = isOperator && (job.status === 'failed' || job.status === 'error') && !isSafetyBlocked;
  const canCancel = isOperator && (job.status === 'queued' || job.status === 'processing');

  return (
    <div className="space-y-8 select-text">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-[#D8D0C4] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button onClick={onBack} className="font-sans text-[13px] font-medium text-[#6F6B63] hover:text-[#1D1D1A] cursor-pointer">
              ← Back
            </Button>
            <h1 className="font-sans text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#1D1D1A]">
              Job <span className="font-mono text-[24px] font-medium">{job.id.slice(0, 8)}</span>
            </h1>
            <StatusBadge status={job.status} />
          </div>
          <div className="font-sans text-[14px] text-[#6F6B63]">
            Business: <span className="font-medium text-[#1D1D1A]">{job.business_name || 'Anonymous'}</span> <span className="font-mono text-[13px]">({job.whatsapp_number || '—'})</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {canRetry && (
            <Button
              onClick={() => setRetryModalOpen(true)}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#171714] text-[#F4EFE6] rounded-xs hover:bg-[#22221E] transition-colors cursor-pointer"
            >
              Retry Job
            </Button>
          )}

          {canCancel && (
            <Button
              onClick={() => setCancelModalOpen(true)}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#9E4A43]/40 text-[#9E4A43] bg-transparent hover:bg-[#9E4A43]/5 rounded-xs transition-colors cursor-pointer"
            >
              Cancel Job
            </Button>
          )}

          {isOperator && (
            <Button
              onClick={() => setNoteModalOpen(true)}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#D8D0C4] bg-transparent text-[#1D1D1A] rounded-xs hover:bg-[#FBF8F2] transition-colors cursor-pointer"
            >
              Add Note
            </Button>
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

      {/* Safety block immutable notice */}
      {isSafetyBlocked && (
        <div className="border-l-2 border-[#9E4A43] pl-3 py-1 font-sans text-[14px] text-[#9E4A43]">
          POLICY ENFORCEMENT: Job blocked by automated content moderation. Fail-closed rule strictly forbids manual retry or override.
        </div>
      )}

      {/* Horizontal Technical Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-[#D8D0C4] pb-6">
        <div>
          <div className="font-sans text-[13px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">Active AI Model</div>
          <div className="font-mono text-[22px] font-medium leading-none tracking-tight text-[#1D1D1A] mt-2">
            {job.model || 'gpt-image-2.5-flare'}
          </div>
        </div>

        <div>
          <div className="font-sans text-[13px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">Pipeline Latency</div>
          <div className="font-mono text-[34px] font-medium leading-none tracking-[-0.04em] text-[#1D1D1A] mt-2">
            {job.generation_duration_ms ? `${(job.generation_duration_ms / 1000).toFixed(2)}s` : '—'}
          </div>
        </div>

        <div>
          <div className="font-sans text-[13px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">Attempts Made</div>
          <div className="font-mono text-[34px] font-medium leading-none tracking-[-0.04em] text-[#1D1D1A] mt-2">
            {job.attempt_count ?? job.attempts ?? 1} / 2
          </div>
        </div>

        <div>
          <div className="font-sans text-[13px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">Timestamp</div>
          <div className="font-mono text-[14px] font-medium text-[#1D1D1A] mt-2">
            {new Date(job.created_at).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Technical Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-[#D8D0C4] pb-6">
        <div>
          <SectionHeader title="Job details" />
          <dl className="divide-y divide-[#D8D0C4] text-[14px]">
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Job ID</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A]">{job.id}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Associated Business</dt>
              <dd>
                <Button
                  onClick={() => onNavigateToBusiness?.(job.business_id)}
                  className="font-sans text-[14px] font-medium text-[#1D1D1A] underline hover:text-[#6F6B63] cursor-pointer"
                >
                  {job.business_name || job.whatsapp_number}
                </Button>
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Failure Reason</dt>
              <dd className="font-mono text-[13px] text-[#9E4A43]">{job.failure_reason || 'None'}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">WhatsApp Message ID</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A] truncate max-w-[240px]">{job.whatsapp_message_id || '—'}</dd>
            </div>
          </dl>
        </div>

        <div>
          <SectionHeader title="Files and safety checks" />
          <dl className="divide-y divide-[#D8D0C4] text-[14px]">
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Original Storage Key</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A] truncate max-w-[240px]">{job.original_r2_key || '—'}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Final Storage Key</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A] truncate max-w-[240px]">{job.final_r2_key || job.generated_r2_key || '—'}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">OpenAI Request ID</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A] truncate max-w-[240px]">{job.openai_request_id || '—'}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Moderation Status</dt>
              <dd className="font-sans text-[14px] font-medium text-[#1D1D1A]">
                {job.input_safety_passed && job.output_safety_passed ? 'In/Out Passed' : 'Blocked'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Pipeline Delivery & Settlement */}
      <div className="space-y-3 border-b border-[#D8D0C4] pb-6">
        <SectionHeader title="Delivery & Credit history" />
        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D8D0C4]">
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Component</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Identifier / Status</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Details</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8D0C4]">
              <tr>
                <td className="py-2.5 pr-4 font-sans text-[14px] font-medium text-[#1D1D1A]">WhatsApp Delivery</td>
                <td className="py-2.5 pr-4 font-sans text-[14px]">
                  <span className={delivery_event?.status === 'delivered' ? 'text-[#4F6B57] font-medium' : 'text-[#6F6B63]'}>
                    {delivery_event?.status || (job.status === 'completed' ? 'Delivered' : 'Pending')}
                  </span>
                </td>
                <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">
                  {job.final_message_id ? `Msg: ${job.final_message_id.slice(0, 16)}...` : 'Direct delivery'}
                </td>
                <td className="py-2.5 text-right font-mono text-[13px] text-[#6F6B63]">
                  {job.delivered_at ? new Date(job.delivered_at).toLocaleTimeString() : '—'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-sans text-[14px] font-medium text-[#1D1D1A]">Credit Charge</td>
                <td className="py-2.5 pr-4 font-mono text-[13px]">
                  {credit_charge ? (
                    <span className="text-[#9E4A43] font-medium">-{credit_charge.amount} credit</span>
                  ) : (
                    <span className="text-[#6F6B63]">No charge</span>
                  )}
                </td>
                <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">
                  {credit_charge ? `Type: ${credit_charge.type}` : 'Free or blocked'}
                </td>
                <td className="py-2.5 text-right font-mono text-[13px] text-[#6F6B63]">
                  {credit_charge?.created_at ? new Date(credit_charge.created_at).toLocaleTimeString() : '—'}
                </td>
              </tr>
            </tbody>
          </Table>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="space-y-3 pb-6">
        <SectionHeader title="Recent actions" />
        <div className="divide-y divide-[#D8D0C4]">
          {audit_logs.length === 0 ? (
            <div className="py-4 text-center font-sans text-[14px] text-[#6F6B63]">No operator interactions</div>
          ) : (
            audit_logs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-baseline justify-between gap-3">
                <div className="font-sans text-[14px]">
                  <span className="text-[#1D1D1A] font-medium">{log.action}</span>
                  {log.reason && <span className="text-[#6F6B63] ml-2 italic">"{log.reason}"</span>}
                </div>
                <div className="font-mono text-[12px] text-[#6F6B63]">
                  {log.operator} · {new Date(log.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: Retry */}
      <Modal
        isOpen={retryModalOpen}
        onClose={() => setRetryModalOpen(false)}
        title="Re-enqueue Image Job"
      >
        <form onSubmit={handleRetry} className="space-y-4">
          <Field label="Retry Reason" htmlFor="jobdetailpage-field-1"><Input id="jobdetailpage-field-1"
              type="text"
              value={retryReason}
              onChange={(e) => setRetryReason(e.target.value)}
              placeholder="e.g. OpenAI rate limit cleared"
              className="w-full font-sans text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
            /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              onClick={() => setRetryModalOpen(false)}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#D8D0C4] rounded-xs text-[#6F6B63] hover:text-[#1D1D1A] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={actionLoading}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#171714] text-[#F4EFE6] rounded-xs hover:bg-[#22221E] cursor-pointer disabled:opacity-40"
            >
              {actionLoading ? 'Enqueuing...' : 'Re-enqueue Job'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Cancel */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel In-Flight Job"
      >
        <form onSubmit={handleCancel} className="space-y-4">
          <Field label="Cancellation Reason" htmlFor="jobdetailpage-field-2"><Input id="jobdetailpage-field-2"
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Requested by customer or duplicate intake"
              className="w-full font-sans text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
            /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#D8D0C4] rounded-xs text-[#6F6B63] hover:text-[#1D1D1A] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={actionLoading}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#9E4A43] text-[#F4EFE6] rounded-xs cursor-pointer disabled:opacity-40"
            >
              {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Investigate Note */}
      <Modal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title="Attach Diagnostic Note"
      >
        <form onSubmit={handleInvestigate} className="space-y-4">
          <Field label="Diagnostic Note" htmlFor="jobdetailpage-field-3"><Textarea id="jobdetailpage-field-3"
              value={investigateNote}
              onChange={(e) => setInvestigateNote(e.target.value)}
              rows={3}
              placeholder="e.g. Verified corrupt JPEG header from Meta Cloud webhook"
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
              {actionLoading ? 'Recording...' : 'Attach Note'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
