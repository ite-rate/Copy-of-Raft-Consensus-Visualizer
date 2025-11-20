import React, { useState } from 'react';
import { BookOpen, PlayCircle, Layers, Info } from 'lucide-react';
import RaftSimulation from './components/RaftSimulation';
import Walkthrough from './components/Walkthrough';
import ConceptCard from './components/ConceptCard';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'simulation' | 'walkthrough' | 'concepts'>('simulation');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
              <Layers size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Raft<span className="text-indigo-600">Viz</span></h1>
          </div>
          
          <nav className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('simulation')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'simulation' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <PlayCircle size={16} /> Simulation
            </button>
            <button
              onClick={() => setActiveTab('walkthrough')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'walkthrough' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <BookOpen size={16} /> Walkthrough
            </button>
            <button
              onClick={() => setActiveTab('concepts')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'concepts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Info size={16} /> Concepts
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'simulation' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Interactive Cluster</h2>
              <p className="text-slate-600 mt-1">
                Simulate node failures, leader elections, and log replication. Start the simulation clock, then kill the Leader to see Raft in action.
              </p>
            </div>
            <RaftSimulation />
          </div>
        )}

        {activeTab === 'walkthrough' && (
          <div className="animate-in slide-in-from-right-4 duration-500 py-8">
             <Walkthrough />
          </div>
        )}

        {activeTab === 'concepts' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Core Theoretical Concepts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConceptCard 
                title="CAP Theorem & Raft"
                description="In distributed systems, you can only have two: Consistency, Availability, and Partition Tolerance. Raft is a CP system."
                icon={<div className="font-black text-lg">CAP</div>}
                details={
                  <div className="space-y-2">
                    <p><strong>Consistency (C):</strong> Every read receives the most recent write or an error.</p>
                    <p><strong>Partition Tolerance (P):</strong> The system continues to operate despite an arbitrary number of messages being dropped or delayed.</p>
                    <p>Raft ensures C and P. If a partition occurs (network split), the minority partition stops processing writes (sacrificing Availability for Consistency) until the partition heals.</p>
                  </div>
                }
              />
              <ConceptCard 
                title="Majority Rule (Quorum)"
                description="Raft relies on a majority (N/2 + 1) to make decisions. This ensures that two different leaders cannot be elected simultaneously."
                icon={<div className="font-black text-lg">N/2+1</div>}
                details={
                  <div className="space-y-2">
                    <p>For a cluster of 5 nodes, a majority is 3.</p>
                    <p>If 2 nodes fail, the remaining 3 can still form a quorum and the system keeps working.</p>
                    <p>If 3 nodes fail, the system becomes unavailable for writes because no majority can be formed.</p>
                  </div>
                }
              />
              <ConceptCard 
                title="Split Votes"
                description="What happens if two candidates request votes at the exact same time? Raft solves this with randomness."
                icon={<div className="font-black text-lg">🎲</div>}
                details={
                  <p>If votes are split (e.g., 2 votes for A, 2 votes for B, 1 undecided), no one wins. Raft resets the election timeout randomly (e.g., between 150ms and 300ms). The node that wakes up first starts a new election term and usually wins before others wake up.</p>
                }
              />
              <ConceptCard 
                title="Log Matching Property"
                description="The high-level safety guarantee that ensures distributed data consistency."
                icon={<div className="font-black text-lg">LOG</div>}
                details={
                  <p>If two logs contain an entry with the same index and term, then the logs are identical in all entries up through the given index. This is maintained by the AppendEntries consistency check: Followers reject new entries if the previous entry doesn't match the Leader's record.</p>
                }
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;