'use client';

import { memo } from 'react';
import {
  Compass,
  Package,
  AlertTriangle,
  BarChart3,
  HeartPulse,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import type { User } from '@/lib/nexafreight/types';

export type WorkspaceScreen = 'map' | 'shipments' | 'disruptions' | 'analytics' | 'calibration';

interface TacticalNavRailProps {
  activeScreen: WorkspaceScreen;
  onSelectScreen: (screen: WorkspaceScreen) => void;
  alertCount?: number;
  user: User | null;
  onLogout?: () => void;
}

interface NavItemDef {
  key: WorkspaceScreen;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  shortcut: string;
  badge?: number;
}

function TacticalNavRailComponent({
  activeScreen,
  onSelectScreen,
  alertCount = 0,
  user,
  onLogout,
}: TacticalNavRailProps) {
  const navItems: NavItemDef[] = [
    {
      key: 'map',
      label: 'Control Tower',
      sublabel: 'Tactical Map & AIS Telemetry',
      icon: Compass,
      shortcut: '1',
    },
    {
      key: 'shipments',
      label: 'Shipment Manifest',
      sublabel: 'Milestone Waybills & Legs',
      icon: Package,
      shortcut: '2',
    },
    {
      key: 'disruptions',
      label: 'Disruption Center',
      sublabel: 'Active Breaches & Rerouting',
      icon: AlertTriangle,
      shortcut: '3',
      badge: alertCount > 0 ? alertCount : undefined,
    },
    {
      key: 'analytics',
      label: 'Operational Analytics',
      sublabel: 'Demurrage, SLA & CO2 Ledger',
      icon: BarChart3,
      shortcut: '4',
    },
    {
      key: 'calibration',
      label: 'Sensor Calibration',
      sublabel: 'Feed Health & Matrix',
      icon: HeartPulse,
      shortcut: '5',
    },
  ];

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-[58px] z-[1060] flex flex-col justify-between items-center py-3 select-none"
      style={{
        backgroundColor: 'var(--paper)',
        borderRight: '1px solid var(--border-hairline)',
        boxShadow: 'none',
      }}
      aria-label="Tactical Workspace Navigation"
    >
      {/* Top: Brand Monogram */}
      <div className="flex flex-col items-center gap-3 w-full">
        <button
          onClick={() => onSelectScreen('map')}
          className="w-9 h-9 flex items-center justify-center rounded-[3px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--cobalt)]"
          style={{
            backgroundColor: 'var(--cobalt)',
            color: 'var(--paper)',
          }}
          title="NexaFreight Control Tower"
        >
          <span className="font-mono text-[13px] font-bold tracking-tight">NF</span>
        </button>

        {/* Separator Hairline */}
        <div className="w-6 h-[1px]" style={{ backgroundColor: 'var(--border-hairline)' }} />

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5 items-center w-full px-1">
          {navItems.map((item) => {
            const isActive = activeScreen === item.key;
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                onClick={() => onSelectScreen(item.key)}
                className="relative group w-10 h-10 flex items-center justify-center rounded-[3px] transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--cobalt)]"
                style={{
                  backgroundColor: isActive ? 'var(--bg-subtle)' : 'transparent',
                  border: isActive ? '1px solid var(--border-hairline)' : '1px solid transparent',
                  color: isActive ? 'var(--cobalt)' : 'var(--text-secondary)',
                }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                {/* Active Left Indicator Notch */}
                {isActive && (
                  <span
                    className="absolute left-[-5px] top-[7px] bottom-[7px] w-[3px] rounded-r-[2px]"
                    style={{ backgroundColor: 'var(--cobalt)' }}
                  />
                )}

                <Icon
                  style={{
                    width: 18,
                    height: 18,
                    strokeWidth: isActive ? 2.2 : 1.7,
                  }}
                />

                {/* Badge if present (e.g. active alerts) */}
                {item.badge !== undefined && (
                  <span
                    className="absolute -top-1 -right-1 px-1 min-w-[15px] h-[15px] flex items-center justify-center rounded-[2px] font-mono text-[9px] font-bold text-white"
                    style={{ backgroundColor: 'var(--oxide-risk)' }}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Tactical Hover Flyout Tooltip (Aligned to Right) */}
                <div
                  className="pointer-events-none absolute left-[54px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[1200] whitespace-nowrap px-2.5 py-1.5 rounded-[2px] shadow-sm flex flex-col gap-0.5"
                  style={{
                    backgroundColor: 'var(--ink)',
                    color: 'var(--paper)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-ui text-[12px] font-semibold">{item.label}</span>
                    <span
                      className="font-mono text-[9px] px-1 py-0.2 rounded-[2px] bg-white/20 text-white"
                    >
                      [{item.shortcut}]
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-white/70">{item.sublabel}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Operator Profile & Session Action */}
      <div className="flex flex-col items-center gap-2 w-full px-1">
        <div className="w-6 h-[1px]" style={{ backgroundColor: 'var(--border-hairline)' }} />

        {/* User Monogram */}
        <div
          className="relative group w-9 h-9 flex items-center justify-center rounded-[3px] cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-hairline)',
            color: 'var(--ink)',
          }}
          title={user?.email || 'Operator'}
        >
          <UserIcon style={{ width: 16, height: 16 }} />

          {/* User tooltip */}
          <div
            className="pointer-events-none absolute left-[54px] bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[1200] whitespace-nowrap px-2.5 py-1.5 rounded-[2px] shadow-sm flex flex-col gap-0.5"
            style={{
              backgroundColor: 'var(--ink)',
              color: 'var(--paper)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span className="font-ui text-[12px] font-semibold">{user?.full_name || 'Operator'}</span>
            <span className="font-mono text-[10px] text-white/70">{user?.email || 'operator@nexafreight.dev'}</span>
            <span className="font-mono text-[9px] text-[var(--moss-positive)] uppercase mt-0.5">
              Role: {user?.role || 'OPERATOR'}
            </span>
          </div>
        </div>

        {/* Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-8 h-8 flex items-center justify-center rounded-[3px] text-[var(--text-secondary)] hover:text-[var(--oxide-risk)] hover:bg-black/5 transition-colors"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut style={{ width: 15, height: 15 }} />
          </button>
        )}
      </div>
    </aside>
  );
}

export const TacticalNavRail = memo(TacticalNavRailComponent);
export default TacticalNavRail;
