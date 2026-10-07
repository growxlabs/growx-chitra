import { Field, TableState, SectionHeader, Button, Input, Notice, PageHeader, Pagination, Table, Textarea } from '../components/Workspace';
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { SafetyOverview, OperatorUser } from '../types';
import { Modal } from '../components/Modal';
import { SafetyMetricInstruments } from '../components/SafetyMetricInstruments';

interface SafetyPageProps {
  currentUser: OperatorUser | null;
  onSelectBusiness?: (id: string) => void;
}

export const SafetyPage: React.FC<SafetyPageProps> = ({ currentUser, onSelectBusiness }) => {
  const [data, setData] = useState<SafetyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteBusinessId, setNoteBusinessId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadSafety = async (p = page) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getSafety(p, 25);
      setData(res);
      setPage(res.pagination.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load safety events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSafety(page);
  }, [page]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBusinessId.trim() || !noteText.trim()) return;
    try {
      setActionLoading(true);
      await api.addSafetyNote(noteBusinessId.trim(), noteText.trim());
      setActionSuccess('Safety investigation note recorded');
      setNoteModalOpen(false);
      setNoteBusinessId('');
      setNoteText('');
      await loadSafety();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add safety note');
    } finally {
      setActionLoading(false);
    }
  };

  const isOperator = currentUser?.role === 'operator' || currentUser?.role === 'admin';

  return (
    <div className="space-y-8 select-text">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-[#D8D0C4] pb-4">
        <PageHeader title="Safety checks" description="Review blocked images, check the reasons, and record follow-up notes." />

        <div className="flex items-center gap-2">
          {isOperator && (
            <Button
              onClick={() => setNoteModalOpen(true)}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#171714] text-[#F4EFE6] rounded-xs hover:bg-[#22221E] transition-colors cursor-pointer"
            >
              Add Safety Note
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

      {error && (
        <Notice tone="error">{error}</Notice>
      )}

      {/* Visual Safety Telemetry & Screening Instruments */}
      {data && (
        <SafetyMetricInstruments metrics={data.metrics} />
      )}

      {/* Safety Events Table */}
      <div className="space-y-3 pb-6">
        <div className="flex items-center justify-between">
          <SectionHeader title="Recent safety checks" />
          <span className="font-sans text-[13px] text-[#6F6B63]">Intake screening ledger</span>
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#D8D0C4]">
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Timestamp</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Merchant</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">WhatsApp</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Event Classification</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Category / Details</th>
                <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 text-right">Enforcement Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8D0C4]">
              {loading ? (
                <TableState colSpan={6} loading>Loading incident ledger...</TableState>
              ) : !data || data.events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center font-sans text-[14px] text-[#6F6B63]">
                    <div className="flex items-center justify-center gap-2 text-[#4F6B57]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4F6B57]" />
                      <span className="font-medium">ALL INGESTION PIPELINES NOMINAL — ZERO POLICY VIOLATIONS</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[#FBF8F2] transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">
                      {new Date(evt.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-2.5 pr-4">
                      {evt.business_id ? (
                        <Button
                          onClick={() => onSelectBusiness?.(evt.business_id!)}
                          className="font-sans text-[14px] font-medium text-[#1D1D1A] hover:underline cursor-pointer text-left"
                        >
                          {evt.business_name || 'Merchant'}
                        </Button>
                      ) : (
                        <span className="font-sans text-[14px] text-[#6F6B63] italic">Unregistered number</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-[13px] text-[#1D1D1A]">
                      {evt.whatsapp_number}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-[13px] text-[#9E4A43] font-medium">
                      {evt.event_type}
                    </td>
                    <td className="py-2.5 pr-4 font-sans text-[14px] text-[#6F6B63] max-w-xs truncate">
                      {evt.details || 'Threshold exceeded'}
                    </td>
                    <td className="py-2.5 text-right font-sans text-[14px] text-[#1D1D1A]">
                      Refused (Zero credits)
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* Pagination */}
        {data && data.pagination.total_pages > 1 && (
          <Pagination page={page} totalPages={data.pagination.total_pages} total={data.pagination.total} onPageChange={setPage} />
        )}
      </div>

      {/* MODAL: Safety Note */}
      <Modal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title="Record Moderation Case Observation"
      >
        <form onSubmit={handleAddNote} className="space-y-4">
          <Field label="Business ID" htmlFor="safetypage-field-1"><Input id="safetypage-field-1"
              type="text"
              value={noteBusinessId}
              onChange={(e) => setNoteBusinessId(e.target.value)}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              className="w-full font-mono text-[13px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
              required
            /></Field>

          <Field label="Safety Observation" htmlFor="safetypage-field-2"><Textarea id="safetypage-field-2"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              placeholder="e.g. Repeated person image upload attempts detected; merchant informed of product-only scope"
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
              {actionLoading ? 'Recording...' : 'Record Observation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
