import { TableState, Button, Input, Notice, PageHeader, Pagination, Select, Table, Toolbar } from '../components/Workspace';
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { CreditLedgerEntry } from '../types';

interface CreditsPageProps {
  onSelectBusiness?: (id: string) => void;
  onSelectJob?: (id: string) => void;
  initialBusinessId?: string;
}

export const CreditsPage: React.FC<CreditsPageProps> = ({
  onSelectBusiness,
  onSelectJob,
  initialBusinessId = ''
}) => {
  const [entries, setEntries] = useState<CreditLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [type, setType] = useState('');
  const [businessId, setBusinessId] = useState(initialBusinessId);

  const loadCredits = async (p = page, t = type, b = businessId) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCredits({ page: p, limit, type: t, business_id: b });
      setEntries(res.data);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.total_pages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credit ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredits(page, type, businessId);
  }, [page, type, businessId]);

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-[#D8D0C4] pb-4">
        <PageHeader title="Credit history" description="Review credits added, used, and adjusted for each business." />

        <div className="flex items-center gap-2 font-sans text-[13px] text-[#6F6B63]">
          <span className="font-semibold tracking-[0.08em] uppercase">ENTRIES:</span>
          <strong className="font-mono text-[#1D1D1A] font-medium text-[14px]">{totalCount}</strong>
        </div>
      </div>

      {error && (
        <Notice tone="error">{error}</Notice>
      )}

      {/* Utilitarian Controls */}
      <Toolbar>
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Input
            type="text"
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            placeholder="Filter by business ID..."
            className="w-full font-mono text-[13px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] placeholder-[#6F6B63]/60 focus:outline-none focus:border-[#1D1D1A]"
          />
          {businessId && (
            <Button
              onClick={() => setBusinessId('')}
              className="font-sans text-[13px] font-semibold text-[#6F6B63] hover:text-[#1D1D1A] px-2 py-1 cursor-pointer"
            >
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 font-sans text-[13px]">
          <span className="font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">TYPE:</span>
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="font-sans text-[13px] px-2 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none cursor-pointer"
          >
            <option value="">All Transactions</option>
            <option value="signup_bonus">Signup Bonus (+5)</option>
            <option value="generation">Image Generation (-1)</option>
            <option value="purchase">Pack Purchase (+N)</option>
            <option value="manual_adjustment">Manual Adjustment</option>
          </Select>
        </div>
      </Toolbar>

      {/* Flat Data Table */}
      <div className="overflow-x-auto">
        <Table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#D8D0C4]">
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Amount</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Type</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Merchant</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Reason / Details</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Reference ID</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Operator</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 text-right">Recorded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8D0C4]">
            {loading ? (
              <TableState colSpan={7} loading>Loading ledger stream...</TableState>
            ) : entries.length === 0 ? (
              <TableState colSpan={7}>No credit transactions matched the criteria.</TableState>
            ) : (
              entries.map((item) => (
                <tr key={item.id} className="hover:bg-[#FBF8F2] transition-colors">
                  <td className={`py-2.5 pr-4 font-mono font-medium text-[13px] ${item.amount > 0 ? 'text-[#4F6B57]' : 'text-[#1D1D1A]'}`}>
                    {item.amount > 0 ? `+${item.amount}` : item.amount}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">
                    [{item.type}]
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
                  <td className="py-2.5 pr-4 font-sans text-[14px] text-[#1D1D1A] italic max-w-xs truncate">
                    {item.reason || '—'}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">
                    {item.image_job_id ? (
                      <Button
                        onClick={() => onSelectJob?.(item.image_job_id!)}
                        className="hover:underline text-[#1D1D1A] cursor-pointer"
                      >
                        job:{item.image_job_id.slice(0, 8)}
                      </Button>
                    ) : item.reference_id ? (
                      `ref:${item.reference_id.slice(0, 8)}`
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">
                    {item.operator || 'system'}
                  </td>
                  <td className="py-2.5 text-right font-mono text-[13px] text-[#6F6B63]">
                    {new Date(item.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
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
    </div>
  );
};
