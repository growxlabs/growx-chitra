import { Field, TableState, SectionHeader, Button, EmptyState, Input, Table, Textarea } from '../components/Workspace';
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { PaymentDetail, OperatorUser } from '../types';
import { StatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';

interface PaymentDetailPageProps {
  paymentId: string;
  currentUser: OperatorUser | null;
  onBack: () => void;
  onNavigateToBusiness?: (businessId: string) => void;
  onNavigateToCredits?: (businessId: string) => void;
}

export const PaymentDetailPage: React.FC<PaymentDetailPageProps> = ({
  paymentId,
  currentUser,
  onBack,
  onNavigateToBusiness,
  onNavigateToCredits
}) => {
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [reconcileReason, setReconcileReason] = useState('');

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [investigateNote, setInvestigateNote] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const loadPayment = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPaymentDetail(paymentId);
      setDetail(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayment();
  }, [paymentId]);

  const isOperator = currentUser?.role === 'operator' || currentUser?.role === 'admin';

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await api.reconcilePayment(paymentId, reconcileReason.trim());
      setReconcileModalOpen(false);
      setReconcileReason('');
      setActionSuccess(res.message || 'Payment reconciled and credits granted');
      await loadPayment();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Reconciliation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInvestigate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investigateNote.trim()) return;
    try {
      setActionLoading(true);
      await api.investigatePayment(paymentId, investigateNote.trim());
      setNoteModalOpen(false);
      setInvestigateNote('');
      setActionSuccess('Investigation note recorded in audit log');
      await loadPayment();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to record note');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !detail) {
    return <EmptyState loading>Loading payment details...</EmptyState>;
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Button onClick={onBack} className="font-sans text-[13px] font-medium underline text-[#1D1D1A] cursor-pointer">
          ← Back to register
        </Button>
        <div className="border-l-2 border-[#9E4A43] pl-3 py-1 font-mono text-sm text-[#9E4A43]">
          {error || 'Transaction record not found'}
        </div>
      </div>
    );
  }

  const { payment, credits_granted, missing_credits, credit_ledger_entry, provider_events, refunds } = detail;
  const isPaid = payment.status === 'paid';
  const hasCredits = credits_granted || !!credit_ledger_entry;
  const canReconcile = isOperator && isPaid && (missing_credits || !hasCredits);

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
              Payment <span className="font-mono text-[24px] font-medium">{payment.id.slice(0, 8)}</span>
            </h1>
            <StatusBadge status={payment.status} />
          </div>
          <div className="font-sans text-[14px] text-[#6F6B63]">
            Merchant: <span className="font-medium text-[#1D1D1A]">{payment.business_name || 'Anonymous'}</span> <span className="font-mono text-[13px]">({payment.whatsapp_number || '—'})</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {canReconcile && (
            <Button
              onClick={() => setReconcileModalOpen(true)}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#171714] text-[#F4EFE6] rounded-xs hover:bg-[#22221E] transition-colors cursor-pointer"
            >
              Reconcile Missing Credits
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

      {isPaid && missing_credits && (
        <div className="border-l-2 border-[#A16D35] pl-3 py-1 font-sans text-[14px] text-[#A16D35]">
          AUDIT ANOMALY: Transaction is marked PAID on Razorpay, but zero credit ledger rows exist. Use "Reconcile" above to grant exact plan credits idempotently.
        </div>
      )}

      {/* Horizontal Financial Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-[#D8D0C4] pb-6">
        <div>
          <div className="font-sans text-[13px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">Amount Paid</div>
          <div className="font-mono text-[34px] font-medium leading-none tracking-[-0.04em] text-[#1D1D1A] mt-2 tabular-nums">
            ₹{(payment.amount_minor / 100).toFixed(2)}
          </div>
          <div className="font-mono text-[13px] font-normal text-[#6F6B63] mt-1.5">{payment.currency}</div>
        </div>

        <div>
          <div className="font-sans text-[13px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">Purchased Plan</div>
          <div className="font-mono text-[34px] font-medium leading-none tracking-[-0.04em] text-[#1D1D1A] uppercase mt-2">
            {payment.plan_id}
          </div>
          <div className="font-mono text-[13px] font-normal text-[#6F6B63] mt-1.5">{payment.credits_purchased} credits</div>
        </div>

        <div>
          <div className="font-sans text-[13px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">Credit Status</div>
          <div className="font-sans text-[18px] font-medium leading-none text-[#1D1D1A] mt-3">
            {hasCredits ? 'Granted to Ledger' : isPaid ? 'Missing from Ledger' : 'Not applicable'}
          </div>
        </div>

        <div>
          <div className="font-sans text-[13px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">Paid Timestamp</div>
          <div className="font-mono text-[14px] font-medium text-[#1D1D1A] mt-2">
            {payment.paid_at ? new Date(payment.paid_at).toLocaleString('en-IN') : 'Unpaid'}
          </div>
        </div>
      </div>

      {/* Technical Gateway Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-[#D8D0C4] pb-6">
        <div>
          <SectionHeader title="Payment details" />
          <dl className="divide-y divide-[#D8D0C4] text-[14px]">
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Internal Payment ID</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A]">{payment.id}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Merchant Record</dt>
              <dd>
                <Button
                  onClick={() => onNavigateToBusiness?.(payment.business_id)}
                  className="font-sans text-[14px] font-medium text-[#1D1D1A] underline hover:text-[#6F6B63] cursor-pointer"
                >
                  {payment.business_name || payment.whatsapp_number || payment.business_id}
                </Button>
              </dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Created Date</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A]">{new Date(payment.created_at).toLocaleString('en-IN')}</dd>
            </div>
          </dl>
        </div>

        <div>
          <SectionHeader title="Payment references" />
          <dl className="divide-y divide-[#D8D0C4] text-[14px]">
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Provider Payment ID</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A] truncate max-w-[240px]">{payment.provider_payment_id || '—'}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Payment Link ID</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A] truncate max-w-[240px]">{payment.provider_payment_link_id || '—'}</dd>
            </div>
            <div className="py-2.5 flex justify-between">
              <dt className="font-sans text-[#6F6B63]">Provider Order ID</dt>
              <dd className="font-mono text-[13px] text-[#1D1D1A] truncate max-w-[240px]">{payment.provider_order_id || '—'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Linked Credit history Entries */}
      <div className="space-y-3 border-b border-[#D8D0C4] pb-6">
        <div className="flex items-center justify-between">
          <SectionHeader title="Credits added" />
          {payment.business_id && onNavigateToCredits && (
            <Button
              onClick={() => onNavigateToCredits(payment.business_id)}
              className="font-sans text-[13px] font-semibold underline text-[#1D1D1A] hover:text-[#6F6B63] cursor-pointer"
            >
              View Full Merchant Ledger →
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D8D0C4]">
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Ledger ID</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Credits Granted</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Type</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Reference ID</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8D0C4]">
              {!credit_ledger_entry ? (
                <TableState colSpan={5}>Zero credit grants linked to this payment.</TableState>
              ) : (
                <tr className="hover:bg-[#FBF8F2] transition-colors">
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#1D1D1A]">{credit_ledger_entry.id.slice(0, 8)}...</td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] font-medium text-[#4F6B57]">+{credit_ledger_entry.amount} credits</td>
                  <td className="py-2.5 pr-4 font-sans text-[14px] text-[#6F6B63]">[{credit_ledger_entry.type}]</td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63] truncate max-w-[180px]">{credit_ledger_entry.reference_id || '—'}</td>
                  <td className="py-2.5 text-right font-mono text-[13px] text-[#6F6B63]">{new Date(credit_ledger_entry.created_at).toLocaleString('en-IN')}</td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Refunds if any */}
      {refunds && refunds.length > 0 && (
        <div className="space-y-3 border-b border-[#D8D0C4] pb-6">
          <SectionHeader title="Refunds" />
          <div className="overflow-x-auto">
            <Table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#D8D0C4]">
                  <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Refund ID</th>
                  <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Amount</th>
                  <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Status</th>
                  <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 text-right">Refunded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D0C4]">
                {refunds.map((r, i) => (
                  <tr key={i} className="hover:bg-[#FBF8F2] transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-[13px] text-[#1D1D1A]">{r.provider_refund_id}</td>
                    <td className="py-2.5 pr-4 font-mono text-[13px] font-medium text-[#9E4A43]">₹{(r.amount_minor / 100).toFixed(2)}</td>
                    <td className="py-2.5 pr-4 font-sans text-[14px]">{r.status}</td>
                    <td className="py-2.5 text-right font-mono text-[13px] text-[#6F6B63]">{new Date(r.created_at).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {/* Payment updates */}
      <div className="space-y-3 pb-6">
        <SectionHeader title="Payment updates" />
        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D8D0C4]">
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Event ID</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Event Type</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Result</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8D0C4]">
              {(!provider_events || provider_events.length === 0) ? (
                <TableState colSpan={4}>No provider webhook events registered.</TableState>
              ) : (
                provider_events.map((evt, i) => (
                  <tr key={i} className="hover:bg-[#FBF8F2] transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-[13px] text-[#1D1D1A]">{evt.provider_event_id}</td>
                    <td className="py-2.5 pr-4 font-mono text-[13px] font-medium text-[#1D1D1A]">{evt.event_type}</td>
                    <td className="py-2.5 pr-4 font-sans text-[14px] text-[#6F6B63]">{evt.result}</td>
                    <td className="py-2.5 text-right font-mono text-[13px] text-[#6F6B63]">{new Date(evt.created_at).toLocaleString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* MODAL: Reconcile */}
      <Modal
        isOpen={reconcileModalOpen}
        onClose={() => setReconcileModalOpen(false)}
        title="Reconcile Payment & Unlock Credits"
      >
        <form onSubmit={handleReconcile} className="space-y-4">
          <Field label="Reconciliation Reason" htmlFor="paymentdetailpage-field-1"><Input id="paymentdetailpage-field-1"
              type="text"
              value={reconcileReason}
              onChange={(e) => setReconcileReason(e.target.value)}
              placeholder="e.g. Razorpay webhook was delayed or signature timed out"
              className="w-full font-sans text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
            /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              onClick={() => setReconcileModalOpen(false)}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#D8D0C4] rounded-xs text-[#6F6B63] hover:text-[#1D1D1A] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={actionLoading}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#171714] text-[#F4EFE6] rounded-xs hover:bg-[#22221E] cursor-pointer disabled:opacity-40"
            >
              {actionLoading ? 'Granting...' : 'Grant Plan Credits'}
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
          <Field label="Diagnostic Note" htmlFor="paymentdetailpage-field-2"><Textarea id="paymentdetailpage-field-2"
              value={investigateNote}
              onChange={(e) => setInvestigateNote(e.target.value)}
              rows={3}
              placeholder="e.g. Verified with merchant WhatsApp bank statement; transaction confirmed"
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
