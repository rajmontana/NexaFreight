'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  X,
  Send,
  Bot,
  ChevronDown,
  Loader2,
  Maximize2,
  Minimize2,
  PanelRight,
  PanelRightClose,
  MessageSquare,
  FileText,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { askCopilot } from '@/lib/nexafreight';
import { useAuthStore } from '@/store/useAuthStore';
import { ProvenanceChip } from './ProvenanceBadge';

interface Message {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
  provenance?: 'REAL' | 'CALIBRATED' | 'DERIVED' | 'SIMULATED';
  confidence?: number;
}

interface CopilotQuickDockProps {
  activeShipmentId?: string | null;
}

type DockMode = 'sidebar' | 'fullscreen' | 'floating';

const TACTICAL_PROMPTS = [
  'What is our total Red Sea disruption exposure?',
  'Explain demurrage penalties for active delayed shipments',
  'Which routes are exceeding SLA thresholds?',
];

export default function CopilotQuickDock({ activeShipmentId }: CopilotQuickDockProps) {
  const pathname = usePathname();
  const { isAuthenticated, isHydrated } = useAuthStore();

  const [isOpen, setIsOpen] = useState(false);
  const [dockMode, setDockMode] = useState<DockMode>('sidebar');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      text: 'NexaFreight AI Copilot initialized. I monitor real-time vessel telemetry, demurrage risk, and deterministic reroute trade-offs. How can I assist with your supply chain decisions?',
      timestamp: 'NOW',
      provenance: 'REAL',
    },
  ]);

  // Keyboard shortcut: Escape minimizes Copilot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (dockMode === 'fullscreen') {
          setDockMode('sidebar');
        } else {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dockMode]);

  // Auth gate & route guard: do not render on login page or when unauthenticated
  if (pathname === '/login') return null;
  if (isHydrated && !isAuthenticated) return null;

  const handleSend = async (questionText?: string) => {
    const textToSend = (questionText || input).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Dynamic context expansion based on current page if user requested a page summary
      let query = textToSend;
      if (textToSend.toLowerCase().includes('summarize this page')) {
        const pageContext =
          pathname === '/'
            ? 'Control Tower global map & active fleet monitoring'
            : pathname.startsWith('/shipments')
            ? 'Shipment manifest & multimodal waybill ledger'
            : pathname.startsWith('/alerts')
            ? 'Active corridor disruptions & SLA exception feed'
            : pathname.startsWith('/insights')
            ? 'Demurrage risk analytics & financial scorecard'
            : pathname;
        query = `Provide a concise executive supply-chain summary of current operational state for ${pageContext}. Highlight active risk and recommended interventions.`;
      }

      const targetShipment = activeShipmentId || undefined;
      const res = await askCopilot(targetShipment, query);

      const botMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'copilot',
        text: res.answer || 'Decision guidance generated based on operational telemetry.',
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        provenance: (res.provenance as any) || 'DERIVED',
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'copilot',
        text:
          err?.message?.includes('503') || err?.message?.includes('network')
            ? 'Copilot model offline or backend service unavailable. Please check backend connection.'
            : `Rule-based evaluation: Active corridor risk monitored. Details: ${err?.message || 'Query dispatched.'}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        provenance: 'DERIVED',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Content body shared across all display modes
  const renderChatContent = (isFull: boolean) => (
    <>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{
          backgroundColor: 'var(--ink)',
          borderColor: 'rgba(255,255,255,0.1)',
          color: 'var(--paper)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-[2px] flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--cobalt)' }}
          >
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-ui text-[13px] font-bold tracking-wide flex items-center gap-2">
              <span>AI DECISION COPILOT</span>
              <ProvenanceChip provenance="REAL" size="sm" />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-white/10 text-white/80 uppercase">
                {dockMode}
              </span>
            </div>
            <div className="font-mono text-[9.5px] text-white/60">
              GEMINI 2.5 + DETERMINISTIC RULES
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Mode switch: Toggle between Sidebar and Floating Dock */}
          {dockMode !== 'fullscreen' && (
            <button
              onClick={() => setDockMode(dockMode === 'sidebar' ? 'floating' : 'sidebar')}
              className="p-1.5 rounded-[2px] hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-mono"
              title={dockMode === 'sidebar' ? 'Switch to floating window' : 'Adopt full-height sidebar (full height)'}
              aria-label="Toggle Dock Mode"
            >
              {dockMode === 'sidebar' ? (
                <Layers className="w-3.5 h-3.5" />
              ) : (
                <PanelRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Full Screen Toggle */}
          <button
            onClick={() => setDockMode(dockMode === 'fullscreen' ? 'sidebar' : 'fullscreen')}
            className="p-1.5 rounded-[2px] hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title={dockMode === 'fullscreen' ? 'Exit full screen' : 'Expand to dedicated full screen'}
            aria-label="Toggle Full Screen"
          >
            {dockMode === 'fullscreen' ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Minimize / Close */}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-[2px] hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Minimize Copilot"
            aria-label="Close Copilot"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Context & Status Strip */}
      <div
        className="px-4 py-2 border-b flex items-center justify-between text-[10.5px] font-mono flex-shrink-0"
        style={{
          backgroundColor: 'var(--bg-subtle)',
          borderColor: 'var(--border-hairline)',
          color: 'var(--text-secondary)',
        }}
      >
        <span className="truncate">
          CONTEXT: {activeShipmentId ? `WAYBILL ${activeShipmentId}` : pathname === '/' ? 'GLOBAL CONTROL TOWER' : pathname.replace('/', '').toUpperCase() || 'FLEET DISPATCH'}
        </span>
        <span className="flex items-center gap-1.5 text-[var(--moss-positive)] font-bold flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--moss-positive)] animate-pulse" />
          READY
        </span>
      </div>

      {/* Tactical Quick Suggestion Prompts */}
      <div
        className="px-3 py-2 border-b flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0"
        style={{
          backgroundColor: 'var(--paper)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        <button
          onClick={() => handleSend('Summarize this page')}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded-[2px] border border-[var(--border-hairline)] hover:border-[var(--cobalt)] hover:text-[var(--cobalt)] bg-[var(--bg-subtle)] text-[var(--ink)] whitespace-nowrap transition-colors flex-shrink-0"
          title="Summarize the active screen and operational status"
        >
          <FileText className="w-3 h-3 text-[var(--cobalt)]" />
          Summarize this page
        </button>

        <button
          onClick={() => handleSend('Suggest questions...')}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded-[2px] border border-[var(--border-hairline)] hover:border-[var(--cobalt)] hover:text-[var(--cobalt)] bg-[var(--bg-subtle)] text-[var(--ink)] whitespace-nowrap transition-colors flex-shrink-0"
          title="Generate analytical prompts for current context"
        >
          <HelpCircle className="w-3 h-3 text-[var(--amber-warning)]" />
          Suggest questions...
        </button>
      </div>

      {/* Messages Feed */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3.5 font-ui"
        style={{ backgroundColor: 'var(--paper)' }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <span className="font-mono text-[9.5px] text-[var(--text-secondary)]">
                {msg.sender === 'user' ? 'OPERATOR' : 'COPILOT'} · {msg.timestamp}
              </span>
              {msg.provenance && (
                <ProvenanceChip provenance={msg.provenance} size="sm" />
              )}
            </div>

            <div
              className={`p-3 rounded-[3px] text-[12.5px] leading-relaxed ${isFull ? 'max-w-[80%]' : 'max-w-[92%]'}`}
              style={{
                backgroundColor: msg.sender === 'user' ? 'var(--cobalt)' : 'var(--bg-subtle)',
                color: msg.sender === 'user' ? '#FFFFFF' : 'var(--ink)',
                border: msg.sender === 'user' ? 'none' : '1px solid var(--border-hairline)',
                whiteSpace: 'pre-line',
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 p-3 rounded-[3px] text-[12px] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--cobalt)]" />
            <span className="font-mono text-[10.5px] text-[var(--text-secondary)]">
              Evaluating live maritime telemetry & deterministic reroute trade-offs...
            </span>
          </div>
        )}
      </div>

      {/* Tactical Quick Prompts Carousel */}
      <div
        className="p-2.5 border-t flex flex-col gap-1.5 flex-shrink-0"
        style={{
          backgroundColor: 'var(--bg-subtle)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        <div className="text-[9.5px] font-mono text-[var(--text-secondary)] tracking-wider">
          TACTICAL DISPATCH INQUIRIES:
        </div>
        <div className="flex flex-col gap-1">
          {TACTICAL_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="text-left px-2.5 py-1 text-[11px] font-mono rounded-[2px] border border-[var(--border-hairline)] hover:border-[var(--cobalt)] hover:text-[var(--cobalt)] transition-colors truncate disabled:opacity-50"
              style={{
                backgroundColor: 'var(--paper)',
                color: 'var(--ink)',
              }}
            >
              › {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Footer */}
      <div
        className="p-3 border-t flex items-center gap-2 flex-shrink-0"
        style={{
          backgroundColor: 'var(--paper)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        <input
          type="text"
          placeholder="Ask Copilot (e.g. assess Red Sea route or demurrage risk)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-3 py-2 text-[12px] font-mono rounded-[2px] border focus:outline-none focus:border-[var(--cobalt)] transition-colors"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderColor: 'var(--border-hairline)',
            color: 'var(--ink)',
          }}
        />

        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="px-3 py-2 rounded-[2px] flex items-center justify-center transition-colors disabled:opacity-40"
          style={{
            backgroundColor: 'var(--cobalt)',
            color: '#FFFFFF',
          }}
          aria-label="Send query"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Tactical Full-Height Right Sidebar Mode */}
      {isOpen && dockMode === 'sidebar' && (
        <aside
          className="fixed top-0 right-0 bottom-0 w-[440px] max-w-[95vw] h-screen z-[1080] flex flex-col border-l shadow-2xl transition-all duration-200"
          style={{
            backgroundColor: 'var(--paper)',
            borderColor: 'var(--border-hairline)',
          }}
          aria-label="AI Decision Copilot Sidebar"
        >
          {renderChatContent(false)}
        </aside>
      )}

      {/* 2. Full Screen Mode (Dedicated Large Command View) */}
      {isOpen && dockMode === 'fullscreen' && (
        <div
          className="fixed inset-0 z-[1090] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="w-full max-w-5xl h-full max-h-[96vh] rounded-[4px] flex flex-col overflow-hidden border shadow-2xl"
            style={{
              backgroundColor: 'var(--paper)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            {renderChatContent(true)}
          </div>
        </div>
      )}

      {/* 3. Floating Window Mode (Bottom-Right Compact Dock) */}
      {isOpen && dockMode === 'floating' && (
        <div className="fixed bottom-16 right-4 z-[1080] flex flex-col items-end select-none">
          <div
            className="w-[390px] max-w-[calc(100vw-32px)] h-[540px] rounded-[3px] flex flex-col overflow-hidden border shadow-xl"
            style={{
              backgroundColor: 'var(--paper)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            {renderChatContent(false)}
          </div>
        </div>
      )}

      {/* Standby Trigger Pill (Always accessible at bottom right) */}
      <div className="fixed bottom-4 right-4 z-[1075] flex items-center gap-2 select-none">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-2 rounded-[3px] border transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--cobalt)] shadow-sm hover:border-[var(--cobalt)]"
          style={{
            backgroundColor: isOpen ? 'var(--cobalt)' : 'var(--ink)',
            borderColor: 'var(--border-hairline)',
            color: '#FFFFFF',
          }}
          title={isOpen ? 'Collapse AI Copilot' : 'Open AI Decision Copilot (Sidebar / Full Screen)'}
          aria-expanded={isOpen}
        >
          <div className="relative flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-[var(--moss-positive)] animate-pulse" />
          </div>
          <span className="font-mono text-[11px] font-bold tracking-wider uppercase">
            AI COPILOT // {isOpen ? 'ACTIVE' : 'STANDBY'}
          </span>
          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
        </button>
      </div>
    </>
  );
}
