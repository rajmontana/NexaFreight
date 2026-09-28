'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SSEState {
  connected: boolean;
}

export default function GlobalStatusBar() {
  const [time, setTime] = useState('');
  const [sseState, setSSEState] = useState<SSEState>({ connected: false });

  // Update UTC time
  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      setTime(
        `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}Z`
      );
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Detect SSE connection state (placeholder — integrate with existing SSE context)
  useEffect(() => {
    // In a real implementation, this would check the SSE stream state from your context/store
    // For now, set to connected by default; update when you have SSE state management
    setSSEState({ connected: true });
  }, []);

  return (
    <div className="status-strip">
      {/* LEFT: UTC time */}
      <div className="status-strip__section-left">
        <span>UTC {time || '--:--:--Z'}</span>
      </div>

      {/* CENTER: Live indicator with spectral underline */}
      <div className="status-strip__section-center">
        <div
          className={`status-strip__live-indicator ${sseState.connected ? 'status-strip__live-indicator--connected' : ''}`}
          title={sseState.connected ? 'SSE stream connected' : 'SSE stream disconnected'}
        />
      </div>

      {/* RIGHT: Status readouts (IN TRANSIT, AT RISK, DEMURRAGE) */}
      <div className="status-strip__section-right">
        <span>IN TRANSIT 147</span>
        <span className="status-strip__at-risk">AT RISK 8</span>
        <span>DEMURRAGE 3</span>
      </div>
    </div>
  );
}
