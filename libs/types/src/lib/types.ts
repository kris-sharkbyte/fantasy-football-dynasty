// Core types for Dynasty Fantasy Football application

export interface League {
  id: string;
  name: string;
  rules: LeagueRules;
  currentYear: number;
  phase: LeaguePhase;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeagueRules {
  scoring: ScoringRules;
  cap: CapRules;
  contracts: ContractRules;
  draft: DraftRules;
  freeAgency: FreeAgencyRules;
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
  rounds: number;
  timeLimit: number; // seconds per pick
  snakeOrder: boolean;
}

export interface FreeAgencyRules {
  bidRounds: number; // seconds between bid rounds
  tieBreakers: TieBreaker[];
}

export type TieBreaker = 'guarantees' | 'apy' | 'length' | 'random';

export type LeaguePhase =
  | 'offseason'
  | 'free-agency'
  | 'draft'
  | 'preseason'
  | 'regular-season'
  | 'playoffs';

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
