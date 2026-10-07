import React, { useState } from 'react';
import { Warning, ArrowUpRight, CheckCircle, Clock, ShieldWarning } from '@phosphor-icons/react';

export interface AttentionItemData {
  key: string;
  category: 'payments' | 'jobs' | 'deletions';
  severity: 'High' | 'Review' | 'Pending' | string;
  title: string;
  detail: string;
  time: string;
  action: string;
  open: () => void;
}

interface AttentionWorkbenchProps {
  alerts: AttentionItemData[];
  category: 'all' | 'payments' | 'jobs' | 'deletions';
  onCategoryChange: (cat: 'all' | 'payments' | 'jobs' | 'deletions') => void;
  age: (val: string) => string;
}

export const AttentionWorkbench: React.FC<AttentionWorkbenchProps> = ({
  alerts,
  category,
  onCategoryChange,
  age
}) => {
  const [resolvedKeys, setResolvedKeys] = useState<Set<string>>(new Set());

  const activeAlerts = alerts.filter(a => !resolvedKeys.has(a.key));
  const filtered = activeAlerts.filter(a => category === 'all' || a.category === category);

  const counts = {
    all: activeAlerts.length,
    payments: activeAlerts.filter(a => a.category === 'payments').length,
    jobs: activeAlerts.filter(a => a.category === 'jobs').length,
    deletions: activeAlerts.filter(a => a.category === 'deletions').length,
  };

  const highSeverityCount = activeAlerts.filter(a => a.severity.toLowerCase() === 'high').length;

  const handleDismiss = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setResolvedKeys(prev => new Set(prev).add(key));
  };

  return (
    <section className="bg-[#FCFAF5] border border-[#D8D0C4] rounded-[6px] overflow-hidden select-text">
      {/* Workbench Header */}
      <div className="px-6 py-4 border-b border-[#E8E2D5] bg-[#FBF8F2] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-sans text-[18px] font-semibold text-[#1D1D1A] tracking-[-0.01em]">
              Needs Attention
            </h2>
            <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-[4px] bg-[#E8DECA] text-[#715C36]">
              {counts.all}
            </span>
          </div>
          {highSeverityCount > 0 && (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium text-[#9E4A43] bg-[#F9EBE9] border border-[#ECD1CD] px-2 py-0.5 rounded-[3px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9E4A43] animate-pulse" />
              {highSeverityCount} ACTION REQUIRED
            </span>
          )}
        </div>

        {/* Filter Pill Tabs */}
        <div className="flex items-center gap-1 bg-[#EFE9DC] p-1 rounded-[5px] border border-[#DDD6C8]">
          {(
            [
              { id: 'all', label: 'All Items', count: counts.all },
              { id: 'payments', label: 'Missing Credits', count: counts.payments },
              { id: 'jobs', label: 'Failed Jobs', count: counts.jobs },
              { id: 'deletions', label: 'Deletions', count: counts.deletions },
            ] as const
          ).map((tab) => {
            const active = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onCategoryChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-sans font-medium rounded-[3px] transition-all cursor-pointer ${
                  active
                    ? 'bg-[#FCFAF5] text-[#1D1D1A] shadow-xs'
                    : 'text-[#6F6B63] hover:text-[#1D1D1A] hover:bg-[#EAE3D4]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`font-mono text-[10px] px-1 rounded-[2px] ${
                    active ? 'bg-[#ECE5D8] text-[#1D1D1A]' : 'text-[#8A877B]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Triage Alert List */}
      {filtered.length === 0 ? (
        <div className="py-14 text-center">
          <CheckCircle size={32} weight="light" className="mx-auto text-[#4F6B57] mb-2" />
          <h3 className="font-sans text-[14px] font-medium text-[#1D1D1A]">
            Queue cleared
          </h3>
          <p className="font-sans text-[12px] text-[#6F6B63] mt-0.5">
            No {category === 'all' ? 'pending alerts' : `${category} items`} require manual intervention right now.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#EFE9DC]">
          {filtered.map((item) => {
            const sev = item.severity.toLowerCase();
            const isHigh = sev === 'high';
            const isReview = sev === 'review';

            return (
              <div
                key={item.key}
                onClick={item.open}
                className="group p-4 px-6 hover:bg-[#F7F3EA] transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left Section: Severity Badge & Item Details */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Category / Severity Icon Marker */}
                  <div className="mt-0.5 shrink-0">
                    {isHigh ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] bg-[#F9EBE9] text-[#9E4A43] border border-[#ECD1CD]" title="High Severity">
                        <Warning size={16} weight="fill" />
                      </span>
                    ) : isReview ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] bg-[#FDF6E9] text-[#B78D4F] border border-[#F2E3C6]" title="Review Required">
                        <Clock size={16} weight="bold" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] bg-[#EEF2F5] text-[#5D6F7E] border border-[#D5DEE5]" title="Pending Action">
                        <ShieldWarning size={16} weight="bold" />
                      </span>
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-sans text-[13px] font-semibold text-[#1D1D1A] group-hover:text-[#000]">
                        {item.title}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded-[2px] bg-[#EAE4D7] text-[#59554C]">
                        {item.category}
                      </span>
                    </div>

                    <p className="font-sans text-[12px] text-[#6F6B63] mt-0.5 truncate max-w-2xl" title={item.detail}>
                      {item.detail}
                    </p>
                  </div>
                </div>

                {/* Right Section: Time & Primary Action Button */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pl-10 md:pl-0">
                  <span className="font-mono text-[11px] text-[#8A877B] flex items-center gap-1" title={item.time}>
                    <Clock size={12} weight="regular" />
                    {age(item.time)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleDismiss(item.key, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity font-sans text-[11px] text-[#8A877B] hover:text-[#59554C] px-2 py-1 hover:bg-[#EAE4D7] rounded-[3px] cursor-pointer"
                      title="Acknowledge & dismiss from queue"
                    >
                      Dismiss
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        item.open();
                      }}
                      className="inline-flex items-center gap-1.5 font-sans text-[12px] font-medium px-3 py-1.5 rounded-[4px] bg-[#F1E8D6] hover:bg-[#E5DAC4] text-[#1D1D1A] border border-[#D8CBB6] transition-colors shadow-2xs cursor-pointer"
                    >
                      <span>{item.action}</span>
                      <ArrowUpRight size={13} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Workbench Footer Bar */}
      <div className="px-6 py-2.5 bg-[#F6F1E6] border-t border-[#E8E2D5] flex items-center justify-between text-[11px] text-[#8A877B] font-mono">
        <span>Triage Queue · Updated Live</span>
        <span>Showing {filtered.length} of {activeAlerts.length} actionable items</span>
      </div>
    </section>
  );
};
