import React from 'react';
import {
  Key,
  ShieldCheck,
  Cpu,
  Hourglass,
  SlidersHorizontal,
  Coins,
  ArrowsClockwise,
  LockKey
} from '@phosphor-icons/react';
import type { SettingsData, OperatorUser } from '../types';
import { Button } from './Workspace';

interface SettingsWorkbenchProps {
  settings: SettingsData;
  currentUser: OperatorUser | null;
  onReload: () => void;
  loading?: boolean;
}

export const SettingsWorkbench: React.FC<SettingsWorkbenchProps> = ({
  settings,
  currentUser,
  onReload,
  loading = false,
}) => {
  const secrets = Object.entries(settings.secrets_status);
  const okSecretsCount = secrets.filter(([_, status]) => status.toLowerCase().includes('configured')).length;

  return (
    <div className="space-y-6 select-text">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & TELEMETRY STRIP                                          */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#D8D0C4]">
        <div>
          <h1 className="font-sans text-[26px] font-semibold text-[#1D1D1A] tracking-[-0.02em] leading-tight">
            Settings & Operations Config
          </h1>
          <p className="font-sans text-[13px] text-[#6F6B63] mt-0.5">
            View operator identity, infrastructure bindings, upstream secrets, and operational quotas.
          </p>
        </div>

        <Button
          onClick={onReload}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 font-sans text-[12px] font-semibold bg-[#FCFAF5] hover:bg-[#F2ECE1] text-[#1D1D1A] border border-[#D8D0C4] rounded-[4px] shadow-2xs transition-all cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <ArrowsClockwise size={14} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Reloading…' : 'Reload Config'}</span>
        </Button>
      </div>

      {/* ========================================================================= */}
      {/* 2. ACCOUNT ACCESS & IDENTITY RUNTIME CARD                                */}
      {/* ========================================================================= */}
      <div className="bg-[#FCFAF5] border border-[#D8D0C4] rounded-[6px] p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E2D5]">
          <span className="font-sans text-[12px] font-semibold text-[#56594F] uppercase tracking-wide flex items-center gap-1.5">
            <LockKey size={16} weight="duotone" className="text-[#4F6B57]" />
            Operator Access & Zero-Trust Boundary
          </span>
          <span className="font-mono text-[10px] font-medium text-[#4F6B57] bg-[#EAF0EB] border border-[#D1E0D3] px-2 py-0.5 rounded-[3px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F6B57]" />
            CLOUDFLARE ACCESS ENFORCED
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-1">
            <span className="font-sans text-[11px] font-medium text-[#6F6B63] uppercase tracking-wider block">
              Authenticated Operator
            </span>
            <div className="font-mono text-[13px] font-medium text-[#1D1D1A] truncate" title={currentUser?.email || 'Unknown'}>
              {currentUser?.email || 'Unknown'}
            </div>
            <span className="font-mono text-[10px] text-[#8A877B]">Identity Assertion Header: cf-access</span>
          </div>

          <div className="space-y-1">
            <span className="font-sans text-[11px] font-medium text-[#6F6B63] uppercase tracking-wider block">
              Role Authorization
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[13px] font-semibold text-[#1D1D1A] uppercase">
                {currentUser?.role || 'viewer'}
              </span>
              <span className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded-[2px] bg-[#EAE4D7] text-[#59554C]">
                FULL PRIVILEGE
              </span>
            </div>
            <span className="font-mono text-[10px] text-[#8A877B]">Write permissions granted</span>
          </div>

          <div className="space-y-1">
            <span className="font-sans text-[11px] font-medium text-[#6F6B63] uppercase tracking-wider block">
              Target Ingress Domain
            </span>
            <div className="font-mono text-[13px] font-medium text-[#1D1D1A]">
              ops.chitra.growxlabs.tech
            </div>
            <span className="font-mono text-[10px] text-[#8A877B]">TLS 1.3 · Mutual Auth Active</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SERVICE SETUP & UPSTREAM SECRET BINDINGS                              */}
      {/* ========================================================================= */}
      <div className="bg-[#FCFAF5] border border-[#D8D0C4] rounded-[6px] overflow-hidden">
        <div className="px-5 py-3.5 bg-[#FBF8F2] border-b border-[#E8E2D5] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Key size={16} weight="duotone" className="text-[#B78D4F]" />
            <h2 className="font-sans text-[14px] font-semibold text-[#1D1D1A]">
              Upstream Service & Secret Bindings
            </h2>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[3px] bg-[#EAE4D7] text-[#59554C]">
              {okSecretsCount}/{secrets.length} LIVE
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#4F6B57] flex items-center gap-1.5">
            <ShieldCheck size={14} weight="bold" />
            Zero Raw Secret Leakage Enforced
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {secrets.map(([secretName, status]) => {
            const isOk = status.toLowerCase().includes('configured');
            return (
              <div
                key={secretName}
                className="flex items-center justify-between p-3 rounded-[4px] bg-[#FAF7F0] border border-[#E3DC CE] hover:border-[#C5BEB1] transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-mono text-[12px] font-medium text-[#1D1D1A] truncate" title={secretName}>
                    {secretName}
                  </div>
                  <div className="font-mono text-[10px] text-[#8A877B]">Encrypted in Cloudflare Secrets</div>
                </div>

                <div className="shrink-0">
                  {isOk ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium text-[#4F6B57] bg-[#EAF0EB] border border-[#D1E0D3] px-2 py-0.5 rounded-[3px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4F6B57]" />
                      Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium text-[#9E4A43] bg-[#F9EBE9] border border-[#ECD1CD] px-2 py-0.5 rounded-[3px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9E4A43]" />
                      Missing
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DUAL COLUMN: IMAGE GENERATION & DATA RETENTION RULES                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Image Generation Engine */}
        <div className="bg-[#FCFAF5] border border-[#D8D0C4] rounded-[6px] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E8E2D5]">
              <span className="font-sans text-[13px] font-semibold text-[#1D1D1A] flex items-center gap-1.5">
                <Cpu size={16} weight="duotone" className="text-[#5D6F7E]" />
                Image Generation Pipeline
              </span>
              <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-[3px] bg-[#EEF2F5] text-[#5D6F7E] border border-[#D5DEE5]">
                WORKERS AI / OPENAI
              </span>
            </div>

            <dl className="divide-y divide-[#EFE9DC] text-[13px]">
              <div className="py-2.5 flex items-center justify-between">
                <dt className="font-sans text-[#6F6B63]">Primary Vision Model</dt>
                <dd className="font-mono font-medium text-[#1D1D1A] bg-[#EAE4D7] px-2 py-0.5 rounded-[3px]">
                  {settings.configuration.image_model}
                </dd>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <dt className="font-sans text-[#6F6B63]">Quality Preset Mode</dt>
                <dd className="font-mono font-semibold text-[#4F6B57] uppercase">
                  {settings.configuration.image_quality}
                </dd>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <dt className="font-sans text-[#6F6B63]">Free Tier Welcome Allowance</dt>
                <dd className="font-mono font-medium text-[#1D1D1A]">
                  <strong className="text-[#4F6B57]">+{settings.configuration.free_trial_credits} credits</strong> on onboarding
                </dd>
              </div>
            </dl>
          </div>

          <div className="pt-3 border-t border-[#E8E2D5] flex items-center justify-between font-mono text-[10px] text-[#8A877B]">
            <span>Timeout deadline: 120s</span>
            <span>Delivery verification required</span>
          </div>
        </div>

        {/* Card: Data Lifecycle & Retention */}
        <div className="bg-[#FCFAF5] border border-[#D8D0C4] rounded-[6px] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E8E2D5]">
              <span className="font-sans text-[13px] font-semibold text-[#1D1D1A] flex items-center gap-1.5">
                <Hourglass size={16} weight="duotone" className="text-[#B78D4F]" />
                Data Lifecycle & Auto-Purge
              </span>
              <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-[3px] bg-[#FDF6E9] text-[#715C36] border border-[#F2E3C6]">
                AUTO RETENTION
              </span>
            </div>

            <dl className="divide-y divide-[#EFE9DC] text-[13px]">
              <div className="py-2.5 flex items-center justify-between">
                <dt className="font-sans text-[#6F6B63]">Original Customer Uploads</dt>
                <dd className="font-mono font-medium text-[#1D1D1A]">
                  {settings.configuration.retention.original_image_days} days
                </dd>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <dt className="font-sans text-[#6F6B63]">Generated Final Images</dt>
                <dd className="font-mono font-medium text-[#1D1D1A]">
                  {settings.configuration.retention.generated_image_days} days
                </dd>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <dt className="font-sans text-[#6F6B63]">Blocked Candidate Retention</dt>
                <dd className="font-mono font-medium text-[#9E4A43]">
                  {settings.configuration.retention.blocked_image_hours} hours
                </dd>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <dt className="font-sans text-[#6F6B63]">Safety & Moderation Events</dt>
                <dd className="font-mono font-medium text-[#1D1D1A]">
                  {settings.configuration.retention.safety_event_days} days
                </dd>
              </div>
            </dl>
          </div>

          <div className="pt-3 border-t border-[#E8E2D5] flex items-center justify-between font-mono text-[10px] text-[#8A877B]">
            <span>Cloudflare R2 lifecycle rules</span>
            <span>GDPR/DPDP compliant purge</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. OPERATIONAL QUOTAS & USAGE LIMITS                                     */}
      {/* ========================================================================= */}
      <div className="bg-[#FCFAF5] border border-[#D8D0C4] rounded-[6px] p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E8E2D5]">
          <span className="font-sans text-[13px] font-semibold text-[#1D1D1A] flex items-center gap-1.5">
            <SlidersHorizontal size={16} weight="duotone" className="text-[#56594F]" />
            Operational Rate Limits & Quotas
          </span>
          <span className="font-mono text-[10px] text-[#8A877B]">
            Enforced per merchant WhatsApp ID
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-3 bg-[#FAF7F0] border border-[#E3DCCE] rounded-[4px]">
            <span className="font-sans text-[11px] font-semibold text-[#6F6B63] uppercase tracking-wider block">
              Max Upload
            </span>
            <div className="font-mono text-[20px] font-semibold text-[#1D1D1A] mt-1 tabular-nums">
              {(parseInt(settings.configuration.limits.max_upload_bytes, 10) / (1024 * 1024)).toFixed(1)} MB
            </div>
            <span className="font-mono text-[9px] text-[#8A877B]">Payload limit</span>
          </div>

          <div className="p-3 bg-[#FAF7F0] border border-[#E3DCCE] rounded-[4px]">
            <span className="font-sans text-[11px] font-semibold text-[#6F6B63] uppercase tracking-wider block">
              Max Dimension
            </span>
            <div className="font-mono text-[20px] font-semibold text-[#1D1D1A] mt-1 tabular-nums">
              {settings.configuration.limits.max_image_width}px
            </div>
            <span className="font-mono text-[9px] text-[#8A877B]">Width bounds</span>
          </div>

          <div className="p-3 bg-[#FAF7F0] border border-[#E3DCCE] rounded-[4px]">
            <span className="font-sans text-[11px] font-semibold text-[#6F6B63] uppercase tracking-wider block">
              Images / Hr
            </span>
            <div className="font-mono text-[20px] font-semibold text-[#1D1D1A] mt-1 tabular-nums">
              {settings.configuration.limits.max_images_per_hour}
            </div>
            <span className="font-mono text-[9px] text-[#8A877B]">Generation speed</span>
          </div>

          <div className="p-3 bg-[#FAF7F0] border border-[#E3DCCE] rounded-[4px]">
            <span className="font-sans text-[11px] font-semibold text-[#6F6B63] uppercase tracking-wider block">
              Commands / Min
            </span>
            <div className="font-mono text-[20px] font-semibold text-[#1D1D1A] mt-1 tabular-nums">
              {settings.configuration.limits.max_commands_per_minute}
            </div>
            <span className="font-mono text-[9px] text-[#8A877B]">Chat burst cap</span>
          </div>

          <div className="p-3 bg-[#FAF7F0] border border-[#E3DCCE] rounded-[4px]">
            <span className="font-sans text-[11px] font-semibold text-[#6F6B63] uppercase tracking-wider block">
              Pay Links / Hr
            </span>
            <div className="font-mono text-[20px] font-semibold text-[#1D1D1A] mt-1 tabular-nums">
              {settings.configuration.limits.max_payment_links_per_hour}
            </div>
            <span className="font-mono text-[9px] text-[#8A877B]">Razorpay link</span>
          </div>

          <div className="p-3 bg-[#FAF7F0] border border-[#E3DCCE] rounded-[4px]">
            <span className="font-sans text-[11px] font-semibold text-[#6F6B63] uppercase tracking-wider block">
              Brand Setups
            </span>
            <div className="font-mono text-[20px] font-semibold text-[#1D1D1A] mt-1 tabular-nums">
              {settings.configuration.limits.max_brand_setup_attempts_per_hour}
            </div>
            <span className="font-mono text-[9px] text-[#8A877B]">Logo setups / hr</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. CREDIT PLANS & PRICING CATALOG                                        */}
      {/* ========================================================================= */}
      <div className="bg-[#FCFAF5] border border-[#D8D0C4] rounded-[6px] overflow-hidden">
        <div className="px-5 py-3.5 bg-[#FBF8F2] border-b border-[#E8E2D5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins size={16} weight="duotone" className="text-[#4F6B57]" />
            <h2 className="font-sans text-[14px] font-semibold text-[#1D1D1A]">
              Credit Packages & Razorpay Catalog
            </h2>
          </div>
          <span className="font-mono text-[10px] text-[#8A877B]">
            All prices inclusive of taxes · Indian Rupee (INR)
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(settings.configuration.plans).map(([key, plan]) => {
            const priceInr = plan.priceMinor / 100;
            const perCredit = (priceInr / plan.credits).toFixed(2);
            const isGrowth = key.toLowerCase().includes('growth');
            const isPro = key.toLowerCase().includes('pro');

            return (
              <div
                key={key}
                className={`p-5 rounded-[5px] border transition-all ${
                  isGrowth
                    ? 'bg-[#FBF8F2] border-[#4F6B57]/40 ring-1 ring-[#4F6B57]/20'
                    : 'bg-[#FAF7F0] border-[#E3DCCE]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[11px] font-semibold uppercase text-[#59554C] tracking-wide">
                    {key}
                  </span>
                  {isGrowth && (
                    <span className="font-mono text-[9px] font-semibold px-2 py-0.5 rounded-[3px] bg-[#EAF0EB] text-[#4F6B57] border border-[#D1E0D3]">
                      POPULAR
                    </span>
                  )}
                  {isPro && (
                    <span className="font-mono text-[9px] font-semibold px-2 py-0.5 rounded-[3px] bg-[#EEF2F5] text-[#5D6F7E] border border-[#D5DEE5]">
                      VALUE
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <strong className="font-mono text-[28px] font-semibold text-[#1D1D1A]">
                    ₹{priceInr.toLocaleString('en-IN')}
                  </strong>
                  <span className="font-sans text-[12px] text-[#6F6B63]">/ pack</span>
                </div>

                <div className="font-sans text-[13px] font-medium text-[#1D1D1A] mb-3">
                  {plan.name}
                </div>

                <div className="pt-3 border-t border-[#E8E2D5] space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#6F6B63]">Total Credits</span>
                    <strong className="text-[#4F6B57]">+{plan.credits} credits</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6F6B63]">Unit Cost</span>
                    <span className="text-[#1D1D1A]">₹{perCredit} / image</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
