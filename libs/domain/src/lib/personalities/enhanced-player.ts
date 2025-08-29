import { Player, Position } from '@fantasy-football-dynasty/types';

/**
 * Enhanced player interface that includes personality traits and location preferences
 * This will be used for both free agency decisions and contract negotiations
 */
export interface EnhancedPlayer extends Player {
  // Core personality information
  personality: PlayerPersonality;

  // Location preferences and team history
  locationPreferences: LocationPreference[];
  currentTeamId?: string;
  previousTeamIds: string[];

  // Contract and negotiation history
  contractHistory: ContractHistoryEntry[];
  negotiationHistory: NegotiationHistoryEntry[];

  // Market experiences that affect personality evolution
  marketExperiences: MarketExperience[];

  // Life events that can change personality
  lifeEvents: LifeEvent[];
}

/**
 * Core personality structure that drives all player decisions
 */
export interface PlayerPersonality {
  // Core personality type and rarity
  type: string;
  rarity: number;

  // Personality traits (labels for UI)
  traits: PersonalityTraits;

  // Personality weights (0-1 priorities)
  weights: PersonalityWeights;

  // Behavioral parameters
  behaviors: PersonalityBehaviors;

  // Hidden sliders that make personalities feel alive
  hiddenSliders: HiddenSliders;

  // Feedback templates for realistic player responses
  feedbackTemplates: FeedbackTemplates;

  // Personality blending (multiple archetype inheritance)
  blending: PersonalityBlending;

  // Trade and extension preferences
  tradePreferences: TradePreferences;

  // Market context and anchors
  marketContext: PlayerMarketContext;

  // Evolution tracking and cooldowns
  evolution: PersonalityEvolution;
}

/**
 * Core personality traits that define player behavior
 */
export interface PersonalityTraits {
  negotiationStyle:
    | 'aggressive'
    | 'patient'
    | 'desperate'
    | 'cooperative'
    | 'flexible'
    | 'conservative';
  riskTolerance: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  teamLoyalty: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  locationPreference:
    | 'big_markets'
    | 'warm_weather'
    | 'rural_areas'
    | 'neutral'
    | 'current_team'
    | 'winning_teams'
    | 'stable_markets';
  deadlineBehavior:
    | 'pressure_team'
    | 'wait_for_best'
    | 'accept_quickly'
    | 'compromise'
    | 'prioritize_opportunity'
    | 'seek_security';
}

/**
 * Decision weights that determine how players evaluate offers
 */
export interface PersonalityWeights {
  moneyPriority: number; // 0.0 - 1.0: How much they prioritize total compensation
  winningPriority: number; // 0.0 - 1.0: How much they prioritize team success
  locationPriority: number; // 0.0 - 1.0: How much they prioritize location
  guaranteePriority: number; // 0.0 - 1.0: How much they prioritize guaranteed money
  lengthPriority: number; // 0.0 - 1.0: How much they prioritize contract length
}

/**
 * Behavioral parameters that affect negotiation outcomes
 */
export interface PersonalityBehaviors {
  holdoutThreshold: number; // 0.0 - 1.0: Likelihood to hold out
  counterOfferMultiplier: number; // 1.0+: How much they increase demands
  deadlineSoftening: number; // 0.0 - 0.1: Per-week reduction in holdout threshold
  comparisonWeight: number; // 0.0 - 1.0: How much they compare to market
  deadlineSusceptibility: number; // 0.0 - 1.0: How much deadline pressure affects decisions
}

/**
 * Hidden sliders that make personalities feel alive
 */
export interface HiddenSliders {
  ego: number; // 0.0 - 1.0: Amplifies brand/market desires and "respect" rejections
  injuryAnxiety: number; // 0.0 - 1.0: Increases guarantee_priority dynamically after injuries
  agentQuality: number; // 0.0 - 1.0: Improves counter timing, reduces bad acceptances
  schemeFit: number; // 0.0 - 1.0: Interacts with winning_priority and length_priority
  rolePromise: number; // 0.0 - 1.0: Multiplies winning_term (players care about usage)
  taxSensitivity: number; // 0.0 - 1.0: Adjust money_term by state income tax
  endorsementValue: number; // 0.0 - 1.0: Feeds location_term (big markets boost WR/QB more than OG)
}

/**
 * Feedback templates for realistic player responses
 */
export interface FeedbackTemplates {
  rejectLowOffer: string[]; // Response when rejecting low offers
  counterOffer: string[]; // Response when making counter-offers
  holdoutWarning: string[]; // Warning about potential holdout
  accept: string[]; // Response when accepting offers
  gmNote: string[]; // Private notes for GM UI about decision factors
}

/**
 * Location preference with team matching
 */
export interface LocationPreference {
  type: string; // big_markets, warm_weather, etc.
  weight: number; // 0.0 - 1.0: Strength of preference
  cities: string[]; // Preferred cities
  currentTeamMatch: boolean; // Whether current team matches preference
}

/**
 * Contract history for personality evolution
 */
export interface ContractHistoryEntry {
  contractId: string;
  teamId: string;
  startYear: number;
  endYear: number;
  totalValue: number;
  guaranteedAmount: number;
  wasOverpaid: boolean; // Market comparison result
  wasUnderpaid: boolean; // Market comparison result
  negotiationStyle: string; // How they negotiated this deal
  outcome: 'accepted' | 'rejected' | 'countered' | 'held_out';
}

/**
 * Negotiation history for learning and evolution
 */
export interface NegotiationHistoryEntry {
  negotiationId: string;
  teamId: string;
  year: number;
  scenario: 'free_agency' | 'contract_extension' | 'trade_negotiation';
  initialOffer: number;
  finalOffer: number;
  wasAccepted: boolean;
  holdoutDuration?: number; // Days held out if applicable
  counterOffers: number; // Number of counter-offers made
  outcome: 'accepted' | 'rejected' | 'held_out' | 'traded';
}

/**
 * Personality blending from multiple archetypes
 */
export interface PersonalityBlending {
  primaryArchetype: string;
  secondaryArchetype?: string;
  blendRatio: number; // 0.0-1.0, how much secondary influences primary
  inheritedTraits: string[]; // Which traits came from secondary archetype
  resolvedParams: Record<string, number>; // Final blended parameter values
}

/**
 * Trade and extension preferences
 */
export interface TradePreferences {
  requiresExtensionProbability: number; // 0.0-1.0, chance of requiring extension on arrival
  reportingDelayIfUnhappy: number; // Days delay if traded to unwanted location
  tradeDeadlineBehavior:
    | 'accept_quickly'
    | 'wait_for_best'
    | 'require_extension'
    | 'holdout';
  extensionTerms: {
    minYears: number;
    minGuaranteedPct: number;
    apyMultiplier: number; // 1.0+ for premium extension
  };
}

/**
 * Market context and anchors for position-specific behavior
 */
export interface PlayerMarketContext {
  position: Position;
  apyPercentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  guaranteePercentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  supplyPressure: number; // 0.0-1.0, how scarce the position is
  marketTrend: 'rising' | 'falling' | 'stable';
  lastUpdated: number; // Timestamp for market data freshness
}

/**
 * Enhanced evolution tracking with cooldowns
 */
export interface PersonalityEvolution {
  evolutionCount: number;
  lastEvolutionYear: number;
  evolutionHistory: PersonalityChange[];

  // Cooldown system to prevent rapid changes
  cooldowns: EvolutionCooldown[];

  // Age-based evolution tracking
  ageEvolutionMilestones: AgeMilestone[];

  // Market experience tracking
  marketExperiences: MarketExperience[];

  // Life event tracking
  lifeEvents: LifeEvent[];
}

/**
 * Evolution cooldown to prevent rapid personality changes
 */
export interface EvolutionCooldown {
  trait: string;
  startTime: number;
  durationWeeks: number;
  reason: string;
  isActive: boolean;
}

/**
 * Age-based evolution milestones
 */
export interface AgeMilestone {
  age: number;
  year: number;
  changes: PersonalityChange[];
  description: string;
}

/**
 * Market experience that can influence personality
 */
export interface MarketExperience {
  type:
    | 'successful_holdout'
    | 'failed_holdout'
    | 'market_overpayment'
    | 'team_betrayal'
    | 'championship_win'
    | 'playoff_exit'
    | 'injury_recovery';
  year: number;
  week?: number;
  description: string;
  impact: PersonalityChange[];
  durationWeeks: number;
}

/**
 * Life event that can influence personality
 */
export interface LifeEvent {
  type:
    | 'major_injury'
    | 'championship_win'
    | 'team_change'
    | 'age_milestone'
    | 'personal_issue'
    | 'career_highlight';
  year: number;
  week?: number;
  description: string;
  impact: PersonalityChange[];
  durationWeeks: number;
}

/**
 * How personality traits change over time
 */
export interface PersonalityChange {
  trait: string; // Which trait is affected
  change: number; // Amount of change (-1.0 to +1.0)
  reason: string; // Why the change occurred
  permanent: boolean; // Whether change is permanent
}

/**
 * Team information for location matching
 */
export interface TeamLocation {
  teamId: string;
  city: string;
  state: string;
  timezone: string;
  marketSize: 'small' | 'medium' | 'large';
  climate: 'cold' | 'temperate' | 'warm';
  isContender: boolean; // Whether team is currently contending
  isStable: boolean; // Whether team has stable management
}

/**
 * Contract offer evaluation context
 */
export interface ContractEvaluationContext {
  offer: ContractOffer;
  team: TeamLocation;
  marketConditions: MarketConditions;
  competingOffers: ContractOffer[];
  currentWeek: number;
  seasonStage: 'EarlyFA' | 'MidFA' | 'LateFA' | 'OpenFA' | 'RegularSeason';
}

/**
 * Contract offer structure
 */
export interface ContractOffer {
  years: number;
  totalValue: number;
  apy: number;
  guaranteedAmount: number;
  signingBonus: number;
  performanceIncentives: PerformanceIncentive[];
  teamQuality: number; // 0.0 - 1.0: How good the team is
  locationMatch: number; // 0.0 - 1.0: How well location matches preferences
}

/**
 * Performance incentives
 */
export interface PerformanceIncentive {
  type:
    | 'yards'
    | 'touchdowns'
    | 'pro_bowl'
    | 'all_pro'
    | 'playoffs'
    | 'championship';
  threshold: number;
  bonus: number;
}

/**
 * Market conditions for evaluation
 */
export interface MarketConditions {
  positionDemand: number; // 0.0 - 1.0: Current demand for this position
  marketTrend: 'rising' | 'falling' | 'stable';
  recentComparables: ContractOffer[];
  leagueCapSpace: number;
  teamCount: number;
}

/**
 * Player decision result from contract evaluation
 */
export interface PlayerDecision {
  playerId: string;
  offer: ContractOffer;
  decision: 'accept' | 'reject' | 'counter' | 'holdout' | 'shortlist';
  reasoning: string;
  feedback: string;
  counterOffer?: ContractOffer;
  holdoutDuration?: number;
  personalityFactors: string[]; // Which personality traits influenced the decision
}

/**
 * Utility functions for working with enhanced players
 */
export class EnhancedPlayerUtils {
  /**
   * Calculate how well a team location matches player preferences
   */
  static calculateLocationMatch(
    player: EnhancedPlayer,
    team: TeamLocation
  ): number {
    const preferences = player.locationPreferences;
    let totalMatch = 0;
    let totalWeight = 0;

    for (const pref of preferences) {
      const match = this.calculatePreferenceMatch(pref, team, player);
      totalMatch += match * pref.weight;
      totalWeight += pref.weight;
    }

    return totalWeight > 0 ? totalMatch / totalWeight : 0.5;
  }

  /**
   * Calculate match for a specific location preference
   */
  private static calculatePreferenceMatch(
    pref: LocationPreference,
    team: TeamLocation,
    player: EnhancedPlayer
  ): number {
    switch (pref.type) {
      case 'big_markets':
        return team.marketSize === 'large'
          ? 1.0
          : team.marketSize === 'medium'
          ? 0.5
          : 0.0;

      case 'warm_weather':
        return team.climate === 'warm'
          ? 1.0
          : team.climate === 'temperate'
          ? 0.7
          : 0.0;

      case 'rural_areas':
        return team.marketSize === 'small'
          ? 1.0
          : team.marketSize === 'medium'
          ? 0.5
          : 0.0;

      case 'current_team':
        return team.teamId === player.currentTeamId ? 1.0 : 0.0;

      case 'winning_teams':
        return team.isContender ? 1.0 : 0.3;

      case 'stable_markets':
        return team.isStable ? 1.0 : 0.4;

      case 'neutral':
      default:
        return 0.5;
    }
  }

  /**
   * Get personality-based feedback for a decision
   */
  static getPersonalityFeedback(
    player: EnhancedPlayer,
    decision: string,
    context: string
  ): string {
    const templates = player.personality.feedbackTemplates;

    switch (decision) {
      case 'reject':
        return this.selectRandomTemplate(templates.rejectLowOffer);
      case 'counter':
        return this.selectRandomTemplate(templates.counterOffer);
      case 'holdout':
        return this.selectRandomTemplate(templates.holdoutWarning);
      case 'accept':
        return this.selectRandomTemplate(templates.accept);
      default:
        return "I'm considering my options.";
    }
  }

  /**
   * Select a random template from an array
   */
  private static selectRandomTemplate(templates: string[]): string {
    if (templates.length === 0) return "I'm considering my options.";
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Check if player personality should evolve based on recent events
   */
  static shouldEvolvePersonality(
    player: EnhancedPlayer,
    currentYear: number
  ): boolean {
    const evolution = player.personality.evolution;
    const yearsSinceLastEvolution = currentYear - evolution.lastEvolutionYear;

    // Personality can evolve every 2-3 years
    return yearsSinceLastEvolution >= 2 && evolution.evolutionCount < 3;
  }
}
