import React from 'react';
import { Server, Crown, Database, PowerOff } from 'lucide-react';
import { Node, NodeState } from '../types';

interface SimulationNodeProps {
  node: Node;
  x: number;
  y: number;
  onTogglePower: (id: number) => void;
}

const SimulationNode: React.FC<SimulationNodeProps> = ({ node, x, y, onTogglePower }) => {
  const getStateColor = (state: NodeState) => {
    switch (state) {
      case NodeState.Leader: return 'border-green-500 ring-green-100 bg-green-50 shadow-green-200';
      case NodeState.Candidate: return 'border-yellow-500 ring-yellow-100 bg-yellow-50 shadow-yellow-200';
      case NodeState.Follower: return 'border-blue-300 ring-blue-50 bg-white shadow-blue-100';
      case NodeState.Stopped: return 'border-slate-300 bg-slate-100 grayscale opacity-70';
      default: return 'border-slate-200';
    }
  };

  const getStateBadge = (state: NodeState) => {
    switch (state) {
      case NodeState.Leader: return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold border border-green-200 flex items-center gap-1"><Crown size={10} /> LEADER</span>;
      case NodeState.Candidate: return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold border border-yellow-200">CANDIDATE</span>;
      case NodeState.Follower: return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-200">FOLLOWER</span>;
      case NodeState.Stopped: return <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs font-bold border border-slate-300">OFFLINE</span>;
    }
  };

  // Calculate timer progress (0 to 1)
  const timerProgress = node.state === NodeState.Stopped || node.state === NodeState.Leader 
    ? 0 
    : Math.min(1, node.heartbeatTicks / node.timeoutThreshold);
    
  const radius = 110; // px, slightly larger than the card
  const circumference = 2 * Math.PI * 48; // r=48 (approx card half width + padding)

  return (
    <div 
      className="absolute w-48 transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-300"
      style={{ left: x, top: y }}
    >
      {/* Timer Ring (Background) */}
      {(node.state === NodeState.Follower || node.state === NodeState.Candidate) && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[104%] h-[112%] -z-10 pointer-events-none">
           <svg className="w-full h-full overflow-visible">
             <rect 
                x="0" y="0" width="100%" height="100%" rx="16" ry="16"
                fill="none" 
                stroke="#e2e8f0" 
                strokeWidth="4" 
             />
             <rect 
                x="0" y="0" width="100%" height="100%" rx="16" ry="16"
                fill="none" 
                stroke={timerProgress > 0.75 ? '#ef4444' : '#3b82f6'} 
                strokeWidth="4" 
                pathLength="100"
                strokeDasharray="100"
                strokeDashoffset={100 - (timerProgress * 100)}
                className="transition-all duration-300 ease-linear"
             />
           </svg>
           {/* Timeout Warning Label */}
           {timerProgress > 0.8 && (
             <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse whitespace-nowrap">
               Timeout Imminent
             </div>
           )}
        </div>
      )}

      <div className={`relative flex flex-col border-2 rounded-xl p-3 shadow-lg transition-all duration-300 ${getStateColor(node.state)}`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            {node.state === NodeState.Stopped ? <PowerOff size={16} className="text-slate-500" /> : <Server size={16} className={node.state === NodeState.Leader ? 'text-green-600' : 'text-blue-600'} />}
            <span className="font-bold text-slate-700">Node S{node.id + 1}</span>
          </div>
          <button 
            onClick={() => onTogglePower(node.id)}
            title={node.state === NodeState.Stopped ? "Start Node" : "Stop Node"}
            className={`p-1 rounded-full transition-colors ${node.state === NodeState.Stopped ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
          >
            <PowerOff size={12} />
          </button>
        </div>

        {/* State Badge */}
        <div className="mb-2 flex justify-between items-center">
            {getStateBadge(node.state)}
            <span className="text-xs font-mono text-slate-500">Term: {node.currentTerm}</span>
        </div>

        {/* Log Visualization */}
        <div className="bg-slate-900 rounded p-2 min-h-[60px] flex flex-col gap-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold z-10">
            <div className="flex items-center gap-1"><Database size={10} /> Log</div>
            <div>CI: {node.commitIndex}</div>
          </div>
          <div className="flex gap-1 overflow-x-auto relative z-10 no-scrollbar">
            {node.log.length === 0 && <span className="text-slate-600 text-xs italic">Empty</span>}
            {node.log.map((entry, idx) => (
              <div 
                key={idx} 
                className={`
                  w-6 h-8 shrink-0 flex flex-col items-center justify-center text-[9px] rounded border
                  ${entry.committed 
                    ? 'bg-green-900/50 border-green-700 text-green-400' 
                    : 'bg-yellow-900/30 border-yellow-700 text-yellow-500 dashed-border'}
                `}
              >
                <span className="font-bold">{entry.value}</span>
                <span className="text-[7px] opacity-70">T{entry.term}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationNode;