import { TableState, Button, Input, Notice, PageHeader, Pagination, Select, Table, Toolbar } from '../components/Workspace';
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { JobSummary } from '../types';
import { StatusBadge } from '../components/Badge';

interface JobsPageProps {
  onSelectJob: (id: string) => void;
}

export const JobsPage: React.FC<JobsPageProps> = ({ onSelectJob }) => {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [filter, setFilter] = useState('');

  const loadJobs = async (p = page, s = search, st = status, f = filter) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getJobs({ page: p, limit, search: s, status: st, filter: f });
      setJobs(res.data);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.total_pages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(page, search, status, filter);
  }, [page, status, filter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadJobs(1, search, status, filter);
  };

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-[#D8D0C4] pb-4">
        <PageHeader title="Image jobs" description="Track image processing, review failures, and retry eligible jobs." />

        <div className="flex items-center gap-2 font-sans text-[13px] text-[#6F6B63]">
          <span className="font-semibold tracking-[0.08em] uppercase">TOTAL:</span>
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
            placeholder="Search by job ID, business, or phone..."
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
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="queued">Queued</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="blocked">Blocked</option>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 font-sans text-[13px]">
            <span className="font-semibold tracking-[0.08em] uppercase text-[#6F6B63]">FILTER:</span>
            <Select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              className="font-sans text-[13px] px-2 py-1.5 rounded-xs border border-[#D8D0C4] bg-[#FBF8F2] text-[#1D1D1A] focus:outline-none cursor-pointer"
            >
              <option value="">All</option>
              <option value="needs_retry">Eligible for Retry</option>
              <option value="blocked">Safety Blocked</option>
              <option value="slow">Slow Executions (&gt;30s)</option>
            </Select>
          </div>
        </div>
      </Toolbar>

      {/* Flat Data Table */}
      <div className="overflow-x-auto">
        <Table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#D8D0C4]">
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Job Identifier</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Business</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Status</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Model</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Duration</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 pr-4">Failure / Reason</th>
              <th className="font-sans text-[12px] font-semibold tracking-[0.08em] uppercase text-[#6F6B63] py-2.5 text-right">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8D0C4]">
            {loading ? (
              <TableState colSpan={7} loading>Loading pipeline queue...</TableState>
            ) : jobs.length === 0 ? (
              <TableState colSpan={7}>No image processing jobs matched the criteria.</TableState>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-[#FBF8F2] transition-colors">
                  <td className="py-2.5 pr-4">
                    <Button
                      onClick={() => onSelectJob(job.id)}
                      className="font-mono text-[13px] font-medium text-[#1D1D1A] hover:underline cursor-pointer"
                    >
                      {job.id.slice(0, 8)}...
                    </Button>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="font-sans text-[14px] font-medium text-[#1D1D1A]">{job.business_name || 'Anonymous'}</span>
                    <span className="font-mono text-[12px] text-[#6F6B63] ml-1.5">({job.whatsapp_number})</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">
                    {job.model || '—'}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-[#6F6B63]">
                    {job.generation_duration_ms ? `${(job.generation_duration_ms / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td className="py-2.5 pr-4 max-w-xs truncate">
                    {job.failure_reason ? (
                      <span className="text-[#9E4A43] font-mono text-[13px]">{job.failure_reason}</span>
                    ) : (
                      <span className="text-[#6F6B63] font-sans text-[14px]">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-mono text-[13px] text-[#6F6B63]">
                    {new Date(job.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
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

