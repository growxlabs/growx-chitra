import { Field, TableState, Button, Notice, PageHeader, Table, Textarea } from '../components/Workspace';
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { DeletionRequestItem, OperatorUser } from '../types';
import { StatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';

interface DeletionsPageProps {
  currentUser: OperatorUser | null;
  onSelectBusiness?: (id: string) => void;
}

export const DeletionsPage: React.FC<DeletionsPageProps> = ({ currentUser, onSelectBusiness }) => {
  const [deletions, setDeletions] = useState<DeletionRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadDeletions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDeletions();
      setDeletions(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deletion queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletions();
  }, []);

  const isAdmin = currentUser?.role === 'admin';
  const isOperator = currentUser?.role === 'operator' || isAdmin;

  const handleRetry = async (bizId: string) => {
    try {
      setActionLoading(true);
      const res = await api.retryDeletion(bizId);
      setActionSuccess(res.message || 'Deletion batch re-queued');
      await loadDeletions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to retry deletion');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.reviewDeletion(targetId, reviewNote.trim());
      setReviewModalOpen(false);
      setReviewNote('');
      setActionSuccess('Manual verification note attached');
      await loadDeletions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to attach review note');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Info */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-[#D8D0C4] pb-4">
        <PageHeader title="Deletion requests" description="Review customer requests, check progress, and retry failed deletions." />

        <div className="flex items-center gap-2 font-sans text-[13px] text-[#6F6B63]">
          <span className="font-semibold tracking-[0.08em] uppercase">REQUESTS:</span>
          <strong className="font-mono text-[#1D1D1A] font-medium text-[14px]">{deletions.length}</strong>
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

      {error && (
        <Notice tone="error">{error}</Notice>
      )}

      {/* Flat Data Table */}
      <div className="overflow-x-auto">
        <Table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#D8D0C4]">
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Merchant</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">WhatsApp</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Workflow Stage</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Requested At</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Confirmed At</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Completed At</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8D0C4]">
            {loading ? (
              <TableState colSpan={7} loading>Loading deletion queue...</TableState>
            ) : deletions.length === 0 ? (
              <TableState colSpan={7}>Zero active deletion requests pending.</TableState>
            ) : (
              deletions.map((item) => (
                <tr key={item.business_id} className="hover:bg-[#FBF8F2] transition-colors">
                  <td className="py-2.5 pr-4 font-sans text-[#1D1D1A]">
                    <Button
                      onClick={() => onSelectBusiness?.(item.business_id)}
                      className="font-medium hover:underline text-left cursor-pointer"
                    >
                      {item.business_name || 'Merchant'}
                    </Button>
                    <div className="font-mono text-[12px] text-[#6F6B63] mt-0.5">{item.business_id.slice(0, 8)}...</div>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#1D1D1A]">
                    {item.whatsapp_number}
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge status={item.status} />
                    {item.failure_reason && (
                      <span className="block font-mono text-[12px] text-[#9E4A43] mt-0.5 truncate max-w-[140px]">
                        {item.failure_reason}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">
                    {item.request_time ? new Date(item.request_time).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">
                    {item.confirmation_time ? new Date(item.confirmation_time).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">
                    {item.completion_time ? new Date(item.completion_time).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2.5 text-right space-x-2">
                    {item.status === 'failed' && isAdmin && (
                      <Button
                        onClick={() => handleRetry(item.business_id)}
                        disabled={actionLoading}
                        className="font-sans text-[13px] font-semibold text-[#9E4A43] underline hover:opacity-80 cursor-pointer disabled:opacity-40"
                      >
                        Retry
                      </Button>
                    )}
                    {isOperator && (
                      <Button
                        onClick={() => {
                          setTargetId(item.business_id);
                          setReviewModalOpen(true);
                        }}
                        className="font-sans text-[13px] font-semibold text-[#1D1D1A] underline hover:text-[#6F6B63] cursor-pointer"
                      >
                        Note
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* MODAL: Review Note */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Verification Note for Deletion Queue"
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <Field label="Audit Note" htmlFor="deletionspage-field-1"><Textarea id="deletionspage-field-1"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
              placeholder="For example: Customer confirmed deletion; stored images removed"
              className="w-full font-sans text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
              required
            /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              onClick={() => setReviewModalOpen(false)}
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
