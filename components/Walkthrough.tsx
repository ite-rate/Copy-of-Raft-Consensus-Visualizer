import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Check, Users, Server, FileText, ShieldCheck, AlertTriangle } from 'lucide-react';

const STEPS = [
  {
    title: "1. Introduction to Distributed Consensus",
    content: (
      <div className="space-y-4">
        <p>
          In a distributed system, multiple machines (nodes) work together. The core challenge is <strong>Consensus</strong>: getting all nodes to agree on a single data value or state, even when some nodes fail or network packets are lost.
        </p>
        <p>
          <strong>Raft</strong> is a consensus algorithm designed to be easy to understand. It manages a replicated log. If the logs are identical, the state machines will process the same commands in the same order, producing the same results (State Machine Replication).
        </p>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h4 className="font-bold text-blue-800 mb-2">The Core Goal</h4>
          <p className="text-blue-700 text-sm">To ensure consistency (C) while maximizing availability (A), relying on the <strong>Majority Rule (Quorum)</strong>.</p>
        </div>
      </div>
    )
  },
  {
    title: "2. The Three Roles",
    content: (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2 text-green-700 font-bold">
            <Server size={18} /> Leader
          </div>
          <p className="text-sm text-green-800">Handles all client requests. Replicates its log to followers. Sends heartbeats to maintain authority.</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold">
            <Users size={18} /> Follower
          </div>
          <p className="text-sm text-blue-800">Passive. Responds to requests from leaders and candidates. If it hears nothing, it becomes a candidate.</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2 text-yellow-700 font-bold">
            <ShieldCheck size={18} /> Candidate
          </div>
          <p className="text-sm text-yellow-800">Active during election. Asks for votes to become the new Leader.</p>
        </div>
      </div>
    )
  },
  {
    title: "3. Leader Election",
    content: (
      <div className="space-y-4">
        <ul className="list-disc pl-5 space-y-2 text-slate-700">
          <li><strong>Heartbeats:</strong> The Leader sends periodic heartbeats. As long as Followers receive them, they stay Followers.</li>
          <li><strong>Timeout:</strong> If a Follower hears nothing for a randomized time (Election Timeout), it assumes the Leader is dead.</li>
          <li><strong>Election:</strong> The Follower becomes a Candidate, increments the <em>Term</em>, votes for itself, and sends <code>RequestVote</code> RPCs.</li>
          <li><strong>Majority:</strong> If the Candidate gets votes from a majority (N/2 + 1), it becomes Leader.</li>
        </ul>
        <div className="bg-amber-50 p-3 rounded text-sm text-amber-800 border border-amber-200 flex items-start gap-2">
          <AlertTriangle className="shrink-0 mt-0.5" size={16} />
          <p>To prevent split votes (where no one gets a majority), Raft uses randomized election timeouts. This desynchronizes nodes so one usually times out before others.</p>
        </div>
      </div>
    )
  },
  {
    title: "4. Log Replication",
    content: (
      <div className="space-y-4">
        <p>Once a Leader is elected, it services client requests.</p>
        <ol className="list-decimal pl-5 space-y-2 text-slate-700">
          <li><strong>Append:</strong> Client sends command. Leader appends it to its local log (uncommitted).</li>
          <li><strong>Replicate:</strong> Leader sends <code>AppendEntries</code> RPC to all Followers.</li>
          <li><strong>Acknowledge:</strong> Followers append the entry and acknowledge success.</li>
          <li><strong>Commit:</strong> Once the Leader gets acks from a majority, it marks the entry as <strong>Committed</strong> and applies it to its State Machine.</li>
          <li><strong>Response:</strong> Leader replies to the client. Followers are notified to commit in the next heartbeat.</li>
        </ol>
      </div>
    )
  },
  {
    title: "5. Safety & Consistency",
    content: (
      <div className="space-y-3">
        <p>Raft guarantees the <strong>Log Matching Property</strong>:</p>
        <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 font-mono text-sm text-slate-700">
          If two logs contain an entry with the same index and term, then the logs are identical in all entries up through the given index.
        </div>
        <p><strong>Safety Rule:</strong> A node cannot become Leader if its log is "older" than the majority of nodes. This ensures committed entries are never lost.</p>
        <p className="text-sm text-slate-500 italic mt-4">Source: Sections 5.4 and 7.5 of the provided document.</p>
      </div>
    )
  }
];

const Walkthrough: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
      {/* Progress Bar */}
      <div className="h-1.5 bg-slate-100 w-full">
        <div 
          className="h-full bg-indigo-600 transition-all duration-500 ease-in-out" 
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
        ></div>
      </div>

      <div className="p-8 min-h-[400px] flex flex-col">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">{STEPS[currentStep].title}</h2>
          <div className="text-slate-600 leading-relaxed">
            {STEPS[currentStep].content}
          </div>
        </div>

        <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-100">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 font-medium hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-600 transition-colors"
          >
            <ArrowLeft size={18} /> Previous
          </button>
          
          <div className="flex gap-1">
            {STEPS.map((_, idx) => (
              <div 
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${idx === currentStep ? 'bg-indigo-600' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
            disabled={currentStep === STEPS.length - 1}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md hover:shadow-lg"
          >
            {currentStep === STEPS.length - 1 ? 'Finish' : 'Next'} {currentStep !== STEPS.length - 1 && <ArrowRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Walkthrough;