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
  location: TeamLocation;
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

export type Position =
  | 'QB'
  | 'RB'
  | 'WR'
  | 'TE'
  | 'K'
  | 'DEF'
  | 'DL'
  | 'LB'
  | 'DB';
export type RosterStatus = 'active' | 'bench' | 'ir' | 'taxi';

export interface Player {
  id: string;
  name: string;
  nflTeam: string;
  position: Position;
  age: number;
  devGrade: 'A' | 'B' | 'C' | 'D';
  overall: number;
  yearsExp: number; // Add years of experience for FA evaluation
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

// ===== FREE AGENCY WEEK SYSTEM =====

// FA Week Management
export interface FAWeek {
  id: string;
  leagueId: string;
  weekNumber: number; // 1-4 for FA weeks, 5+ for open FA
  phase: 'FA_WEEK' | 'OPEN_FA';
  startDate: Date;
  endDate: Date;
  status: 'active' | 'evaluating' | 'completed';
  readyTeams: string[]; // team IDs that are ready to advance
  evaluationResults: FAEvaluationResult[];
  createdAt: Date;
  updatedAt: Date;
}

// Blind Bidding System
export interface FABid {
  id: string;
  leagueId: string;
  teamId: string;
  playerId: number;
  weekNumber: number;
  offer: ContractOffer;
  status: 'pending' | 'accepted' | 'shortlisted' | 'rejected';
  submittedAt: Date;
  evaluatedAt?: Date;
  feedback?: string; // Player's response message
}

// FA Week Evaluation Results
export interface FAEvaluationResult {
  playerId: string;
  decisions: PlayerDecision[];
  marketImpact: MarketImpact;
  processedAt: Date;
}

// Individual Player Decision
export interface PlayerDecision {
  playerId: string;
  acceptedBidId?: string; // If player accepted an offer
  shortlistedBidIds: string[]; // Top 1-3 offers to keep alive
  rejectedBidIds: string[]; // Offers that were insultingly low
  feedback: string; // Player's reasoning
  trustImpact: Record<string, number>; // Impact on team trust scores
  // Enhanced decision details
  decisionReason: 'accepted' | 'shortlisted' | 'rejected' | 'waiting';
  startingPositionProspects: {
    isStarter: boolean;
    confidence: number; // 0-1 scale
    competingPlayers: number;
    teamDepth: 'shallow' | 'moderate' | 'deep';
    reasoning: string;
  };
  contractAnalysis: {
    aavScore: number; // 0-1 scale
    signingBonusScore: number; // 0-1 scale
    guaranteeScore: number; // 0-1 scale
    lengthScore: number; // 0-1 scale
    teamScore: number; // 0-1 scale
    totalScore: number; // 0-1 scale
    threshold: number; // Acceptance threshold
  };
  marketFactors: {
    competingOffers: number;
    positionalDemand: number;
    marketPressure: number;
    recentComparables: string[]; // Player IDs of recent signings
  };
  playerNotes: string; // Detailed player reasoning
  agentNotes: string; // Agent's professional assessment
}

// Market Impact from Signings
export interface MarketImpact {
  position: Position;
  tier: 'elite' | 'starter' | 'depth';
  benchmarkContract: ContractOffer; // The contract that sets the new market
  marketShift: 'up' | 'down' | 'stable';
  shiftPercentage: number; // How much other players' expectations change
  affectedPlayers: string[]; // Player IDs whose expectations are affected
}

// FA Week Settings
export interface FAWeekSettings {
  maxConcurrentOffers: number; // Per team (default: 5-8)
  evaluationFrequency: 'weekly' | 'daily'; // How often players evaluate
  shortlistSize: number; // Max offers to shortlist (default: 3)
  trustPenalty: number; // Trust reduction for insultingly low offers
  marketRippleEnabled: boolean; // Whether signed contracts affect market
  openFADiscount: number; // Percentage discount for open FA deals (default: 20%)
}

// FA Week State for Real-time Updates
export interface FAWeekState {
  currentWeek: FAWeek;
  activeBids: FABid[];
  teamCapHolds: Record<string, number>; // Cap space held by pending bids
  marketBenchmarks: MarketImpact[]; // Recent contracts affecting market
  readyToAdvance: boolean; // Whether all teams are ready
  timeUntilAdvance?: number; // Seconds until auto-advance
}

// Open FA Immediate Signing
export interface OpenFASigning {
  id: string;
  leagueId: string;
  teamId: string;
  playerId: number;
  contract: ContractOffer; // Auto-priced 1-year deal
  signedAt: Date;
  marketPrice: number; // The calculated market price
  discountApplied: number; // How much discount was applied
}

// Team FA Status
export interface TeamFAStatus {
  teamId: string;
  leagueId: string;
  currentWeek: number;
  activeBids: string[]; // Bid IDs
  capHolds: number; // Total cap space held by pending bids
  isReady: boolean; // Whether team is ready to advance
  lastActivity: Date;
}

// FA Week Advancement
export interface FAWeekAdvancement {
  leagueId: string;
  fromWeek: number;
  toWeek: number;
  advancementType: 'manual' | 'auto' | 'timer';
  processedAt: Date;
  summary: {
    contractsSigned: number;
    totalValue: number;
    marketShifts: number;
    teamsReady: number;
  };
}

// Market Context for Player Evaluation
export interface MarketContext {
  leagueId: string;
  currentWeek: number;
  positionalDemand: number; // 0-1 scale of demand for each position
  seasonStage: 'EarlyFA' | 'MidFA' | 'LateFA' | 'OpenFA';
  recentComps: ContractOffer[]; // Recent contracts for similar players
  teamCapSpace: Record<string, number>; // Available cap space per team
  marketTrends: {
    overall: 'rising' | 'falling' | 'stable';
    byPosition: Record<string, 'rising' | 'falling' | 'stable'>;
    byTier: Record<string, 'rising' | 'falling' | 'stable'>;
  };
}

// New unified Player system interfaces for Sports Data
export interface SportsTeam {
  Key: string;
  TeamID: number;
  PlayerID: number;
  City: string;
  Name: string;
  Conference: string;
  Division: string;
  FullName: string;
  StadiumID: number;
  ByeWeek: number;
  AverageDraftPosition: number;
  AverageDraftPositionPPR: number;
  PrimaryColor: string;
  SecondaryColor: string;
  TertiaryColor: string;
  QuaternaryColor: string | null;
  WikipediaLogoUrl: string;
  WikipediaWordMarkUrl: string;
  DraftKingsName: string;
  DraftKingsPlayerID: number;
  FanDuelName: string;
  FanDuelPlayerID: number;
  AverageDraftPosition2QB: number;
  AverageDraftPositionDynasty: number;
  StadiumDetails: {
    StadiumID: number;
    Name: string;
    City: string;
    State: string;
    Country: string;
    Capacity: number;
    PlayingSurface: string;
    GeoLat: number;
    GeoLong: number;
    Type: string;
  };
}

export interface SportsPlayer {
  PlayerID: number;
  Team: string | null;
  Number: number | null;
  FirstName: string;
  LastName: string;
  Position: string;
  Status: string;
  Height: string;
  Weight: number;
  BirthDate: string;
  College: string;
  Experience: number;
  FantasyPosition: string;
  Active: boolean;
  PositionCategory: string;
  Name: string;
  Age: number;
  PhotoUrl: string | null;
  ByeWeek: number;
  UpcomingGameOpponent: string | null;
  UpcomingGameWeek: number | null;
  ShortName: string;
  AverageDraftPosition: number | null;
  AverageDraftPositionPPR: number | null;
  AverageDraftPositionRookie: number | null;
  AverageDraftPositionDynasty: number | null;
  AverageDraftPosition2QB: number | null;
  TeamID: number | null;
  GlobalTeamID: number | null;
  DraftKingsName: string | null;
  FanDuelName: string | null;
  YahooName: string | null;
  InjuryStatus: string | null;
  InjuryBodyPart: string | null;
  InjuryNotes: string | null;
  InjuryStartDate: string | null;
  DeclaredInactive: boolean;
  UpcomingDraftKingsSalary: number | null;
  FanDuelSalary: number | null;
  DraftKingsSalary: number | null;
  YahooSalary: number | null;
  FantasyDraftSalary: number | null;
  FantasyDraftName: string | null;
  UsaTodayHeadshotUrl: string | null;
  UsaTodayHeadshotNoBackgroundUrl: string | null;
  UsaTodayHeadshotUpdated: string | null;
  UsaTodayHeadshotNoBackgroundUpdated: string | null;
  overall?: number;
}

export interface PlayerStats {
  PlayerID: number;
  SeasonType: number;
  Season: number;
  Team: string;
  Number: number;
  Name: string;
  Position: string;
  PositionCategory: string;
  Played: number;
  Started: number;
  PassingAttempts: number;
  PassingCompletions: number;
  PassingYards: number;
  PassingCompletionPercentage: number;
  PassingYardsPerAttempt: number;
  PassingYardsPerCompletion: number;
  PassingTouchdowns: number;
  PassingInterceptions: number;
  PassingRating: number;
  PassingLong: number;
  PassingSacks: number;
  PassingSackYards: number;
  RushingAttempts: number;
  RushingYards: number;
  RushingYardsPerAttempt: number;
  RushingTouchdowns: number;
  RushingLong: number;
  ReceivingTargets: number;
  Receptions: number;
  ReceivingYards: number;
  ReceivingYardsPerReception: number;
  ReceivingTouchdowns: number;
  ReceivingLong: number;
  Fumbles: number;
  FumblesLost: number;
  PuntReturns: number;
  PuntReturnYards: number;
  PuntReturnTouchdowns: number;
  KickReturns: number;
  KickReturnYards: number;
  KickReturnTouchdowns: number;
  SoloTackles: number;
  AssistedTackles: number;
  TacklesForLoss: number;
  Sacks: number;
  SackYards: number;
  QuarterbackHits: number;
  PassesDefended: number;
  FumblesForced: number;
  FumblesRecovered: number;
  FumbleReturnTouchdowns: number;
  Interceptions: number;
  InterceptionReturnTouchdowns: number;
  FieldGoalsAttempted: number;
  FieldGoalsMade: number;
  ExtraPointsMade: number;
  TwoPointConversionPasses: number;
  TwoPointConversionRuns: number;
  TwoPointConversionReceptions: number;
  FantasyPoints: number;
  FantasyPointsPPR: number;
  FantasyPosition: string;
  PlayerSeasonID: number;
  ExtraPointsAttempted: number;
  AuctionValue: number | null;
  AuctionValuePPR: number | null;
  FantasyPointsFanDuel: number;
  FieldGoalsMade0to19: number;
  FieldGoalsMade20to29: number;
  FieldGoalsMade30to39: number;
  FieldGoalsMade40to49: number;
  FieldGoalsMade50Plus: number;
  FantasyPointsDraftKings: number;
  AverageDraftPosition: number | null;
  AverageDraftPositionPPR: number | null;
  TeamID: number;
  AverageDraftPositionRookie: number | null;
  AverageDraftPositionDynasty: number | null;
  AverageDraftPosition2QB: number | null;
}

// Enhanced Player interface that combines base player data with stats
export interface EnhancedSportsPlayer extends SportsPlayer {
  stats?: PlayerStats;
  teamInfo?: SportsTeam;
  overall?: number;
  marketValue?: number;
  fantasyPoints?: number;
  fantasyPointsPPR?: number;
}

export interface TeamLocation {
  city: string;
  state: string;
  timezone: string;
  marketSize: 'small' | 'medium' | 'large';
  climate: 'cold' | 'temperate' | 'warm';
  stadiumName: string;
  stadiumCapacity: number;
  isContender: boolean;
  isStable: boolean;
  taxRate: number; // State income tax rate for contract calculations
}
