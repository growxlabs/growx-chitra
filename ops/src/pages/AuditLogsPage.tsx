import { TableState, Button, Notice, PageHeader, Pagination, Table } from '../components/Workspace';
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { AuditLogItem } from '../types';
import { Modal } from '../components/Modal';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inspectItem, setInspectItem] = useState<AuditLogItem | null>(null);

  const loadLogs = async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAuditLogs(p, 30);
      setLogs(res.data);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.total_pages);
      setTotalCount(res.pagination.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs(page);
  }, [page]);

  const formatMetadata = (raw: string | null) => {
    if (!raw) return null;
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  };

  return (
    <div className="space-y-6 select-text">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-[#D8D0C4] pb-4">
        <PageHeader title="Activity history" description="See who changed an account, adjusted credits, or took action on a job." />

        <div className="flex items-center gap-2 font-sans text-[13px] text-[#6F6B63]">
          <span className="font-semibold tracking-[0.08em] uppercase">RECORDED ACTIONS:</span>
          <strong className="font-mono text-[#1D1D1A] font-medium text-[14px]">{totalCount}</strong>
        </div>
      </div>

      {error && (
        <Notice tone="error">{error}</Notice>
      )}

      {/* Flat Data Table */}
      <div className="overflow-x-auto">
        <Table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#D8D0C4]">
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Timestamp</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Operator</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Action Event</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Target Entity</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Reason / Specification</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 text-right">Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8D0C4]">
            {loading ? (
              <TableState colSpan={6} loading>Loading immutable ledger...</TableState>
            ) : logs.length === 0 ? (
              <TableState colSpan={6}>Zero operator actions recorded in this period.</TableState>
            ) : (
              logs.map((item) => (
                <tr key={item.id} className="hover:bg-[#FBF8F2] transition-colors">
                  <td className="py-2.5 pr-4 font-mono text-[#6F6B63] text-[13px] whitespace-nowrap">
                    {new Date(item.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#1D1D1A]">
                    {item.operator}
                  </td>
                  <td className="py-2.5 pr-4 font-sans text-[14px] font-medium text-[#1D1D1A]">
                    {item.action}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">
                    <span className="uppercase mr-1">{item.target_type}:</span>
                    <span className="text-[#1D1D1A]">{item.target_id.slice(0, 10)}...</span>
                  </td>
                  <td className="py-2.5 pr-4 font-sans text-[14px] text-[#1D1D1A] italic max-w-xs truncate">
                    {item.reason || '—'}
                  </td>
                  <td className="py-2.5 text-right">
                    {item.metadata ? (
                      <Button
                        onClick={() => setInspectItem(item)}
                        className="font-sans text-[13px] font-semibold underline text-[#1D1D1A] hover:text-[#6F6B63] cursor-pointer"
                      >
                        inspect
                      </Button>
                    ) : (
                      <span className="font-sans text-[14px] text-[#6F6B63]">—</span>
                    )}
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

      {/* Payload Modal */}
      {inspectItem && (
        <Modal
          isOpen={true}
          title="Audit Entry Payload"
          onClose={() => setInspectItem(null)}
        >
          <div className="space-y-4">
            <div className="border-b border-[#D8D0C4] pb-2 font-mono text-[13px] text-[#6F6B63]">
              Action: <strong className="text-[#1D1D1A]">{inspectItem.action}</strong> · Operator: {inspectItem.operator} · Target: {inspectItem.target_type} / {inspectItem.target_id} · Recorded: {new Date(inspectItem.created_at).toISOString()}
            </div>

            {inspectItem.reason && (
              <div>
                <span className="font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6F6B63] block mb-1">Stated Reason</span>
                <div className="p-2.5 bg-[#FBF8F2] border border-[#D8D0C4] text-[#1D1D1A] rounded-xs font-sans text-[14px]">
                  {inspectItem.reason}
                </div>
              </div>
            )}

            <div>
              <span className="font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6F6B63] block mb-1">JSON Payload</span>
              <pre className="p-3 bg-[#171714] text-[#F4EFE6] rounded-xs font-mono text-[13px] overflow-x-auto max-h-60 leading-relaxed">
                {formatMetadata(inspectItem.metadata) || '{}'}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-3 py-1.5 font-sans text-[13px] font-semibold border border-[#D8D0C4] rounded-xs text-[#6F6B63] hover:text-[#1D1D1A] cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
