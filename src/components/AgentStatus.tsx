import { useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';

export type AgentStatusState = 'idle' | 'thinking' | 'active' | 'done' | 'error';

export interface AgentItem {
  id: string;
  name: string;
  description: string;
  status: AgentStatusState;
}

interface Props {
  agents: AgentItem[];
  logs: string[];
  isRunning: boolean;
  onClose: () => void;
}

const PulseIcon = ({ status }: { status: AgentStatusState }) => {
  if (status === 'thinking') {
    return (
      <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
        <Loader2 className="w-4 h-4 text-[#76B900] animate-spin" />
      </div>
    );
  }
  if (status === 'active' || status === 'done') {
    return (
      <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
        <span className="absolute inline-flex w-3 h-3 rounded-full bg-[#76B900] opacity-60 animate-ping" />
        <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-[#76B900]" />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="w-7 h-7 flex items-center justify-center shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
      </div>
    );
  }
  // idle
  return (
    <div className="w-7 h-7 flex items-center justify-center shrink-0">
      <span className="w-2 h-2 rounded-full bg-stone-600" />
    </div>
  );
};

const statusLabel: Record<AgentStatusState, string> = {
  idle: 'Idle',
  thinking: 'Thinking...',
  active: 'Active',
  done: 'Done',
  error: 'Error',
};

const statusColor: Record<AgentStatusState, string> = {
  idle: 'text-stone-500',
  thinking: 'text-[#76B900]',
  active: 'text-[#76B900]',
  done: 'text-[#76B900]',
  error: 'text-red-400',
};

export default function AgentStatus({ agents, logs, isRunning, onClose }: Props) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="fixed right-0 top-0 bottom-0 z-40 w-72 bg-[#0D0D0D] border-l border-[#1f1f1f] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            {isRunning
              ? <><span className="absolute w-2 h-2 rounded-full bg-[#76B900] animate-ping opacity-70" /><span className="relative w-2 h-2 rounded-full bg-[#76B900]" /></>
              : <span className="w-2 h-2 rounded-full bg-stone-600" />
            }
          </div>
          <span className="text-[11px] font-black text-white uppercase tracking-widest">Agent Status</span>
        </div>
        <button onClick={onClose} className="text-stone-600 hover:text-stone-300 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Agent list */}
      <div className="px-3 py-3 space-y-1 border-b border-[#1f1f1f] shrink-0">
        {agents.map(agent => (
          <div key={agent.id}
            className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${
              agent.status === 'thinking' ? 'bg-[#76B900]/8' :
              agent.status === 'done' ? 'bg-[#76B900]/5' :
              agent.status === 'active' ? 'bg-[#76B900]/6' :
              'bg-transparent'
            }`}
          >
            <PulseIcon status={agent.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-stone-200 truncate">{agent.name}</span>
                <span className={`text-[9px] font-black uppercase tracking-wide shrink-0 ${statusColor[agent.status]}`}>
                  {statusLabel[agent.status]}
                </span>
              </div>
              <p className="text-[9px] text-stone-600 truncate mt-0.5">{agent.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Live Log */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="px-4 py-2 flex items-center gap-2 shrink-0 border-b border-[#1a1a1a]">
          <span className="text-[9px] font-black uppercase tracking-widest text-stone-600">Live Log</span>
          {isRunning && <span className="w-1 h-1 rounded-full bg-[#76B900] animate-pulse" />}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[10px] space-y-1.5 scrollbar-thin scrollbar-thumb-stone-800">
          {logs.length === 0 && (
            <p className="text-stone-700 italic">Waiting for pipeline to start...</p>
          )}
          {logs.map((log, i) => (
            <div key={i}
              className={`leading-relaxed ${
                log.includes('[🤖 ACTIVITY]') ? 'text-cyan-500' :
                log.includes('✓') || log.includes('✅') ? 'text-[#76B900]' :
                log.includes('Error') || log.includes('failed') ? 'text-red-400' :
                'text-stone-400'
              }`}
            >
              <span className="text-stone-700 mr-1">❯</span>
              {log.replace(/^\[.*?\]\s+/, '')}
            </div>
          ))}
          {isRunning && (
            <div className="animate-pulse text-[#76B900]">❯ _</div>
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
