// Local types for Firebase Functions (temporary until we fix the import path issue)

export interface League {
  id: string;
  name: string;
  rules: any;
  currentYear: number;
  phase: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  leagueId: string;
  name: string;
  ownerUserId: string;
  capSpace: number;
  roster: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Player {
  id: string;
  name: string;
  position: string;
  nflTeam: string;
  age: number;
  overall: number;
  devGrade: string;
  traits: any;
}

export interface DraftState {
  id: string;
  leagueId: string;
  currentPick: number;
  currentTeamId: string;
  timeRemaining: number;
  isPaused: boolean;
  isComplete: boolean;
  draftOrder: string[];
  completedPicks: any[];
  settings: DraftSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface DraftSettings {
  rounds: number;
  timeLimit: number;
  snakeOrder: boolean;
  mode: string;
  autodraftDelay: number;
  rookieAutoContracts: boolean;
  veteranNegotiationWindow: number;
}

export interface DraftPick {
  id: string;
  leagueId: string;
  year: number;
  round: number;
  pickNumber: number;
  originalTeamId: string;
  currentTeamId: string;
  playerId: string | null;
  isCompleted: boolean;
  draftedAt?: Date;
  isAutodrafted?: boolean;
  timeUsed?: number;
}

export interface PlayerRights {
  id: string;
  leagueId: string;
  playerId: string;
  teamId: string;
  type: string;
  expiresAt: Date;
  createdAt: Date;
  rightsTeamId?: string;
  rightsExpireAt?: Date;
  capHold?: number;
  acquisitionMethod?: string;
}

export interface AutodraftQueue {
  id: string;
  leagueId: string;
  teamId: string;
  playerIds: string[];
  priority: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Contract {
  id: string;
  playerId: string;
  teamId: string;
  startYear: number;
  endYear: number;
  baseSalary: { [year: number]: number };
  signingBonus: number;
  guarantees: string[];
  noTradeClause: boolean;
  createdAt: Date;
}

export interface ContractRails {
  id: string;
  leagueId: string;
  type: string;
  minYears: number;
  maxYears: number;
  maxSigningBonus: number;
  maxGuarantees: string[];
  createdAt: Date;
}

export interface PlayerNegotiationProfile {
  id: string;
  playerId: string;
  preferredYears: number;
  preferredGuarantees: string[];
  preferredBonus: number;
  noTradeClause: boolean;
  createdAt: Date;
}

export interface QualifyingOffer {
  id: string;
  playerId: string;
  teamId: string;
  amount: number;
  year: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface FranchiseTag {
  id: string;
  playerId: string;
  teamId: string;
  type: string;
  amount: number;
  year: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface DraftMessage {
  id: string;
  leagueId: string;
  userId: string;
  message: string;
  timestamp: Date;
}

export interface AuctionState {
  id: string;
  leagueId: string;
  playerId: string;
  currentBid: number;
  currentBidder: string;
  endTime: Date;
  isComplete: boolean;
  createdAt: Date;
}

export interface ContractNegotiation {
  id: string;
  playerId: string;
  teamId: string;
  status: string;
  offers: any[];
  currentOffer: any;
  expiresAt: Date;
  createdAt: Date;
}
