import { Field, TableState, Button, Input, Notice, PageHeader, Pagination, Select, Table, Textarea } from '../components/Workspace';
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { SupportNoteItem, OperatorUser } from '../types';
import { Modal } from '../components/Modal';

interface SupportPageProps {
  currentUser: OperatorUser | null;
  onSelectBusiness?: (id: string) => void;
}

export const SupportPage: React.FC<SupportPageProps> = ({ currentUser, onSelectBusiness }) => {
  const [notes, setNotes] = useState<SupportNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [resolvedFilter, setResolvedFilter] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newBusinessId, setNewBusinessId] = useState('');
  const [newIssue, setNewIssue] = useState('');
  const [newBody, setNewBody] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadNotes = async (p = page, r = resolvedFilter) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getSupportNotes({ page: p, limit, resolved: r });
      setNotes(res.data);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.total_pages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support register');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes(page, resolvedFilter);
  }, [page, resolvedFilter]);

  const isOperator = currentUser?.role === 'operator' || currentUser?.role === 'admin';

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessId.trim() || !newIssue.trim() || !newBody.trim()) {
      alert('All fields are required');
      return;
    }

    try {
      setActionLoading(true);
      await api.addSupportNote(newBusinessId.trim(), newIssue.trim(), newBody.trim());
      setAddModalOpen(false);
      setNewBusinessId('');
      setNewIssue('');
      setNewBody('');
      setActionSuccess('Support record created');
      await loadNotes(1, resolvedFilter);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create support record');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleResolved = async (id: string, currentResolved: number) => {
    try {
      setActionLoading(true);
      await api.updateSupportNote(id, currentResolved === 0);
      await loadNotes(page, resolvedFilter);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update resolution state');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-[#D8D0C4] pb-4">
        <PageHeader title="Customer support" description="Find open issues, add notes, and mark resolved requests." />

        <div className="flex items-center gap-2">
          {isOperator && (
            <Button
              onClick={() => setAddModalOpen(true)}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#171714] text-[#F4EFE6] rounded-xs hover:bg-[#22221E] transition-colors cursor-pointer"
            >
              New Ticket
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

      {/* Filter strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-sans text-[13px]">
          <span className="font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">RESOLUTION:</span>
          <Select
            value={resolvedFilter}
            onChange={(e) => {
              setResolvedFilter(e.target.value);
              setPage(1);
            }}
            className="font-sans text-[13px] px-2 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none cursor-pointer"
          >
            <option value="">All Records</option>
            <option value="0">Open Inquiries</option>
            <option value="1">Resolved Cases</option>
          </Select>
        </div>

        <div className="flex items-center gap-2 font-sans text-[13px] text-[#6F6B63]">
          <span className="font-semibold tracking-[0.08em] uppercase">TOTAL TICKETS:</span>
          <strong className="font-mono text-[#1D1D1A] font-medium text-[14px]">{totalCount}</strong>
        </div>
      </div>

      {/* Flat Data Table */}
      <div className="overflow-x-auto">
        <Table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#D8D0C4]">
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">State</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Issue Subject</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Merchant</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Operator</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Details</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8D0C4]">
            {loading ? (
              <TableState colSpan={6} loading>Loading support records...</TableState>
            ) : notes.length === 0 ? (
              <TableState colSpan={6}>Zero support records found.</TableState>
            ) : (
              notes.map((item) => (
                <tr key={item.id} className="hover:bg-[#FBF8F2] transition-colors">
                  <td className="py-2.5 pr-4">
                    {isOperator ? (
                      <Button
                        onClick={() => handleToggleResolved(item.id, item.resolved)}
                        className={`inline-flex items-center gap-1.5 font-sans text-[13px] font-medium cursor-pointer hover:underline ${
                          item.resolved ? 'text-[#4F6B57]' : 'text-[#A16D35]'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.resolved ? 'bg-[#4F6B57]' : 'bg-[#A16D35]'}`} />
                        <span>{item.resolved ? 'Resolved' : 'Open'}</span>
                      </Button>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 font-sans text-[13px] font-medium ${item.resolved ? 'text-[#4F6B57]' : 'text-[#A16D35]'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.resolved ? 'bg-[#4F6B57]' : 'bg-[#A16D35]'}`} />
                        <span>{item.resolved ? 'Resolved' : 'Open'}</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 font-sans font-medium text-[14px] text-[#1D1D1A]">
                    {item.issue}
                  </td>
                  <td className="py-2.5 pr-4">
                    {item.business_name ? (
                      <Button
                        onClick={() => onSelectBusiness?.(item.business_id)}
                        className="font-sans text-[14px] font-medium text-[#1D1D1A] hover:underline cursor-pointer"
                      >
                        {item.business_name}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => onSelectBusiness?.(item.business_id)}
                        className="font-mono text-[13px] text-[#6F6B63] hover:underline cursor-pointer"
                      >
                        {item.whatsapp_number}
                      </Button>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">
                    {item.operator}
                  </td>
                  <td className="py-2.5 pr-4 font-sans text-[14px] text-[#6F6B63] max-w-sm truncate">
                    {item.note}
                  </td>
                  <td className="py-2.5 text-right font-mono text-[13px] text-[#6F6B63]">
                    {new Date(item.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short'
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={totalCount} onPageChange={setPage} />
      )}

      {/* MODAL: New Ticket */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Create Operational Support Entry"
      >
        <form onSubmit={handleCreateNote} className="space-y-4">
          <Field label="Business ID" htmlFor="supportpage-field-1"><Input id="supportpage-field-1"
              type="text"
              value={newBusinessId}
              onChange={(e) => setNewBusinessId(e.target.value)}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              className="w-full font-mono text-[13px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
              required
            /></Field>

          <Field label="Issue Topic" htmlFor="supportpage-field-2"><Input id="supportpage-field-2"
              type="text"
              value={newIssue}
              onChange={(e) => setNewIssue(e.target.value)}
              placeholder="For example: Customer paid but has not received credits"
              className="w-full font-sans text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
              required
            /></Field>

          <Field label="Detailed Case Notes" htmlFor="supportpage-field-3"><Textarea id="supportpage-field-3"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              rows={3}
              placeholder="Action taken, customer correspondence, or next steps"
              className="w-full font-sans text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none focus:border-[#1D1D1A]"
              required
            /></Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#D8D0C4] rounded-xs text-[#6F6B63] hover:text-[#1D1D1A] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={actionLoading}
              className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#171714] text-[#F4EFE6] rounded-xs hover:bg-[#22221E] cursor-pointer disabled:opacity-40"
            >
              {actionLoading ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
