import { TableState, Button, Input, Notice, PageHeader, Pagination, Select, Table, Toolbar } from '../components/Workspace';
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { PaymentSummary } from '../types';
import { StatusBadge } from '../components/Badge';

interface PaymentsPageProps {
  onSelectPayment: (id: string) => void;
}

export const PaymentsPage: React.FC<PaymentsPageProps> = ({ onSelectPayment }) => {
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');

  const loadPayments = async (p = page, s = search, st = status, pl = plan) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPayments({ page: p, limit, search: s, status: st, plan: pl });
      setPayments(res.data);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.total_pages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments(page, search, status, plan);
  }, [page, status, plan]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPayments(1, search, status, plan);
  };

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-[#D8D0C4] pb-4">
        <PageHeader title="Payments" description="Review payments and check that customers received their credits." />

        <div className="flex items-center gap-2 font-sans text-[13px] text-[#6F6B63]">
          <span className="font-semibold tracking-[0.08em] uppercase">TRANSACTIONS:</span>
          <strong className="font-mono text-[#1D1D1A] font-medium text-[14px]">{totalCount}</strong>
        </div>
      </div>

      {error && (
        <Notice tone="error">{error}</Notice>
      )}

      {/* Utilitarian Controls */}
      <Toolbar>
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by payment ID or business"
            className="w-full font-sans text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] placeholder-[#6F6B63]/60 focus:outline-none focus:border-[#1D1D1A]"
          />
          <Button
            type="submit"
            className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#171714] text-[#F4EFE6] rounded-xs hover:bg-[#22221E] transition-colors cursor-pointer shrink-0"
          >
            Search
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-sans text-[13px]">
            <span className="font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">STATUS:</span>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="font-sans text-[13px] px-2 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="expired">Expired</option>
              <option value="refunded">Refunded</option>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 font-sans text-[13px]">
            <span className="font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">PLAN:</span>
            <Select
              value={plan}
              onChange={(e) => {
                setPlan(e.target.value);
                setPage(1);
              }}
              className="font-sans text-[13px] px-2 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none cursor-pointer"
            >
              <option value="">All Plans</option>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Pro</option>
            </Select>
          </div>
        </div>
      </Toolbar>

      {/* Flat Data Table */}
      <div className="overflow-x-auto">
        <Table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#D8D0C4]">
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Internal ID</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Merchant</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Plan Pack</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4 text-right">Amount (INR)</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Status</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Provider Reference</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 text-right">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8D0C4]">
            {loading ? (
              <TableState colSpan={7} loading>Loading transaction register...</TableState>
            ) : payments.length === 0 ? (
              <TableState colSpan={7}>No payment records found.</TableState>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-[#FBF8F2] transition-colors">
                  <td className="py-2.5 pr-4">
                    <Button
                      onClick={() => onSelectPayment(p.id)}
                      className="font-mono text-[13px] font-medium text-[#1D1D1A] hover:underline cursor-pointer"
                    >
                      {p.id.slice(0, 8)}...
                    </Button>
                    {p.missing_credits && (
                      <span className="block font-sans text-[12px] text-[#A16D35] uppercase font-semibold mt-0.5">
                        ⚠ Missing Credits
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="font-sans text-[14px] font-medium text-[#1D1D1A]">{p.business_name || 'Anonymous'}</span>
                    <span className="font-mono text-[12px] text-[#6F6B63] ml-1.5">({p.whatsapp_number})</span>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] uppercase text-[#6F6B63]">
                    {p.plan_id}
                  </td>
                  <td className="py-2.5 pr-4 font-mono font-medium text-[13px] text-right text-[#1D1D1A]">
                    ₹{(p.amount_minor / 100).toFixed(2)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">
                    {p.provider_payment_id || '—'}
                  </td>
                  <td className="py-2.5 text-right font-mono text-[13px] text-[#6F6B63]">
                    {new Date(p.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
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
