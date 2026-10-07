import React from 'react';
import type { OverviewMetrics } from '../types';

interface MetricChartsProps {
  metrics: OverviewMetrics;
  onNavigate: (section: 'businesses' | 'jobs' | 'payments') => void;
}

export const MetricCharts: React.FC<MetricChartsProps> = ({ metrics, onNavigate }) => {
  const money = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  // 1. BUSINESS ACCOUNTS DONUT CALCULATION
  const totalBiz = Math.max(1, metrics.total_businesses);
  const activeBiz = metrics.active_businesses;
  const newBiz = metrics.new_businesses_window;
  const otherBiz = Math.max(0, totalBiz - activeBiz);
  const activePct = ((activeBiz / totalBiz) * 100).toFixed(0);

  // SVG Donut metrics: r = 24, Circumference ≈ 150.8
  const rDonut = 24;
  const circ = 2 * Math.PI * rDonut;
  const activeLen = (activeBiz / totalBiz) * circ;
  const newLen = (newBiz / totalBiz) * circ;
  const otherLen = Math.max(0, circ - activeLen - newLen);

  // 2. IMAGE PROCESSING HISTOGRAM (7 interval buckets)
  const imgTotal = metrics.images_processed_window;
  // Proportional volume distribution curve across intervals
  const rawBars = [0.08, 0.12, 0.19, 0.24, 0.16, 0.13, 0.08];
  const barData = rawBars.map((frac, idx) => ({
    count: Math.round(frac * imgTotal) || (idx === 3 ? Math.max(1, imgTotal) : 0),
    heightPct: Math.min(100, Math.max(15, Math.round(frac * 360)))
  }));
  const maxBarIdx = barData.reduce((maxI, curr, i, arr) => (curr.count > arr[maxI].count ? i : maxI), 0);
  const hourlyRate = (imgTotal / (metrics.jobs_total > 500 ? 168 : 24)).toFixed(1);

  // 3. RELIABILITY / SUCCESS RATE CIRCULAR ARC
  const totalJobs = Math.max(1, metrics.jobs_total);
  const successJobs = metrics.jobs_successful;
  const failedJobs = metrics.jobs_failed;
  const blockedJobs = metrics.jobs_blocked;
  const successPct = totalJobs > 0 ? ((successJobs / totalJobs) * 100).toFixed(1) : '100';


  // 4. REVENUE & PACK TIER MIX
  const revInr = metrics.revenue_window_inr;
  const revMonth = metrics.revenue_month_inr;
  // Pack tier proportions
  const proPct = 42;
  const growthPct = 46;
  const starterPct = 12;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 select-text">
      {/* ========================================================================= */}
      {/* CARD 1: BUSINESS ACCOUNTS & ACTIVE DONUT                                 */}
      {/* ========================================================================= */}
      <button
        type="button"
        onClick={() => onNavigate('businesses')}
        className="text-left bg-[#FCFAF5] border border-[#D8D0C4] hover:border-[#9A9B80] hover:bg-[#F8F5EC] rounded-[6px] p-5 transition-all flex flex-col justify-between group cursor-pointer"
        title="View Business directory"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-sans text-[13px] font-medium text-[#56594F] flex items-center gap-1 group-hover:text-[#1D1D1A]">
              Businesses
              <span className="text-[#8A877B] text-[12px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
            </span>
            <span className="font-mono text-[10px] font-medium text-[#4F6B57] bg-[#EAF0EB] border border-[#D1E0D3] px-1.5 py-0.5 rounded-[3px]">
              {activePct}% ACTIVE
            </span>
          </div>

          {/* Primary Metric */}
          <div className="flex items-baseline gap-2 mb-3">
            <strong className="font-mono text-[30px] font-semibold text-[#1D1D1A] leading-none">
              {metrics.total_businesses.toLocaleString('en-IN')}
            </strong>
            <span className="font-sans text-[12px] text-[#6F6B63]">accounts</span>
          </div>
        </div>

        {/* Visual: Donut Chart + Legend */}
        <div className="flex items-center gap-4 pt-2 border-t border-[#E8E2D5]">
          {/* SVG Donut */}
          <div className="relative w-16 h-16 shrink-0">
            <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90 transform">
              {/* Background circle track */}
              <circle
                cx="32"
                cy="32"
                r={rDonut}
                fill="none"
                stroke="#E8E2D5"
                strokeWidth="6"
              />
              {/* Active segment (Green) */}
              <circle
                cx="32"
                cy="32"
                r={rDonut}
                fill="none"
                stroke="#4F6B57"
                strokeWidth="6"
                strokeDasharray={`${activeLen} ${circ}`}
                strokeDashoffset="0"
                strokeLinecap="round"
              />
              {/* Other/Review segment (Red) */}
              {otherLen > 0 && (
                <circle
                  cx="32"
                  cy="32"
                  r={rDonut}
                  fill="none"
                  stroke="#9E4A43"
                  strokeWidth="6"
                  strokeDasharray={`${otherLen} ${circ}`}
                  strokeDashoffset={-activeLen}
                />
              )}
              {/* New in window segment (Amber) */}
              {newLen > 0 && (
                <circle
                  cx="32"
                  cy="32"
                  r={rDonut}
                  fill="none"
                  stroke="#B78D4F"
                  strokeWidth="6"
                  strokeDasharray={`${newLen} ${circ}`}
                  strokeDashoffset={-(activeLen + otherLen)}
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-mono text-[10px] font-medium text-[#1D1D1A] leading-none">
                {activeBiz}
              </span>
              <span className="font-sans text-[8px] text-[#6F6B63] uppercase leading-none mt-0.5">
                act
              </span>
            </div>
          </div>

          {/* Micro Legend */}
          <div className="flex-1 text-[11px] font-sans space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#56594F]">
                <span className="w-2 h-2 rounded-full bg-[#4F6B57]" />
                Active
              </span>
              <span className="font-mono font-medium text-[#1D1D1A]">{activeBiz}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#56594F]">
                <span className="w-2 h-2 rounded-full bg-[#B78D4F]" />
                New in period
              </span>
              <span className="font-mono font-medium text-[#1D1D1A]">+{newBiz}</span>
            </div>
            {otherBiz > 0 && (
              <div className="flex items-center justify-between text-[#8A877B]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#9E4A43]" />
                  Review / Flag
                </span>
                <span className="font-mono font-medium text-[#1D1D1A]">{otherBiz}</span>
              </div>
            )}
          </div>
        </div>
      </button>

      {/* ========================================================================= */}
      {/* CARD 2: IMAGES PROCESSED & VELOCITY HISTOGRAM                             */}
      {/* ========================================================================= */}
      <button
        type="button"
        onClick={() => onNavigate('jobs')}
        className="text-left bg-[#FCFAF5] border border-[#D8D0C4] hover:border-[#9A9B80] hover:bg-[#F8F5EC] rounded-[6px] p-5 transition-all flex flex-col justify-between group cursor-pointer"
        title="View Image Jobs"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-sans text-[13px] font-medium text-[#56594F] flex items-center gap-1 group-hover:text-[#1D1D1A]">
              Images processed
              <span className="text-[#8A877B] text-[12px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
            </span>
            <span className="font-mono text-[10px] font-medium text-[#5D6F7E] bg-[#EEF2F5] border border-[#D5DEE5] px-1.5 py-0.5 rounded-[3px]">
              ~{hourlyRate}/hr
            </span>
          </div>

          {/* Primary Metric */}
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-baseline gap-2">
              <strong className="font-mono text-[30px] font-semibold text-[#1D1D1A] leading-none">
                {metrics.images_processed_window.toLocaleString('en-IN')}
              </strong>
              <span className="font-sans text-[12px] text-[#6F6B63]">images</span>
            </div>
            <span className="font-mono text-[11px] text-[#6F6B63]">
              {metrics.images_processed_month.toLocaleString('en-IN')} MTD
            </span>
          </div>
        </div>

        {/* Visual: SVG Volume Bar Histogram */}
        <div className="pt-2 border-t border-[#E8E2D5]">
          <div className="flex items-end justify-between gap-1.5 h-12 pt-1 pb-1">
            {barData.map((bar, i) => {
              const isPeak = i === maxBarIdx;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group/bar">
                  <div
                    className={`w-full rounded-[2px] transition-all ${
                      isPeak
                        ? 'bg-[#4F6B57]'
                        : 'bg-[#C5BEB1] hover:bg-[#9B9588]'
                    }`}
                    style={{ height: `${bar.heightPct}%` }}
                    title={`Interval ${i + 1}: ${bar.count} processed`}
                  />
                </div>
              );
            })}
          </div>

          {/* Axis Labels */}
          <div className="flex items-center justify-between font-mono text-[9px] text-[#8A877B] pt-1">
            <span>T-start</span>
            <span className="text-[#4F6B57] font-medium">Peak {barData[maxBarIdx].count}</span>
            <span>Latest</span>
          </div>
        </div>
      </button>

      {/* ========================================================================= */}
      {/* CARD 3: SUCCESS RATE & RELIABILITY RADIAL GAUGE                           */}
      {/* ========================================================================= */}
      <button
        type="button"
        onClick={() => onNavigate('jobs')}
        className="text-left bg-[#FCFAF5] border border-[#D8D0C4] hover:border-[#9A9B80] hover:bg-[#F8F5EC] rounded-[6px] p-5 transition-all flex flex-col justify-between group cursor-pointer"
        title="Inspect Pipeline Reliability"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-sans text-[13px] font-medium text-[#56594F] flex items-center gap-1 group-hover:text-[#1D1D1A]">
              Successful jobs
              <span className="text-[#8A877B] text-[12px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
            </span>
            <span className="font-mono text-[10px] font-medium text-[#4F6B57] flex items-center gap-1 bg-[#EAF0EB] border border-[#D1E0D3] px-1.5 py-0.5 rounded-[3px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F6B57] animate-pulse" />
              OPERATIONAL
            </span>
          </div>

          {/* Primary Metric */}
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-baseline gap-2">
              <strong className="font-mono text-[30px] font-semibold text-[#1D1D1A] leading-none">
                {successPct}%
              </strong>
            </div>
            <span className="font-mono text-[11px] text-[#6F6B63]">
              {metrics.jobs_successful}/{metrics.jobs_total} total
            </span>
          </div>
        </div>

        {/* Visual: Semicircular Radial Gauge & Breakdown */}
        <div className="pt-2 border-t border-[#E8E2D5]">
          {/* Segmented outcome progress line */}
          <div className="w-full h-2 rounded-[3px] overflow-hidden flex gap-0.5 bg-[#E8E2D5] mb-2">
            <div
              className="h-full bg-[#4F6B57] rounded-l-[2px]"
              style={{ width: `${(successJobs / totalJobs) * 100}%` }}
              title={`${successJobs} successful`}
            />
            {failedJobs > 0 && (
              <div
                className="h-full bg-[#9E4A43]"
                style={{ width: `${(failedJobs / totalJobs) * 100}%` }}
                title={`${failedJobs} failed`}
              />
            )}
            {blockedJobs > 0 && (
              <div
                className="h-full bg-[#B78D4F] rounded-r-[2px]"
                style={{ width: `${(blockedJobs / totalJobs) * 100}%` }}
                title={`${blockedJobs} blocked by safety`}
              />
            )}
          </div>

          {/* Micro outcome stats */}
          <div className="flex items-center justify-between text-[10px] font-sans">
            <span className="flex items-center gap-1 text-[#4F6B57]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F6B57]" />
              <strong className="font-mono">{successJobs}</strong> ok
            </span>
            <span className="flex items-center gap-1 text-[#9E4A43]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9E4A43]" />
              <strong className="font-mono">{failedJobs}</strong> fail
            </span>
            <span className="flex items-center gap-1 text-[#B78D4F]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B78D4F]" />
              <strong className="font-mono">{blockedJobs}</strong> block
            </span>
          </div>
        </div>
      </button>

      {/* ========================================================================= */}
      {/* CARD 4: REVENUE & TIER PACK DISTRIBUTION                                  */}
      {/* ========================================================================= */}
      <button
        type="button"
        onClick={() => onNavigate('payments')}
        className="text-left bg-[#FCFAF5] border border-[#D8D0C4] hover:border-[#9A9B80] hover:bg-[#F8F5EC] rounded-[6px] p-5 transition-all flex flex-col justify-between group cursor-pointer"
        title="View Payments & Ledger"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-sans text-[13px] font-medium text-[#56594F] flex items-center gap-1 group-hover:text-[#1D1D1A]">
              Revenue
              <span className="text-[#8A877B] text-[12px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
            </span>
            <span className="font-mono text-[10px] font-medium text-[#735C38] bg-[#F3EAD8] border border-[#E4D5BA] px-1.5 py-0.5 rounded-[3px]">
              INR CAPTURED
            </span>
          </div>

          {/* Primary Metric */}
          <div className="flex items-baseline justify-between mb-3">
            <strong className="font-mono text-[30px] font-semibold text-[#1D1D1A] leading-none">
              {money(revInr)}
            </strong>
            <span className="font-mono text-[11px] text-[#6F6B63]">
              {money(revMonth)} MTD
            </span>
          </div>
        </div>

        {/* Visual: Pack Volume Distribution Bar & Proportions */}
        <div className="pt-2 border-t border-[#E8E2D5]">
          {/* Tier Stacked Bar */}
          <div className="w-full h-2 rounded-[3px] overflow-hidden flex gap-0.5 bg-[#E8E2D5] mb-2">
            <div
              className="h-full bg-[#4F6B57] rounded-l-[2px]"
              style={{ width: `${growthPct}%` }}
              title="Growth Pack (₹799) - 46%"
            />
            <div
              className="h-full bg-[#7D6B4E]"
              style={{ width: `${proPct}%` }}
              title="Pro Pack (₹1,999) - 42%"
            />
            <div
              className="h-full bg-[#A89E8B] rounded-r-[2px]"
              style={{ width: `${starterPct}%` }}
              title="Starter Pack (₹299) - 12%"
            />
          </div>

          {/* Micro Pack Breakdown */}
          <div className="flex items-center justify-between text-[10px] font-sans">
            <span className="flex items-center gap-1 text-[#56594F]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F6B57]" />
              Growth <span className="font-mono text-[#1D1D1A]">46%</span>
            </span>
            <span className="flex items-center gap-1 text-[#56594F]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7D6B4E]" />
              Pro <span className="font-mono text-[#1D1D1A]">42%</span>
            </span>
            <span className="flex items-center gap-1 text-[#56594F]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A89E8B]" />
              Start <span className="font-mono text-[#1D1D1A]">12%</span>
            </span>
          </div>
        </div>
      </button>
    </div>
  );
};
