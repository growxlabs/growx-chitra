import { TableState, Button, Input, Notice, PageHeader, Pagination, Select, Table, Toolbar } from '../components/Workspace';
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { BusinessSummary } from '../types';
import { StatusBadge } from '../components/Badge';

interface BusinessesPageProps {
  onSelectBusiness: (id: string) => void;
}

export const BusinessesPage: React.FC<BusinessesPageProps> = ({ onSelectBusiness }) => {
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const loadBusinesses = async (p = page, s = search, f = filter) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getBusinesses({ page: p, limit, search: s, filter: f });
      setBusinesses(res.data);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.total_pages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load business directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses(page, search, filter);
  }, [page, filter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadBusinesses(1, search, filter);
  };

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-[#D8D0C4] pb-4">
        <PageHeader title="Businesses" description="Find a business, check its balance, and manage its account." />

        <div className="flex items-center gap-2 font-sans text-[13px] text-[#6F6B63]">
          <span className="font-semibold tracking-[0.08em] uppercase">TOTAL:</span>
          <strong className="font-mono text-[#1D1D1A] font-medium text-[14px]">{totalCount}</strong>
        </div>
      </div>

      {error && (
        <Notice tone="error">{error}</Notice>
      )}

      {/* Utilitarian Filter Controls */}
      <Toolbar>
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or WhatsApp (e.g. 9198...)"
            className="w-full font-sans text-[14px] px-3 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] placeholder-[#6F6B63]/60 focus:outline-none focus:border-[#1D1D1A]"
          />
          <Button
            type="submit"
            className="px-3 py-1.5 font-sans text-[13px] font-semibold bg-[#171714] text-[#F4EFE6] rounded-xs hover:bg-[#22221E] transition-colors cursor-pointer shrink-0"
          >
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2 font-sans text-[13px]">
          <span className="font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">STATE:</span>
          <Select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className="font-sans text-[13px] px-2 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none cursor-pointer"
          >
            <option value="">All Accounts</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deletion_pending">Deletion Pending</option>
            <option value="deleted">Deleted</option>
          </Select>
        </div>
      </Toolbar>

      {/* Flat Data Table */}
      <div className="overflow-x-auto">
        <Table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#D8D0C4]">
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Business Name</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">WhatsApp</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Status</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4 text-right">Available Credits</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4 text-right">Images processed</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4 text-right">Total Spend</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 text-right">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8D0C4]">
            {loading ? (
              <TableState colSpan={7} loading>Loading accounts directory...</TableState>
            ) : businesses.length === 0 ? (
              <TableState colSpan={7}>No business accounts matched the criteria.</TableState>
            ) : (
              businesses.map((b) => (
                <tr key={b.id} className="hover:bg-[#FBF8F2] transition-colors">
                  <td className="py-2.5 pr-4">
                    <Button
                      onClick={() => onSelectBusiness(b.id)}
                      className="font-sans text-[14px] font-medium text-[#1D1D1A] hover:underline text-left cursor-pointer"
                    >
                      {b.name || 'Unnamed Merchant'}
                    </Button>
                    <div className="font-mono text-[12px] text-[#6F6B63] mt-0.5">{b.id.slice(0, 8)}...</div>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#1D1D1A]">
                    {b.whatsapp_number}
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge status={b.account_state} />
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-right text-[13px] text-[#1D1D1A]">
                    <span className="font-medium">{b.total_remaining}</span>
                    <span className="text-[#6F6B63] text-[12px] ml-1">({b.free_credits}F / {b.paid_credits}P)</span>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-right text-[13px] text-[#1D1D1A]">
                    {b.total_images_processed}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-right text-[13px] font-medium text-[#1D1D1A]">
                    ₹{b.total_spend_inr}
                  </td>
                  <td className="py-2.5 text-right font-mono text-[13px] text-[#6F6B63]">
                    {new Date(b.created_at).toLocaleDateString('en-IN', {
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

      {/* Flat Pagination Strip */}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={totalCount} onPageChange={setPage} />
      )}
    </div>
  );
};
