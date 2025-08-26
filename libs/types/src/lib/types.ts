// Core types for Dynasty Fantasy Football application

export enum LeaguePhase {
  'offseason' = 'offseason',
  'drafting' = 'drafting',
  'free-agency' = 'free-agency',
  'regular-season' = 'regular-season',
  'playoffs' = 'playoffs',
  'completed' = 'completed',
  'draft' = 'draft',
  'preseason' = 'preseason',
}

export interface League {
  id: string;
  name: string;
  description?: string;
  numberOfTeams: number;
  currentYear: number;
  phase: LeaguePhase;
  status: 'active' | 'inactive' | 'completed' | 'drafting' | 'free-agency';
  isPrivate: boolean;
  joinCode: string;
  rules: LeagueRules;
  draftOrder?: string[]; // team IDs in draft order
  createdAt: Date;
  updatedAt: Date;
}

export interface LeagueRules {
  scoring: ScoringRules;
  cap: CapRules;
  contracts: ContractRules;
  draft: DraftRules;
  freeAgency: FreeAgencyRules;
  roster: RosterRules;
}

export interface ScoringRules {
  ppr: number; // Points per reception
  passingYards: number; // Points per passing yard
  rushingYards: number; // Points per rushing yard
  receivingYards: number; // Points per receiving yard
  passingTouchdown: number;
  rushingTouchdown: number;
  receivingTouchdown: number;
  interception: number;
  fumble: number;
  fieldGoal: number;
  extraPoint: number;
}

export interface CapRules {
  salaryCap: number;
  minimumSpend: number;
  deadMoneyRules: DeadMoneyRules;
}

export interface DeadMoneyRules {
  preJune1: boolean; // Whether to use pre-June 1 dead money rules
  signingBonusAcceleration: boolean; // Whether signing bonus accelerates on trade/release
}

export interface ContractRules {
  maxYears: number;
  maxSigningBonus: number;
  rookieScale: boolean; // Whether to use rookie scale contracts
}

export interface DraftRules {
  mode: DraftMode;
  rounds: number;
  timeLimit: number; // seconds per pick
  snakeOrder: boolean;
  autodraftDelay: number; // seconds before autodraft kicks in
  rookieAutoContracts: boolean; // whether rookies get automatic contracts
  veteranNegotiationWindow: number; // hours to negotiate veteran contracts
  // Auction-specific settings
  budget?: number; // auction budget per team
  bidIncrement?: number;
  bidTimeLimit?: number; // seconds per bid
  capHoldMultiplier?: number; // auction price * multiplier = cap hold
}

export interface RosterRules {
  minPlayers: number;
  maxPlayers: number;
  positionRequirements: Record<Position, number>;
  allowIR: boolean;
  allowTaxi: boolean;
  maxIR: number;
  maxTaxi: number;
}

export type DraftMode = 'snake' | 'auction' | 'linear';

export interface FreeAgencyRules {
  bidRounds: number; // seconds between bid rounds
  tieBreakers: TieBreaker[];
}

export type TieBreaker = 'guarantees' | 'apy' | 'length' | 'random';

export interface Team {
  id: string;
  leagueId: string;
  name: string;
  ownerUserId: string;
  capSpace: number;
  roster: RosterSlot[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RosterSlot {
  id: string;
  teamId: string;
  playerId: string;
  position: Position;
  status: RosterStatus;
  activeFrom: Date;
  activeTo?: Date;
}

export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';
export type RosterStatus = 'active' | 'bench' | 'ir' | 'taxi';

export interface Player {
  id: string;
  name: string;
  nflTeam: string;
  position: Position;
  age: number;
  devGrade: 'A' | 'B' | 'C' | 'D';
  overall: number;
  traits: PlayerTraits;
  stats: PlayerStats[];
}

export interface PlayerTraits {
  speed: number;
  strength: number;
  agility: number;
  awareness: number;
  injury: number;
  schemeFit: string[];
}

export interface PlayerStats {
  year: number;
  week: number;
  fantasyPoints: number;
  rawStats: Record<string, number>;
}

export interface Contract {
  id: string;
  playerId: string;
  teamId: string;
  startYear: number;
  endYear: number;
  baseSalary: Record<number, number>; // year -> salary
  signingBonus: number;
  guarantees: Guarantee[];
  noTradeClause: boolean;
  createdAt: Date;
}

export interface Guarantee {
  type: 'full' | 'injury-only';
  amount: number;
  year: number;
}

export interface CapLedger {
  id: string;
  teamId: string;
  leagueYear: number;
  capIn: number;
  capOut: number;
  reason: string;
  refType: 'contract' | 'trade' | 'cut' | 'restructure';
  refId: string;
  createdAt: Date;
}

export interface Trade {
  id: string;
  leagueId: string;
  proposerTeamId: string;
  responderTeamId: string;
  status: TradeStatus;
  payload: TradePayload;
  capImpacts: CapImpact[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TradePayload {
  proposerAssets: TradeAsset[];
  responderAssets: TradeAsset[];
}

export interface TradeAsset {
  type: 'player' | 'pick' | 'cap';
  id: string;
  value?: number;
}

export interface CapImpact {
  teamId: string;
  year: number;
  impact: number;
}

export type TradeStatus = 'proposed' | 'accepted' | 'rejected' | 'cancelled';

export interface Pick {
  id: string;
  leagueId: string;
  year: number;
  round: number;
  originalTeamId: string;
  currentTeamId: string;
  playerId?: string;
}

export interface FreeAgencyBid {
  id: string;
  leagueId: string;
  teamId: string;
  playerId: string;
  years: number;
  baseSalary: Record<number, number>;
  signingBonus: number;
  guarantees: Guarantee[];
  timestamp: Date;
}

export interface DraftClass {
  id: string;
  leagueId: string;
  year: number;
  generatedSeed: number;
  config: DraftClassConfig;
}

export interface DraftClassConfig {
  positionDistribution: Record<Position, number>;
  devGradeDistribution: Record<string, number>;
  overallRange: { min: number; max: number };
}

export interface User {
  id: string;
  authProviderId: string;
  displayName: string;
  email: string;
  roles: UserRole[];
  createdAt: Date;
}

export type UserRole = 'owner' | 'commissioner' | 'general-manager';

export interface AuditLog {
  id: string;
  leagueId: string;
  actorUserId: string;
  action: string;
  payload: Record<string, any>;
  createdAt: Date;
}

// ===== DRAFT SYSTEM TYPES =====

// Rights Management - Core concept for acquisition system
export interface PlayerRights {
  id: string;
  playerId: string;
  rightsTeamId: string;
  leagueId: string;
  capHold: number; // placeholder cap hit until signed or renounced
  rightsExpireAt: Date;
  acquisitionMethod: 'draft' | 'auction' | 'free_agency';
  acquisitionPrice?: number; // for auction/FA tracking
  createdAt: Date;
}

// Draft State Management - Real-time draft tracking
export interface DraftState {
  id: string;
  leagueId: string;
  currentPick: number;
  currentTeamId: string;
  timeRemaining: number;
  isPaused: boolean;
  isComplete: boolean;
  draftOrder: string[]; // team IDs in draft order
  completedPicks: Pick[];
  settings: DraftSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface DraftSettings {
  mode: DraftMode;
  rounds: number;
  timeLimit: number;
  autodraftDelay: number;
  allowPickTrading: boolean;
  allowChatting: boolean;
}

// Enhanced Pick interface for draft tracking
export interface DraftPick extends Pick {
  pickNumber: number; // overall pick number (1, 2, 3, etc.)
  draftedAt?: Date;
  isAutodrafted: boolean;
  timeUsed: number; // seconds used for this pick
}

// Auction State Management
export interface AuctionState {
  id: string;
  leagueId: string;
  currentPlayerId?: string;
  currentHighBid?: number;
  currentHighBidder?: string;
  timeRemaining: number;
  activeBidders: string[]; // team IDs currently in bidding
  isComplete: boolean;
  settings: AuctionSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuctionSettings {
  budget: number;
  bidIncrement: number;
  bidTimeLimit: number;
  maxNominations: number;
  capHoldMultiplier: number;
}

export interface AuctionBid {
  id: string;
  auctionId: string;
  playerId: string;
  teamId: string;
  bidAmount: number;
  timestamp: Date;
}

// Contract Negotiation System
export interface ContractNegotiation {
  id: string;
  playerId: string;
  teamId: string;
  leagueId: string;
  currentOffer?: ContractOffer;
  agentResponse?: AgentResponse;
  negotiationHistory: NegotiationEvent[];
  expiresAt: Date;
  status: NegotiationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type NegotiationStatus =
  | 'active'
  | 'agreed'
  | 'renounced'
  | 'expired'
  | 'tagged';

export interface ContractOffer {
  years: 1 | 2 | 3;
  baseSalary: Record<number, number>; // year -> base salary
  signingBonus: number;
  guarantees: Guarantee[];
  contractType: ContractType;
  totalValue: number; // calculated total
  apy: number; // average per year
}

export type ContractType = 'prove_it' | 'bridge' | 'standard';

export interface AgentResponse {
  decision: 'accept' | 'counter' | 'reject';
  counterOffer?: ContractOffer;
  reasoning: string;
  satisfactionScore: number; // 0-100, how happy the player is
  factors: AgentFactors;
}

export interface AgentFactors {
  guaranteeWeight: number;
  apyWeight: number;
  lengthWeight: number;
  teamFactors: {
    contenderBonus: number;
    loyaltyDiscount: number;
    marketSizePreference: number;
  };
}

export interface NegotiationEvent {
  id: string;
  type: 'offer' | 'counter' | 'accept' | 'reject' | 'renounce' | 'tag';
  offer?: ContractOffer;
  message?: string;
  timestamp: Date;
  actorType: 'team' | 'agent';
}

// Player Negotiation Profile - AI behavior settings
export interface PlayerNegotiationProfile {
  playerId: string;
  guaranteeBias: number; // 0-1, how much they prioritize guarantees
  lengthPreference: 1 | 2 | 3; // preferred contract length
  apyWeight: number; // importance of average per year
  riskTolerance: number; // 0-1, willingness to take prove-it deals
  loyaltyFactor: number; // discount for staying with current team
  marketValueEstimate: number; // estimated market APY
  negotiationStyle: 'aggressive' | 'reasonable' | 'flexible';
}

// Contract Rails - Validation rules for contracts
export interface ContractRails {
  maxYears: 3;
  minBase: number; // league minimum salary
  maxSigningBonusPct: number; // max % of total value as signing bonus
  guaranteeRanges: {
    '1year': { min: number; max: number };
    '2year': { min: number; max: number };
    '3year': { min: number; max: number };
  };
  apyDiscounts: {
    '3year': number; // discount for 3-year deals vs shorter
  };
  positionMultipliers: Record<Position, number>; // position-based value adjustments
}

// Team Control Mechanisms
export interface QualifyingOffer {
  id: string;
  playerId: string;
  teamId: string;
  leagueId: string;
  offerAmount: number; // calculated based on tier/position
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

export interface FranchiseTag {
  id: string;
  playerId: string;
  teamId: string;
  leagueId: string;
  tagType: 'franchise' | 'transition';
  contractValue: number; // auto-calculated market rate
  year: number;
  createdAt: Date;
}

// Draft Room Chat System
export interface DraftMessage {
  id: string;
  draftId: string;
  userId: string;
  teamId: string;
  message: string;
  type: 'chat' | 'pick' | 'trade' | 'system';
  timestamp: Date;
}

// Auto-draft Queue
export interface AutodraftQueue {
  id: string;
  teamId: string;
  leagueId: string;
  playerIds: string[]; // ordered list of preferred players
  updatedAt: Date;
}
