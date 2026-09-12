'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Earthquake { id: string; magnitude: number; place: string; time: number; depth: number; }

/* ─── Inline SVG Icons ─── */
const DiscordIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
  </svg>
);

const XIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
  </svg>
);

const DocsIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H10a2 2 0 0 1 2 2 2 2 0 0 1 2-2h4.5A1.5 1.5 0 0 1 20 4.5v13a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 0 0-2 2 2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 17.5z"/>
    <path d="M12 7v14"/>
  </svg>
);

export default function GlobalStatusBar() {
  const [quakes, setQuakes] = useState<Earthquake[]>([]);
  const [hoveredQuake, setHoveredQuake] = useState<Earthquake | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
        if (res.ok) {
          const data = await res.json();
          const earthquakes = (data.features || []).map((f: any) => ({
            id: f.id,
            lat: f.geometry?.coordinates?.[1] || 0,
            lng: f.geometry?.coordinates?.[0] || 0,
            depth: f.geometry?.coordinates?.[2] || 0,
            magnitude: f.properties?.mag,
            place: f.properties?.place,
            time: f.properties?.time,
            url: f.properties?.url,
            tsunami: f.properties?.tsunami,
            type: f.properties?.type,
            felt: f.properties?.felt,
            alert: f.properties?.alert,
          }));
          const majorQuakes = earthquakes
            .filter((q: Earthquake) => q.magnitude >= 4.0)
            .sort((a: Earthquake, b: Earthquake) => b.time - a.time)
            .slice(0, 5);
          setQuakes(majorQuakes);
        }
      } catch (e) { console.warn('[NexaFreight] Suppressed error:', e instanceof Error ? e.message : e); }
    };
    fetchData();
    const iv = setInterval(fetchData, 60000);
    return () => clearInterval(iv);
  }, []);

  // Keep the bar mounted even with no feed data — the left-hand community and
  // docs links must stay reachable when USGS is rate-limited or down.
  const hasTicker = quakes.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 3, duration: 0.6 }}
      className="hidden md:block absolute bottom-0 left-0 right-0 z-[210] pointer-events-none"
    >
      <div className="h-[28px] overflow-hidden bg-[#0a0a0f]/95 border-t border-white/[0.06] flex items-center text-[10px] font-mono tracking-wider backdrop-blur-xl relative">
        {/* Animated scan line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--cyan-primary)]/30 to-transparent" style={{ animation: 'hud-scanline 4s linear infinite' }} />
        
        {/* ── LEFT: Removed Social Links ── */}
        <div className="flex-shrink-0 h-full flex items-center pointer-events-auto">
        </div>


        {/* ── CENTER: Scrolling ticker ── */}
        <div className="flex-1 overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 3%, black 97%, transparent)' }}>
          <div className={`flex items-center animate-ticker whitespace-nowrap ${hasTicker ? '' : 'hidden'}`}>
            {[...Array(4)].map((_, repeatIdx) => (
              <span key={repeatIdx} className="inline-flex items-center">
                {/* Earthquakes */}
                {quakes.map(quake => (
                  <span 
                    key={`${quake.id}-${repeatIdx}`}
                    className="inline-flex items-center gap-1 mx-2 cursor-help pointer-events-auto"
                    onMouseEnter={() => setHoveredQuake(quake)}
                    onMouseLeave={() => setHoveredQuake(null)}
                  >
                    <span className="text-[#FF5722] text-[9px]">🔴</span>
                    <span className="text-[#FF5722] font-bold">M{quake.magnitude.toFixed(1)}</span>
                    <span className="text-white/30 truncate max-w-[140px]">{quake.place}</span>
                  </span>
                ))}
                <span className="text-white/10 mx-2">│</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Live SOL Price + Links ── */}
        <div className="flex-shrink-0 h-full flex items-center pointer-events-auto border-l border-white/[0.04]">

          {/* Status indicator */}
          <div className="h-full px-3 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
            <span className="text-[#00E676]/70 text-[9px] tracking-[0.2em]">ONLINE</span>
          </div>
        </div>
      </div>

      {/* Earthquake hover tooltip */}
      {hoveredQuake && (
        <div className="absolute bottom-[34px] left-1/2 -translate-x-1/2 z-[300] pointer-events-none">
          <div className="bg-black/90 backdrop-blur-xl border border-white/[0.08] rounded-lg px-4 py-3 text-[11px] font-mono whitespace-nowrap shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px]">🔴</span>
              <span className="font-bold text-[#FF5722]">Magnitude {hoveredQuake.magnitude.toFixed(1)}</span>
              <span className="text-white/30 text-[9px] bg-white/5 px-1.5 py-0.5 rounded">USGS</span>
            </div>
            <div className="text-[10px] text-white font-bold mb-2">
              {hoveredQuake.place}
            </div>
            <div className="flex flex-col gap-1 text-[10px]">
              <div className="text-white/50"><span className="text-white/30">Depth:</span> {hoveredQuake.depth} km</div>
              <div className="text-white/50 mt-1"><span className="text-white/30">Time:</span> {new Date(hoveredQuake.time).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
