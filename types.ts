export enum NodeState {
  Follower = 'Follower',
  Candidate = 'Candidate',
  Leader = 'Leader',
  Stopped = 'Stopped',
}

export interface LogEntry {
  term: number;
  value: string;
  committed: boolean;
}

export interface Node {
  id: number;
  state: NodeState;
  currentTerm: number;
  votedFor: number | null;
  log: LogEntry[];
  commitIndex: number;
  voteCount: number;
  
  // Timing visualization
  heartbeatTicks: number; // Current counter
  timeoutThreshold: number; // Max limit before election
}

export interface Message {
  id: string;
  from: number;
  to: number;
  type: 'RequestVote' | 'VoteResponse' | 'AppendEntries' | 'AppendEntriesResponse' | 'Heartbeat';
  term: number;
  payload?: any;
  
  // Animation
  progress: number; // 0 to 100
  speed: number;    // Increment per tick
}

export type EventLog = {
  id: number;
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
};