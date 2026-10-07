import { EmptyState, Notice } from '../components/Workspace';
import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { SettingsData, OperatorUser } from '../types';
import { SettingsWorkbench } from '../components/SettingsWorkbench';

interface SettingsPageProps {
  currentUser: OperatorUser | null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser }) => {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  return (
    <div className="space-y-6 select-text">
      {error && (
        <Notice tone="error">{error}</Notice>
      )}

      {loading && !settings ? (
        <EmptyState loading>Loading settings…</EmptyState>
      ) : !settings ? (
        <div className="py-12 font-sans text-[14px] text-[#6F6B63]">No settings available.</div>
      ) : (
        <SettingsWorkbench
          settings={settings}
          currentUser={currentUser}
          onReload={() => void loadSettings()}
          loading={loading}
        />
      )}
    </div>
  );
};
