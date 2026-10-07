import React from 'react';
import { ShieldCheck, ShieldWarning, UserFocus, EyeSlash, WarningOctagon, Prohibit } from '@phosphor-icons/react';
import type { SafetyOverview } from '../types';

interface SafetyMetricInstrumentsProps {
  metrics: SafetyOverview['metrics'];
}

export const SafetyMetricInstruments: React.FC<SafetyMetricInstrumentsProps> = ({ metrics }) => {
  const {
    total_blocked_inputs,
    total_blocked_outputs,
    person_detected_events,
    sexual_explicit_events,
    repeated_abuse_accounts,
    suspended_accounts,
  } = metrics;

  const totalIntercepts = total_blocked_inputs + total_blocked_outputs;
  const inputRatio = totalIntercepts > 0 ? ((total_blocked_inputs / totalIntercepts) * 100).toFixed(0) : '0';
  const outputRatio = totalIntercepts > 0 ? ((total_blocked_outputs / totalIntercepts) * 100).toFixed(0) : '0';

  // SVG Gauge calculations for Input Filter (r = 24, Circ ≈ 150.8)
  const rGauge = 24;
  const circ = 2 * Math.PI * rGauge;
  const inputFrac = totalIntercepts > 0 ? total_blocked_inputs / totalIntercepts : 0.8;
  const inputStroke = inputFrac * circ;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 select-text">
      {/* ========================================================================= */}
      {/* 1. BLOCKED INPUTS (INTAKE GATE)                                           */}
      {/* ========================================================================= */}
      <div className="bg-[#FCFAF5] border border-[#D8D0C4] rounded-[6px] p-4 flex flex-col justify-between transition-all hover:border-[#9A9B80]">
        <div>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="font-sans text-[12px] font-semibold text-[#56594F] flex items-center gap-1.5 uppercase tracking-wide">
              <ShieldWarning size={15} weight="duotone" className="text-[#9E4A43]" />
              Blocked Inputs
            </span>
            <span className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px] bg-[#F9EBE9] text-[#9E4A43] border border-[#ECD1CD]">
              {inputRatio}% OF BLOCKS
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <strong className="font-mono text-[28px] font-semibold text-[#1D1D1A] leading-none tabular-nums">
              {total_blocked_inputs.toLocaleString('en-IN')}
            </strong>
            <span className="font-sans text-[11px] text-[#6F6B63]">at intake</span>
          </div>
        </div>

        {/* Visual: Donut Segment Gauge */}
        <div className="pt-2 border-t border-[#E8E2D5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r={rGauge} fill="none" stroke="#EAE4D7" strokeWidth="5" />
              <circle
                cx="28"
                cy="28"
                r={rGauge}
                fill="none"
                stroke="#9E4A43"
                strokeWidth="5"
                strokeDasharray={`${inputStroke} ${circ}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="font-mono text-[10px] leading-tight text-[#6F6B63]">
              <div><strong className="text-[#1D1D1A] font-semibold">Pre-AI</strong> check</div>
              <div>Intake gate</div>
            </div>
          </div>
          <span className="font-mono text-[10px] text-[#9E4A43] font-medium">Screened</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BLOCKED OUTPUTS (EGRESS SHIELD)                                        */}
      {/* ========================================================================= */}
      <div className="bg-[#FCFAF5] border border-[#D8D0C4] rounded-[6px] p-4 flex flex-col justify-between transition-all hover:border-[#9A9B80]">
        <div>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="font-sans text-[12px] font-semibold text-[#56594F] flex items-center gap-1.5 uppercase tracking-wide">
              <ShieldCheck size={15} weight="duotone" className="text-[#B78D4F]" />
              Blocked Outputs
            </span>
            <span className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px] bg-[#FDF6E9] text-[#715C36] border border-[#F2E3C6]">
              {outputRatio}% OF BLOCKS
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <strong className="font-mono text-[28px] font-semibold text-[#1D1D1A] leading-none tabular-nums">
              {total_blocked_outputs.toLocaleString('en-IN')}
            </strong>
            <span className="font-sans text-[11px] text-[#6F6B63]">before dispatch</span>
          </div>
        </div>

        {/* Visual: Progress Bar */}
        <div className="pt-2 border-t border-[#E8E2D5]">
          <div className="w-full h-2 rounded-[3px] bg-[#EAE4D7] overflow-hidden mb-1.5">
            <div
              className="h-full bg-[#B78D4F] rounded-[2px]"
              style={{ width: `${Math.min(100, (total_blocked_outputs / Math.max(1, totalIntercepts)) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between font-mono text-[10px] text-[#8A877B]">
            <span>Post-gen audit</span>
            <span className="text-[#B78D4F] font-semibold">Zero leakage</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PERSON DETECTED (DETR MODEL)                                           */}
      {/* ========================================================================= */}
      <div className="bg-[#FCFAF5] border border-[#D8D0C4] rounded-[6px] p-4 flex flex-col justify-between transition-all hover:border-[#9A9B80]">
        <div>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="font-sans text-[12px] font-semibold text-[#56594F] flex items-center gap-1.5 uppercase tracking-wide">
              <UserFocus size={15} weight="duotone" className="text-[#5D6F7E]" />
              Person Detected
            </span>
            <span className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px] bg-[#EEF2F5] text-[#5D6F7E] border border-[#D5DEE5]">
              DETR MODEL
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <strong className="font-mono text-[28px] font-semibold text-[#1D1D1A] leading-none tabular-nums">
              {person_detected_events.toLocaleString('en-IN')}
            </strong>
            <span className="font-sans text-[11px] text-[#6F6B63]">events</span>
          </div>
        </div>

        {/* Visual: Confidence spark bar */}
        <div className="pt-2 border-t border-[#E8E2D5]">
          <div className="flex items-center justify-between gap-1 h-3 mb-1">
            {[45, 70, 85, 92, 98].map((pct, idx) => (
              <span
                key={idx}
                className="flex-1 rounded-[1px] h-full"
                style={{
                  backgroundColor: idx >= 3 ? '#9E4A43' : idx >= 2 ? '#B78D4F' : '#C5BEB1',
                  opacity: 0.85
                }}
                title={`Threshold bracket >0.${pct}`}
              />
            ))}
          </div>
          <div className="flex justify-between font-mono text-[10px] text-[#8A877B]">
            <span>Threshold &gt;0.70</span>
            <span className="text-[#5D6F7E]">Workers AI</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. EXPLICIT FILTERED (OMNI-MODERATION)                                    */}
      {/* ========================================================================= */}
      <div className="bg-[#FCFAF5] border border-[#D8D0C4] rounded-[6px] p-4 flex flex-col justify-between transition-all hover:border-[#9A9B80]">
        <div>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="font-sans text-[12px] font-semibold text-[#56594F] flex items-center gap-1.5 uppercase tracking-wide">
              <EyeSlash size={15} weight="duotone" className="text-[#9E4A43]" />
              Explicit Filtered
            </span>
            <span className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px] bg-[#F9EBE9] text-[#9E4A43] border border-[#ECD1CD]">
              STRICT
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <strong className="font-mono text-[28px] font-semibold text-[#1D1D1A] leading-none tabular-nums">
              {sexual_explicit_events.toLocaleString('en-IN')}
            </strong>
            <span className="font-sans text-[11px] text-[#6F6B63]">flagged</span>
          </div>
        </div>

        {/* Visual: Status Indicator */}
        <div className="pt-2 border-t border-[#E8E2D5] flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-[#4F6B57]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F6B57]" />
            Scan Active
          </span>
          <span className="font-mono text-[10px] text-[#8A877B]">Omni-moderation</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. REPEAT VIOLATIONS                                                      */}
      {/* ========================================================================= */}
      <div className="bg-[#FCFAF5] border border-[#D8D0C4] rounded-[6px] p-4 flex flex-col justify-between transition-all hover:border-[#9A9B80]">
        <div>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="font-sans text-[12px] font-semibold text-[#56594F] flex items-center gap-1.5 uppercase tracking-wide">
              <WarningOctagon size={15} weight="duotone" className="text-[#B78D4F]" />
              Repeat Abuse
            </span>
            <span className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px] bg-[#FDF6E9] text-[#715C36] border border-[#F2E3C6]">
              &gt;1 EVENT
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <strong className="font-mono text-[28px] font-semibold text-[#1D1D1A] leading-none tabular-nums">
              {repeated_abuse_accounts.toLocaleString('en-IN')}
            </strong>
            <span className="font-sans text-[11px] text-[#6F6B63]">accounts</span>
          </div>
        </div>

        {/* Visual: Multi-event indicator */}
        <div className="pt-2 border-t border-[#E8E2D5] flex items-center justify-between">
          <div className="flex gap-1">
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={`w-3 h-1.5 rounded-[1px] ${
                  step <= repeated_abuse_accounts ? 'bg-[#B78D4F]' : 'bg-[#EAE4D7]'
                }`}
              />
            ))}
          </div>
          <span className="font-mono text-[10px] text-[#8A877B]">Watchlist</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. SUSPENDED ACCOUNTS                                                     */}
      {/* ========================================================================= */}
      <div className="bg-[#FCFAF5] border border-[#D8D0C4] rounded-[6px] p-4 flex flex-col justify-between transition-all hover:border-[#9E4A43]">
        <div>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="font-sans text-[12px] font-semibold text-[#9E4A43] flex items-center gap-1.5 uppercase tracking-wide">
              <Prohibit size={15} weight="duotone" className="text-[#9E4A43]" />
              Suspended
            </span>
            <span className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px] bg-[#F9EBE9] text-[#9E4A43] border border-[#ECD1CD]">
              LOCKED
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <strong className="font-mono text-[28px] font-semibold text-[#9E4A43] leading-none tabular-nums">
              {suspended_accounts.toLocaleString('en-IN')}
            </strong>
            <span className="font-sans text-[11px] text-[#9E4A43]/80">intake halted</span>
          </div>
        </div>

        {/* Visual: Lock Status */}
        <div className="pt-2 border-t border-[#E8E2D5] flex items-center justify-between font-mono text-[10px]">
          <span className="inline-flex items-center gap-1 text-[#9E4A43] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9E4A43]" />
            Enforced
          </span>
          <span className="text-[#8A877B]">Zero credits</span>
        </div>
      </div>
    </div>
  );
};
