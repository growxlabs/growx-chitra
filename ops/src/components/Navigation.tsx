import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  SquaresFour,
  Buildings,
  Images,
  CreditCard,
  Coins,
  ShieldCheck,
  Trash,
  ChatCircle,
  GearSix,
  ClipboardText,
  ArrowsClockwise,
  UserCircle,
  type Icon
} from '@phosphor-icons/react';
import type { OperatorUser } from '../types';

export type NavSection = 'overview' | 'businesses' | 'jobs' | 'payments' | 'credits' | 'safety' | 'deletions' | 'support' | 'settings' | 'audit-logs';
interface NavigationProps {
  currentSection: NavSection;
  onSelect: (section: NavSection) => void;
  pendingAlertsCount?: number;
  operator?: OperatorUser | null;
  onRefresh?: () => void;
  isLoading?: boolean;
}
const groups: { label: string; items: { id: NavSection; label: string; icon: Icon }[] }[] = [
  { label: 'Workspace', items: [{ id: 'overview', label: 'Overview', icon: SquaresFour }, { id: 'businesses', label: 'Businesses', icon: Buildings }, { id: 'jobs', label: 'Image jobs', icon: Images }] },
  { label: 'Commerce', items: [{ id: 'payments', label: 'Payments', icon: CreditCard }, { id: 'credits', label: 'Credit ledger', icon: Coins }] },
  { label: 'Trust and support', items: [{ id: 'safety', label: 'Safety', icon: ShieldCheck }, { id: 'deletions', label: 'Deletion requests', icon: Trash }, { id: 'support', label: 'Support', icon: ChatCircle }] },
  { label: 'Administration', items: [{ id: 'settings', label: 'Settings', icon: GearSix }, { id: 'audit-logs', label: 'Audit trail', icon: ClipboardText }] }
];

export const Navigation: React.FC<NavigationProps> = ({ currentSection, onSelect, pendingAlertsCount = 0, operator, onRefresh, isLoading }) => {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const showLabel = (element: HTMLElement, text: string) => {
    const rect = element.getBoundingClientRect();
    setTooltip({ text, x: rect.right + 13, y: Math.max(24, Math.min(window.innerHeight - 24, rect.top + rect.height / 2)) });
  };
  const hint = (text: string) => ({
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => showLabel(event.currentTarget, text),
    onMouseLeave: () => setTooltip(null),
    onFocus: (event: React.FocusEvent<HTMLElement>) => showLabel(event.currentTarget, text),
    onBlur: () => setTooltip(null),
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => { if (event.key === 'Escape') setTooltip(null); }
  });
  return <aside className="ops-rail" aria-label="Operations rail">
    <button className="rail-brand" aria-label="Growx Chitra overview" onClick={() => { setTooltip(null); onSelect('overview'); }} {...hint('Growx Chitra · Overview')}>GC</button>
    <nav className="rail-navigation" aria-label="Workspace navigation" onScroll={() => setTooltip(null)}>
      {groups.map(group => <div className="rail-group" role="group" aria-label={group.label} key={group.label}>
        {group.items.map(({ id, label, icon: Glyph }) => {
          const active = currentSection === id;
          const hasAlerts = id === 'overview' && pendingAlertsCount > 0;
          const description = hasAlerts ? `${label} · ${pendingAlertsCount} items need attention` : label;
          return <button key={id} className={`rail-button${active ? ' is-active' : ''}`} aria-label={description} aria-current={active ? 'page' : undefined} onClick={() => { setTooltip(null); onSelect(id); }} {...hint(description)}>
            <Glyph size={21} weight={active ? 'duotone' : 'regular'} aria-hidden="true" />
            {hasAlerts && <span className="rail-alert" aria-hidden="true" />}
          </button>;
        })}
      </div>)}
    </nav>
    <div className="rail-footer">
      {onRefresh && <button className="rail-button" disabled={isLoading} aria-label={isLoading ? 'Refreshing workspace' : 'Refresh workspace'} onClick={onRefresh} {...hint(isLoading ? 'Refreshing workspace' : 'Refresh workspace')}><ArrowsClockwise size={20} weight="regular" className={isLoading ? 'rail-spinning' : ''} aria-hidden="true" /></button>}
      <div className="rail-profile" tabIndex={0} role="img" aria-label={operator ? `${operator.name} · ${operator.role}` : 'Identity unverified'} {...hint(operator ? `${operator.name} · ${operator.role}` : 'Identity unverified')}><UserCircle size={24} weight="duotone" aria-hidden="true" /></div>
    </div>
    {tooltip && createPortal(<div className="rail-tooltip" role="tooltip" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.text}</div>, document.body)}
  </aside>;
};
