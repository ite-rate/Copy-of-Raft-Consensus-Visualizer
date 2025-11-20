import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Send, Heart, Mail, CheckCircle, XCircle, FileText } from 'lucide-react';
import { Node, NodeState, Message, EventLog, LogEntry } from '../types';
import SimulationNode from './SimulationNode';

const INITIAL_NODES = 5;
const TICK_RATE = 30; // ms per tick
const MESSAGE_SPEED = 2.5; // % per tick

// Timeouts in ticks
const ELECTION_TIMEOUT_MIN = 100; 
const ELECTION_TIMEOUT_MAX = 200;
const HEARTBEAT_INTERVAL = 50;

const RaftSimulation: React.FC = () => {
  // --- State ---
  const [nodes, setNodes] = useState<Node[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [inputValue, setInputValue] = useState("x=1");
  
  const simulationInterval = useRef<number | null>(null);

  // --- Helpers ---
  const getRandomTimeout = () => Math.floor(Math.random() * (ELECTION_TIMEOUT_MAX - ELECTION_TIMEOUT_MIN + 1)) + ELECTION_TIMEOUT_MIN;

  const getNodePosition = (index: number, total: number) => {
    const angle = (index * 360) / total - 90;
    const radius = 160;
    const center = 200; // 400x400 container
    const x = center + Math.cos((angle * Math.PI) / 180) * radius;
    const y = center + Math.sin((angle * Math.PI) / 180) * radius;
    return { x, y };
  };

  const addLog = useCallback((message: string, type: EventLog['type'] = 'info') => {
    setLogs(prev => [{
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      message,
      type
    }, ...prev].slice(0, 50));
  }, []);

  // --- Initialization ---
  const init = useCallback(() => {
    const initialNodes: Node[] = Array.from({ length: INITIAL_NODES }).map((_, i) => ({
      id: i,
      state: i === 0 ? NodeState.Leader : NodeState.Follower, // S1 starts as leader
      currentTerm: 1,
      votedFor: null,
      log: [],
      commitIndex: -1,
      voteCount: 0,
      heartbeatTicks: 0,
      timeoutThreshold: getRandomTimeout(),
    }));
    setNodes(initialNodes);
    setMessages([]);
    addLog("Cluster initialized. Node S1 started as Leader.", 'info');
    setIsRunning(false);
    if (simulationInterval.current) clearInterval(simulationInterval.current);
  }, [addLog]);

  useEffect(() => {
    init();
    return () => { if (simulationInterval.current) clearInterval(simulationInterval.current); };
  }, [init]);

  const toggleSimulation = () => {
    if (isRunning) {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
      setIsRunning(false);
    } else {
      setIsRunning(true);
      simulationInterval.current = window.setInterval(gameLoop, TICK_RATE);
    }
  };

  // --- Messaging Logic ---
  const sendMessage = (from: Node, toId: number, type: Message['type'], payload?: any) => {
    const msg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      from: from.id,
      to: toId,
      type,
      term: from.currentTerm,
      payload,
      progress: 0,
      speed: MESSAGE_SPEED
    };
    setMessages(prev => [...prev, msg]);
  };

  const broadcast = (from: Node, type: Message['type'], payload?: any) => {
    const newMessages: Message[] = [];
    nodes.forEach(n => {
      if (n.id !== from.id && n.state !== NodeState.Stopped) {
        newMessages.push({
          id: Math.random().toString(36).substr(2, 9),
          from: from.id,
          to: n.id,
          type,
          term: from.currentTerm,
          payload,
          progress: 0,
          speed: MESSAGE_SPEED
        });
      }
    });
    setMessages(prev => [...prev, ...newMessages]);
  };

  // --- The Game Loop ---
  const gameLoop = () => {
    setMessages(currentMessages => {
      const activeMessages = [...currentMessages];
      const arrivedMessages: Message[] = [];
      const remainingMessages: Message[] = [];

      // Move messages
      activeMessages.forEach(msg => {
        msg.progress += msg.speed;
        if (msg.progress >= 100) {
          arrivedMessages.push(msg);
        } else {
          remainingMessages.push(msg);
        }
      });

      // Process Arrivals & Update Nodes
      setNodes(currentNodes => {
        const nextNodes = currentNodes.map(n => ({ ...n })); // Deep clone

        // 1. Handle Arrived Messages
        arrivedMessages.forEach(msg => {
          const target = nextNodes.find(n => n.id === msg.to);
          if (!target || target.state === NodeState.Stopped) return;

          // Universal Term Check: If RPC request or response contains term T > currentTerm:
          if (msg.term > target.currentTerm) {
            target.currentTerm = msg.term;
            target.state = NodeState.Follower;
            target.votedFor = null;
            target.heartbeatTicks = 0; // Reset timer on state change
          }

          switch (msg.type) {
            case 'Heartbeat':
            case 'AppendEntries':
              if (msg.term >= target.currentTerm) {
                target.state = NodeState.Follower;
                target.heartbeatTicks = 0; // Reset timer!
                
                // Log Replication (simplified)
                const leaderLog = msg.payload?.log as LogEntry[] || [];
                const leaderCommit = msg.payload?.commitIndex || -1;
                
                // Simply adopt the log for this viz (in real raft we check indices)
                if (leaderLog.length > target.log.length) {
                   target.log = leaderLog;
                }
                
                // Commit index update
                if (leaderCommit > target.commitIndex) {
                  target.commitIndex = Math.min(leaderCommit, target.log.length - 1);
                  // Mark committed
                  target.log.forEach((entry, i) => {
                    if (i <= target.commitIndex) entry.committed = true;
                  });
                }

                // Send success response
                sendMessage(target, msg.from, 'AppendEntriesResponse', { success: true, matchIndex: target.log.length - 1 });
              }
              break;

            case 'RequestVote':
              // Vote logic
              const canVote = (target.votedFor === null || target.votedFor === msg.from);
              // Simplified log check: candidate term must be >= my term
              if (msg.term >= target.currentTerm && canVote) {
                target.votedFor = msg.from;
                target.heartbeatTicks = 0; // Granting vote resets timer
                sendMessage(target, msg.from, 'VoteResponse', { voteGranted: true });
              } else {
                sendMessage(target, msg.from, 'VoteResponse', { voteGranted: false });
              }
              break;

            case 'VoteResponse':
              if (target.state === NodeState.Candidate && msg.term === target.currentTerm && msg.payload.voteGranted) {
                target.voteCount += 1;
                const activeCount = nextNodes.filter(n => n.state !== NodeState.Stopped).length;
                const majority = Math.floor(activeCount / 2) + 1;
                
                if (target.voteCount >= majority) {
                  target.state = NodeState.Leader;
                  target.heartbeatTicks = 0; // Use this for heartbeat interval now
                  addLog(`Node S${target.id + 1} becomes LEADER (Term ${target.currentTerm})`, 'success');
                  // Immediately send heartbeat to assert authority
                  broadcast(target, 'Heartbeat', { log: target.log, commitIndex: target.commitIndex });
                }
              }
              break;
            
            case 'AppendEntriesResponse':
              if (target.state === NodeState.Leader && msg.payload.success) {
                 // Count replicas to advance commit index
                 // In this simplified viz, we check periodically, or we could check here.
                 // Let's leave commit logic to the handleClientRequest effect or periodic check for simplicity
              }
              break;
          }
        });

        // 2. Handle Timeouts & Heartbeats
        nextNodes.forEach(node => {
          if (node.state === NodeState.Stopped) return;

          if (node.state === NodeState.Leader) {
            // Leader sends heartbeats
            node.heartbeatTicks++;
            if (node.heartbeatTicks >= HEARTBEAT_INTERVAL) {
              node.heartbeatTicks = 0;
              broadcast(node, 'Heartbeat', { log: node.log, commitIndex: node.commitIndex });
            }
          } else {
            // Followers/Candidates tick down
            node.heartbeatTicks++;
            if (node.heartbeatTicks >= node.timeoutThreshold) {
              // ELECTION TIMEOUT
              addLog(`S${node.id + 1} timed out. Starting Election (Term ${node.currentTerm + 1})`, 'warning');
              node.state = NodeState.Candidate;
              node.currentTerm += 1;
              node.votedFor = node.id;
              node.voteCount = 1;
              node.heartbeatTicks = 0;
              node.timeoutThreshold = getRandomTimeout(); // Reset to new random
              
              broadcast(node, 'RequestVote');
            }
          }
        });

        return nextNodes;
      });

      return remainingMessages;
    });
  };


  // --- Interaction Handlers ---
  const handleClientRequest = () => {
    if (!inputValue) return;
    
    setNodes(prev => {
      const newNodes = [...prev];
      const leader = newNodes.find(n => n.state === NodeState.Leader);
      
      if (!leader) {
        addLog("Write Failed: No Leader.", 'error');
        return prev;
      }

      const newEntry: LogEntry = { term: leader.currentTerm, value: inputValue, committed: false };
      leader.log.push(newEntry);
      addLog(`Client sent "${inputValue}" to Leader S${leader.id + 1}.`, 'info');

      // Trigger immediate heartbeat to replicate
      leader.heartbeatTicks = HEARTBEAT_INTERVAL; // Force next tick to send
      
      return newNodes;
    });
    setInputValue("");
  };

  const toggleNodePower = (id: number) => {
    setNodes(prev => prev.map(n => {
      if (n.id !== id) return n;
      const newState = n.state === NodeState.Stopped ? NodeState.Follower : NodeState.Stopped;
      if (newState === NodeState.Follower) {
         n.heartbeatTicks = 0;
         n.timeoutThreshold = getRandomTimeout();
      }
      return { ...n, state: newState };
    }));
    addLog(`Node S${id + 1} power toggled.`, 'warning');
  };

  // --- Render Helpers ---
  const renderMessage = (msg: Message) => {
    const fromPos = getNodePosition(msg.from, nodes.length);
    const toPos = getNodePosition(msg.to, nodes.length);
    
    const x = fromPos.x + (toPos.x - fromPos.x) * (msg.progress / 100);
    const y = fromPos.y + (toPos.y - fromPos.y) * (msg.progress / 100);

    let icon = <Mail size={14} />;
    let color = "bg-indigo-500";

    if (msg.type === 'Heartbeat') {
      icon = <Heart size={12} fill="currentColor" />;
      color = "bg-pink-500";
    } else if (msg.type === 'RequestVote') {
      icon = <div className="text-[10px] font-bold">?</div>;
      color = "bg-amber-500";
    } else if (msg.type === 'VoteResponse') {
      icon = msg.payload.voteGranted ? <CheckCircle size={14} /> : <XCircle size={14} />;
      color = msg.payload.voteGranted ? "bg-green-500" : "bg-red-500";
    } else if (msg.type === 'AppendEntries') {
      icon = <FileText size={12} />;
      color = "bg-blue-500";
    }

    return (
      <div 
        key={msg.id}
        className={`absolute w-6 h-6 rounded-full ${color} text-white flex items-center justify-center shadow-sm z-20 transition-transform`}
        style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      >
        {icon}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6">
      {/* Simulation Area */}
      <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 shadow-inner relative overflow-hidden flex items-center justify-center min-h-[500px]">
        <div className="absolute inset-0 opacity-[0.05]" 
             style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        {/* Canvas for Nodes & Messages */}
        <div className="relative w-[400px] h-[400px]">
           {/* Connection Lines (Visual only) */}
           <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
              {nodes.map((n, i) => {
                 const pos = getNodePosition(i, nodes.length);
                 return nodes.slice(i + 1).map((n2, j) => {
                    const pos2 = getNodePosition(i + 1 + j, nodes.length);
                    return <line key={`${i}-${j}`} x1={pos.x} y1={pos.y} x2={pos2.x} y2={pos2.y} stroke="currentColor" strokeWidth="1" />
                 });
              })}
           </svg>

           {/* Nodes */}
           {nodes.map((node, i) => {
             const pos = getNodePosition(i, nodes.length);
             return (
               <SimulationNode 
                 key={node.id} 
                 node={node} 
                 x={pos.x}
                 y={pos.y}
                 onTogglePower={toggleNodePower}
               />
             );
           })}
           
           {/* Messages */}
           {messages.map(renderMessage)}
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-full shadow-lg flex items-center gap-2 z-30">
          <button 
            onClick={toggleSimulation}
            className={`p-3 rounded-full text-white transition-all ${isRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {isRunning ? <Pause fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} />}
          </button>
          <button 
            onClick={init}
            className="p-3 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
            title="Reset Simulation"
          >
            <RotateCcw size={20} />
          </button>
          
          <div className="h-8 w-px bg-slate-200 mx-2"></div>

          <div className="flex items-center gap-2 pr-2">
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="x=Val"
              className="w-20 bg-slate-100 border-none rounded-md py-1.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button 
              onClick={handleClientRequest}
              className="flex items-center gap-1 bg-slate-800 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Send <Send size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Logs Panel */}
      <div className="w-full lg:w-80 flex flex-col gap-4 h-full">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 flex justify-between items-center">
            <span>Events Log</span>
            <div className="flex items-center gap-2 text-xs font-normal">
              {isRunning ? <span className="text-green-600 flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/> Running</span> : <span className="text-slate-400">Paused</span>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs">
            {logs.length === 0 && <p className="text-slate-400 text-center mt-10 italic">Start simulation to see events...</p>}
            {logs.map(log => (
              <div key={log.id} className={`p-2 rounded border-l-2 animate-in fade-in slide-in-from-left-1 duration-300 
                ${log.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' : 
                  log.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' : 
                  log.type === 'warning' ? 'bg-amber-50 border-amber-400 text-amber-800' : 
                  'bg-slate-50 border-blue-400 text-slate-700'}`}>
                <div className="opacity-50 text-[10px] mb-0.5">{log.time}</div>
                <div className="leading-tight">{log.message}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-xs text-slate-600 space-y-2">
           <div className="font-semibold text-slate-800 mb-1">Message Legend</div>
           <div className="grid grid-cols-2 gap-2">
             <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-pink-500 flex items-center justify-center"><Heart size={8} className="text-white"/></div> Heartbeat</div>
             <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center text-[8px] font-bold text-white">?</div> RequestVote</div>
             <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center"><CheckCircle size={8} className="text-white"/></div> Vote Granted</div>
             <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center"><FileText size={8} className="text-white"/></div> Log Data</div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default RaftSimulation;