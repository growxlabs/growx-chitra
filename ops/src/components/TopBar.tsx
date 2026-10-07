import React, { useState } from 'react';
import type { OperatorUser } from '../types';
import { isMockModeActive, setMockModeActive } from '../api';
interface TopBarProps { operator: OperatorUser | null; title: string; subtitle?: string; onRefresh?: () => void; isLoading?: boolean; lastSynced?: Date | null; syncError?: boolean; }
export const TopBar: React.FC<TopBarProps> = ({ operator, title, subtitle, onRefresh, isLoading, lastSynced, syncError }) => {
  const [mockActive, setMockActive] = useState(isMockModeActive());
  return <header className="workspace-topbar">
    <div className="breadcrumbs"><span>WORKSPACE</span><span aria-hidden="true">/</span><strong>{title}</strong>{subtitle && <small title={subtitle}>{subtitle}</small>}</div>
    <div className="topbar-actions">
      <span className={`sync-status ${syncError ? 'sync-error' : ''}`} role="status">{isLoading ? 'Updating overview…' : syncError ? 'Overview sync failed' : lastSynced ? `Overview updated ${lastSynced.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST` : 'Not yet synced'}</span>
      <button className="mode-button" disabled={isLoading} title={mockActive ? 'Switch to authenticated live data' : 'Switch to sample data'} onClick={() => { setMockModeActive(!mockActive); setMockActive(!mockActive); onRefresh?.(); }}>{mockActive ? 'Sample data' : 'Live data'}</button>
      <button className="quiet-button" onClick={onRefresh} disabled={isLoading}>{isLoading ? 'Syncing…' : 'Sync'}</button>
      <span className="topbar-avatar" title={operator ? `${operator.email} · ${operator.role}${mockActive ? ' · sample identity' : ''}` : 'Identity unverified'}>{operator?.name?.slice(0, 1) || '—'}</span>
    </div>
  </header>;
};
