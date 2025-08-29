import {
  Contract,
  Guarantee,
  CapLedger,
  Team,
  Player,
  Position,
  FAWeek,
  FABid,
  FAWeekSettings,
  FAEvaluationResult,
  PlayerDecision,
  MarketImpact,
  ContractOffer,
  OpenFASigning,
} from '@fantasy-football-dynasty/types';

export class CapMath {
  /**
   * Calculate the cap hit for a contract in a specific year
   */
  static calculateCapHit(contract: Contract, year: number): number {
    if (year < contract.startYear || year > contract.endYear) {
      return 0;
    }

    const baseSalary = contract.baseSalary[year] || 0;
    const proratedBonus = this.calculateProratedBonus(contract, year);

    return baseSalary + proratedBonus;
  }

  /**
   * Calculate prorated signing bonus for a specific year
   */
  static calculateProratedBonus(contract: Contract, year: number): number {
    if (contract.signingBonus === 0) return 0;

    const contractLength = contract.endYear - contract.startYear + 1;
    const maxProrationYears = Math.min(contractLength, 5); // NFL rule: max 5 years

    return contract.signingBonus / maxProrationYears;
  }

  /**
   * Calculate dead money when a contract is cut or traded
   */
  static calculateDeadMoney(
    contract: Contract,
    cutYear: number,
    preJune1: boolean = false
  ): { currentYear: number; nextYear: number } {
    const remainingBonus = this.calculateRemainingBonus(contract, cutYear - 1);

    if (preJune1) {
      // All remaining bonus accelerates to current year
      return { currentYear: remainingBonus, nextYear: 0 };
    } else {
      // Current year's proration stays, rest accelerates to next year
      const currentYearProration = this.calculateProratedBonus(
        contract,
        cutYear
      );
      const nextYearAcceleration = remainingBonus - currentYearProration;

      return {
        currentYear: currentYearProration,
        nextYear: Math.max(0, nextYearAcceleration),
      };
    }
  }

  /**
   * Calculate remaining unamortized signing bonus through a specific year
   */
  static calculateRemainingBonus(
    contract: Contract,
    throughYear: number
  ): number {
    if (contract.signingBonus === 0) return 0;

    const totalProration = this.calculateTotalProration(contract);
    const yearsElapsed = Math.max(0, throughYear - contract.startYear + 1);
    const prorationPaid = totalProration * yearsElapsed;

    return Math.max(0, contract.signingBonus - prorationPaid);
  }

  /**
   * Calculate total proration for a contract
   */
  static calculateTotalProration(contract: Contract): number {
    if (contract.signingBonus === 0) return 0;

    const contractLength = contract.endYear - contract.startYear + 1;
    const maxProrationYears = Math.min(contractLength, 5);

    return contract.signingBonus / maxProrationYears;
  }

  /**
   * Calculate guaranteed money for a contract
   */
  static calculateGuaranteedMoney(contract: Contract, year: number): number {
    return contract.guarantees
      .filter((g) => g.year <= year)
      .reduce((total, guarantee) => total + guarantee.amount, 0);
  }

  /**
   * Validate if a team can afford a contract
   */
  static canAffordContract(
    team: Team,
    contract: Contract,
    year: number
  ): boolean {
    const capHit = this.calculateCapHit(contract, year);
    return team.capSpace >= capHit;
  }

  /**
   * Calculate cap space after signing a contract
   */
  static calculateRemainingCapSpace(
    team: Team,
    contract: Contract,
    year: number
  ): number {
    const capHit = this.calculateCapHit(contract, year);
    return team.capSpace - capHit;
  }

  /**
   * Check if a team can afford a contract by year, considering all existing contracts
   */
  static canAffordContractByYear(
    team: Team,
    newContract: Contract,
    existingContracts: Contract[],
    year: number,
    salaryCap: number
  ): {
    canAfford: boolean;
    currentCapHit: number;
    newCapHit: number;
    remainingCap: number;
  } {
    // Calculate current cap hit for the year
    const currentCapHit = existingContracts
      .filter(
        (contract) => year >= contract.startYear && year <= contract.endYear
      )
      .reduce(
        (total, contract) => total + this.calculateCapHit(contract, year),
        0
      );

    // Calculate new contract cap hit for the year
    const newCapHit = this.calculateCapHit(newContract, year);

    // Calculate total cap hit if contract is added
    const totalCapHit = currentCapHit + newCapHit;

    // Check if team can afford it
    const canAfford = totalCapHit <= salaryCap;
    const remainingCap = salaryCap - totalCapHit;

    return {
      canAfford,
      currentCapHit,
      newCapHit,
      remainingCap,
    };
  }

  /**
   * Calculate total cap hit for a team in a specific year
   */
  static calculateTeamCapHit(
    team: Team,
    contracts: Contract[],
    year: number
  ): number {
    return contracts
      .filter(
        (contract) => year >= contract.startYear && year <= contract.endYear
      )
      .reduce(
        (total, contract) => total + this.calculateCapHit(contract, year),
        0
      );
  }
}

export class ContractMinimumCalculator {
  /**
   * Calculate minimum contract value based on player tier, age, and position
   * Based on PLAYER_CONTRACT.md specifications
   */
  static calculateMinimumContract(
    playerTier: 'elite' | 'starter' | 'depth',
    playerAge: number,
    playerPosition: Position,
    salaryCap: number
  ): number {
    const tierBase = this.getTierBase(playerTier);
    const ageModifier = this.getAgeModifier(playerAge);
    const positionModifier = this.getPositionModifier(playerPosition);

    const minimumPercentage = tierBase * ageModifier * positionModifier;
    return Math.round(salaryCap * minimumPercentage);
  }

  /**
   * Calculate rookie scale minimum based on draft round
   */
  static calculateRookieMinimum(draftRound: number, salaryCap: number): number {
    const roundPercentages: Record<number, number> = {
      1: draftRound <= 8 ? 0.08 : draftRound <= 16 ? 0.07 : 0.06,
      2: 0.04,
      3: 0.03,
      4: 0.025,
      5: 0.02,
      6: 0.015,
      7: 0.01,
    };

    const percentage = roundPercentages[draftRound] || 0.005; // UDFA default
    return Math.round(salaryCap * percentage);
  }

  /**
   * Get tier base percentage
   */
  private static getTierBase(tier: 'elite' | 'starter' | 'depth'): number {
    switch (tier) {
      case 'elite':
        return 0.2;
      case 'starter':
        return 0.1;
      case 'depth':
        return 0.03;
      default:
        return 0.1;
    }
  }

  /**
   * Get age modifier
   */
  private static getAgeModifier(age: number): number {
    if (age < 24) return 0.8;
    if (age >= 24 && age <= 29) return 1.0;
    if (age >= 30 && age <= 33) return 0.7;
    return 0.5; // 34+
  }

  /**
   * Get position modifier
   */
  private static getPositionModifier(position: Position): number {
    switch (position) {
      case 'QB':
        return 1.0;
      case 'RB':
      case 'WR':
        return 0.8;
      case 'TE':
        return 0.6;
      case 'K':
        return 0.2;
      case 'DEF':
        return 0.5; // Defense gets a moderate modifier
      default:
        return 0.5;
    }
  }

  /**
   * Determine player tier based on overall rating and experience
   * This is a simplified heuristic - can be enhanced with more sophisticated logic
   */
  static determinePlayerTier(
    overall: number,
    yearsExp: number,
    position: Position
  ): 'elite' | 'starter' | 'depth' {
    // Elite: High overall rating or proven veterans
    if (overall >= 85 || (yearsExp >= 3 && overall >= 80)) {
      return 'elite';
    }

    // Starter: Solid overall rating or young players with potential
    if (overall >= 75 || (yearsExp <= 2 && overall >= 70)) {
      return 'starter';
    }

    // Depth: Lower overall rating or inexperienced players
    return 'depth';
  }

  /**
   * Validate if a contract meets minimum requirements
   */
  static validateContractMinimum(
    contract: Contract,
    player: {
      age: number;
      position: Position;
      overall: number;
      yearsExp: number;
    },
    salaryCap: number,
    isRookie: boolean = false,
    draftRound?: number
  ): {
    isValid: boolean;
    minimumRequired: number;
    currentValue: number;
    message: string;
  } {
    let minimumRequired: number;

    if (isRookie && draftRound) {
      minimumRequired = this.calculateRookieMinimum(draftRound, salaryCap);
    } else {
      const tier = this.determinePlayerTier(
        player.overall,
        player.yearsExp,
        player.position
      );
      minimumRequired = this.calculateMinimumContract(
        tier,
        player.age,
        player.position,
        salaryCap
      );
    }

    const currentValue = this.calculateContractValue(contract);
    const isValid = currentValue >= minimumRequired;

    let message = '';
    if (!isValid) {
      if (isRookie) {
        message = `Rookie contract must be at least $${(
          minimumRequired / 1000000
        ).toFixed(1)}M (Round ${draftRound} minimum)`;
      } else {
        const tier = this.determinePlayerTier(
          player.overall,
          player.yearsExp,
          player.position
        );
        message = `${tier.charAt(0).toUpperCase() + tier.slice(1)} ${
          player.position
        } age ${player.age} minimum: $${(minimumRequired / 1000000).toFixed(
          1
        )}M`;
      }
    }

    return { isValid, minimumRequired, currentValue, message };
  }

  /**
   * Calculate total contract value
   */
  private static calculateContractValue(contract: Contract): number {
    const baseSalaryTotal = Object.values(contract.baseSalary).reduce(
      (sum, salary) => sum + salary,
      0
    );
    return baseSalaryTotal + contract.signingBonus;
  }
}

export class ContractValidator {
  /**
   * Validate a contract structure
   */
  static validateContract(contract: Contract): string[] {
    const errors: string[] = [];

    if (contract.startYear > contract.endYear) {
      errors.push('Start year must be before or equal to end year');
    }

    if (contract.endYear - contract.startYear + 1 > 7) {
      errors.push('Contract cannot exceed 7 years');
    }

    if (contract.signingBonus < 0) {
      errors.push('Signing bonus cannot be negative');
    }

    // Validate base salary for each year
    for (let year = contract.startYear; year <= contract.endYear; year++) {
      const salary = contract.baseSalary[year];
      if (salary === undefined || salary < 0) {
        errors.push(`Invalid base salary for year ${year}`);
      }
    }

    // Validate guarantees
    contract.guarantees.forEach((guarantee, index) => {
      if (guarantee.amount < 0) {
        errors.push(`Guarantee ${index + 1} amount cannot be negative`);
      }
      if (
        guarantee.year < contract.startYear ||
        guarantee.year > contract.endYear
      ) {
        errors.push(
          `Guarantee ${index + 1} year must be within contract period`
        );
      }
    });

    return errors;
  }

  /**
   * Check if a contract is valid for a rookie
   */
  static isRookieContract(contract: Contract): boolean {
    return contract.endYear - contract.startYear + 1 === 4;
  }
}

export class RosterValidator {
  /**
   * Validate roster composition
   */
  static validateRoster(roster: any[], maxPlayers: number = 53): string[] {
    const errors: string[] = [];

    if (roster.length > maxPlayers) {
      errors.push(`Roster cannot exceed ${maxPlayers} players`);
    }

    // Add more roster validation logic here
    return errors;
  }

  /**
   * Check if a position is valid
   */
  static isValidPosition(position: string): position is Position {
    return ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(position);
  }
}

export class TradeValidator {
  /**
   * Validate trade structure
   */
  static validateTrade(trade: any): string[] {
    const errors: string[] = [];

    if (!trade.proposerAssets || !trade.responderAssets) {
      errors.push('Trade must have assets for both teams');
    }

    if (
      trade.proposerAssets.length === 0 &&
      trade.responderAssets.length === 0
    ) {
      errors.push('Trade must include at least one asset');
    }

    return errors;
  }

  /**
   * Calculate cap impact of a trade
   */
  static calculateTradeCapImpact(trade: any, contracts: Contract[]): any[] {
    // Implementation for calculating cap impacts of trades
    return [];
  }
}

export class PlayerRatingCalculator {
  /**
   * Calculate overall rating from available player data
   * Uses fantasy performance, age, experience, and position factors
   */
  static calculatePlayerOVR(player: any): number {
    // Base rating from search rank (inverted - lower rank = higher rating)
    const baseRating = Math.max(50, 100 - (player.search_rank || 100));

    // Age modifier (prime years 24-28 get boost)
    const ageModifier = this.getAgeModifier(player.age);

    // Experience modifier (rookies get slight penalty, vets get slight boost)
    const experienceModifier = this.getExperienceModifier(player.years_exp);

    // Position-specific adjustments
    const positionModifier = this.getPositionModifier(player.position);

    // Calculate final OVR
    const ovr = Math.round(
      baseRating * ageModifier * experienceModifier * positionModifier
    );

    // Clamp to 50-99 range (no perfect 100s)
    return Math.max(50, Math.min(99, ovr));
  }

  private static getAgeModifier(age: number): number {
    if (age < 22) return 0.85; // Too young
    if (age <= 24) return 0.9; // Young
    if (age <= 28) return 1.05; // Prime years
    if (age <= 32) return 1.0; // Veteran
    if (age <= 35) return 0.9; // Aging
    return 0.8; // Old
  }

  private static getExperienceModifier(yearsExp: number): number {
    if (yearsExp === 0) return 0.95; // Rookie penalty
    if (yearsExp <= 2) return 0.98; // Young player
    if (yearsExp <= 4) return 1.02; // Experienced
    if (yearsExp <= 6) return 1.0; // Veteran
    if (yearsExp <= 8) return 0.98; // Aging veteran
    return 0.95; // Old veteran
  }

  private static getPositionModifier(position: string): number {
    switch (position) {
      case 'QB':
        return 1.05; // QBs are valuable
      case 'RB':
        return 0.98; // RBs age quickly
      case 'WR':
        return 1.0; // Standard
      case 'TE':
        return 0.95; // TEs slightly less valuable
      case 'K':
        return 0.9; // Kickers less valuable
      case 'DEF':
        return 0.95; // Defense units
      default:
        return 1.0;
    }
  }
}

export class PlayerPersonalityGenerator {
  /**
   * Generate deterministic personality profile based on player attributes
   * Uses player ID as seed for consistent generation
   */
  static generatePersonality(player: any): PlayerPersonality {
    // Use player ID as seed for deterministic generation
    const seed = this.hashString(player.player_id || player.id || 'unknown');

    return {
      riskTolerance: this.generateValue(seed, 'risk', 0.2, 0.8),
      securityPref: this.generateValue(seed, 'security', 0.3, 0.9),
      agentQuality: this.generateValue(seed, 'agent', 0.4, 0.9),
      loyalty: this.generateValue(seed, 'loyalty', 0.1, 0.8),
      moneyVsRole: this.generateValue(seed, 'money', 0.3, 0.9),
      teamPriorities: this.generateTeamPriorities(seed, player),
      marketSavvy: this.generateValue(seed, 'market', 0.3, 0.8),
    };
  }

  private static generateValue(
    seed: number,
    key: string,
    min: number,
    max: number
  ): number {
    const combinedSeed = seed + key.charCodeAt(0) + key.charCodeAt(1);
    const random = this.pseudoRandom(combinedSeed);
    return min + random * (max - min);
  }

  private static generateTeamPriorities(
    seed: number,
    player: any
  ): TeamPriority[] {
    const priorities: TeamPriority[] = [];

    // Role preference
    if (
      this.pseudoRandom(seed + 'role'.charCodeAt(0) + 'role'.charCodeAt(1)) >
      0.5
    ) {
      priorities.push({
        type: 'role',
        value: 'starter',
        weight: 0.8,
      });
    }

    // Contender preference
    if (
      this.pseudoRandom(
        seed + 'contender'.charCodeAt(0) + 'contender'.charCodeAt(1)
      ) > 0.6
    ) {
      priorities.push({
        type: 'contender',
        value: 'playoff_team',
        weight: 0.7,
      });
    }

    // Location preference (hometown discount)
    if (
      this.pseudoRandom(
        seed + 'location'.charCodeAt(0) + 'location'.charCodeAt(1)
      ) > 0.7
    ) {
      priorities.push({
        type: 'location',
        value: 'hometown',
        weight: 0.6,
      });
    }

    return priorities;
  }

  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private static pseudoRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
}

export interface PlayerPersonality {
  riskTolerance: number; // 0-1 (low = guarantee lover)
  securityPref: number; // 0-1 (high = long-term guy)
  agentQuality: number; // 0-1 (high = tough negotiator)
  loyalty: number; // 0-1 (hometown discount factor)
  moneyVsRole: number; // 0-1 (money vs playing time)
  teamPriorities: TeamPriority[];
  marketSavvy: number; // 0-1 (market awareness)
}

export interface TeamPriority {
  type: 'role' | 'contender' | 'location' | 'scheme';
  value: string;
  weight: number;
}

// ============================================================================
// NEGOTIATION SYSTEM TYPES & INTERFACES
// ============================================================================

export interface Offer {
  aav: number; // Average annual value
  gtdPct: number; // Guaranteed percentage (0-1)
  years: number; // Contract length
  bonusPct?: number; // Signing bonus percentage
  role?: string; // Playing time commitment
  noTradeClause?: boolean; // No-trade clause
}

export interface CounterOffer extends Offer {
  message: string; // Agent's response message
  accept?: boolean; // Whether this is an acceptance
}

export interface NegotiationSession {
  id: string;
  playerId: string;
  teamId: string;
  round: number;
  reservation: {
    aav: number; // Player's minimum acceptable AAV
    gtdPct: number; // Player's minimum guaranteed percentage
    years: number; // Player's preferred contract length
  };
  patience: number; // Remaining negotiation rounds
  askAnchor: {
    // Player's opening ask (higher than reservation)
    aav: number;
    gtdPct: number;
    years: number;
  };
  history: Array<{
    type: 'offer' | 'counter' | 'accept' | 'decline';
    offer: Offer;
    timestamp: number;
    message?: string;
  }>;
  status: 'active' | 'accepted' | 'declined' | 'expired';
  marketContext: MarketContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketContext {
  competingOffers: number; // How many teams are interested
  positionalDemand: number; // Market demand for this position (0-1)
  capSpaceAvailable: number; // Total cap space across interested teams
  recentComps: Contract[]; // Similar contracts signed recently
  seasonStage: 'EarlyFA' | 'MidFA' | 'Camp' | 'MidSeason';
  teamReputation: number; // Team's negotiation reputation (-1 to 1)
  currentWeek: number; // Added for FAWeekManager
  // League roster information for realistic market saturation
  leagueRosterInfo?: {
    teamCount: number;
    positionRequirements: Record<string, number>;
    maxPlayers: number;
    allowIR: boolean;
    maxIR: number;
  };
}

export interface NegotiationResult {
  accepted: boolean;
  counter?: CounterOffer;
  message: string;
  session: NegotiationSession;
  utility: number; // Player's utility score for the offer
  marketPressure: number; // Market pressure modifier
}

// ============================================================================
// NEGOTIATION ENGINE CORE
// ============================================================================

export class NegotiationEngine {
  /**
   * Evaluate an offer and determine if it's accepted, rejected, or countered
   */
  static evaluateOffer(
    offer: Offer,
    session: NegotiationSession,
    player: any
  ): NegotiationResult {
    // Calculate player utility for this offer
    const utility = this.calculatePlayerUtility(offer, player, session);

    // Apply market pressure
    const marketPressure = this.calculateMarketPressure(session.marketContext);
    const adjustedUtility = utility + marketPressure;

    // Determine if offer is accepted
    const threshold = this.getAcceptanceThreshold(session, player);
    const accepted = adjustedUtility >= threshold;

    // Generate counter if not accepted
    let counter: CounterOffer | undefined;
    let message: string;

    if (accepted) {
      message = this.generateAcceptanceMessage(player, offer);
    } else {
      // Check if this is a lowball offer
      const isLowball = this.isLowballOffer(offer, session);

      if (isLowball) {
        // Increase reservation value and reduce patience
        this.adjustReservationForLowball(session);
        message = this.generateLowballResponse(player, offer);
      } else {
        // Generate intelligent counter
        counter = this.generateCounter(offer, session, player);
        message = counter.message;
      }
    }

    // Update session
    this.updateSession(session, offer, accepted, counter);

    return {
      accepted,
      counter,
      message,
      session,
      utility,
      marketPressure,
    };
  }

  /**
   * Calculate player utility for an offer based on personality
   */
  private static calculatePlayerUtility(
    offer: Offer,
    player: any,
    session: NegotiationSession
  ): number {
    const personality = PlayerPersonalityGenerator.generatePersonality(player);

    // Base utility from reservation value (0-1 scale)
    const aavUtility = Math.min(1, offer.aav / session.reservation.aav);
    const gtdUtility = Math.min(1, offer.gtdPct / session.reservation.gtdPct);
    const yearsUtility = Math.min(1, offer.years / session.reservation.years);

    // Weighted by personality preferences
    const utility =
      personality.moneyVsRole * aavUtility +
      (1 - personality.riskTolerance) * gtdUtility +
      personality.securityPref * yearsUtility;

    // Apply agent quality modifier (higher quality = tougher negotiator)
    const agentModifier = 0.8 + personality.agentQuality * 0.4;

    return utility * agentModifier;
  }

  /**
   * Calculate market pressure based on context
   */
  private static calculateMarketPressure(context: MarketContext): number {
    let pressure = 0;

    // More competing offers = higher pressure to accept
    pressure += context.competingOffers * 0.1;

    // Higher positional demand = higher pressure
    pressure += context.positionalDemand * 0.2;

    // More cap space available = higher pressure
    pressure += Math.min(0.3, context.capSpaceAvailable / 100000000);

    // Season stage affects urgency
    switch (context.seasonStage) {
      case 'EarlyFA':
        pressure += 0.1;
        break;
      case 'MidFA':
        pressure += 0.2;
        break;
      case 'Camp':
        pressure += 0.3;
        break;
      case 'MidSeason':
        pressure += 0.4;
        break;
    }

    return Math.min(0.5, pressure); // Cap at 0.5
  }

  /**
   * Get acceptance threshold based on session state and player
   */
  private static getAcceptanceThreshold(
    session: NegotiationSession,
    player: any
  ): number {
    const personality = PlayerPersonalityGenerator.generatePersonality(player);

    // Base threshold
    let threshold = 0.95;

    // Lower patience = lower threshold (more desperate)
    threshold -= (5 - session.patience) * 0.05;

    // Higher agent quality = higher threshold (tougher negotiator)
    threshold += personality.agentQuality * 0.1;

    // Market pressure can lower threshold
    if (session.marketContext.competingOffers === 0) {
      threshold -= 0.1; // No competition = easier to accept
    }

    return Math.max(0.8, Math.min(1.1, threshold));
  }

  /**
   * Check if an offer is considered a lowball
   */
  private static isLowballOffer(
    offer: Offer,
    session: NegotiationSession
  ): boolean {
    const aavRatio = offer.aav / session.reservation.aav;
    const gtdRatio = offer.gtdPct / session.reservation.gtdPct;

    return aavRatio < 0.85 || gtdRatio < 0.8;
  }

  /**
   * Adjust reservation value for lowball offers
   */
  private static adjustReservationForLowball(
    session: NegotiationSession
  ): void {
    // Increase reservation by 5-10%
    session.reservation.aav = Math.round(session.reservation.aav * 1.06);
    session.reservation.gtdPct = Math.min(
      0.95,
      session.reservation.gtdPct * 1.05
    );

    // Reduce patience
    session.patience = Math.max(1, session.patience - 1);
  }

  /**
   * Generate intelligent counter-offer
   */
  private static generateCounter(
    offer: Offer,
    session: NegotiationSession,
    player: any
  ): CounterOffer {
    const personality = PlayerPersonalityGenerator.generatePersonality(player);

    // Calculate gaps from reservation
    const gaps = {
      aav: Math.max(0, session.reservation.aav - offer.aav),
      gtd: Math.max(0, session.reservation.gtdPct - offer.gtdPct),
      years: Math.max(0, session.reservation.years - offer.years),
    };

    // Find biggest gap to target first
    const biggestGap = Object.entries(gaps).reduce((a, b) =>
      a[1] > b[1] ? a : b
    );

    // Generate counter with strategic adjustments
    const counter: CounterOffer = {
      aav: offer.aav + Math.round(gaps.aav * 0.75),
      gtdPct: offer.gtdPct + gaps.gtd * 0.85,
      years: offer.years + Math.ceil(gaps.years * 0.5),
      message: this.generateCounterMessage(
        biggestGap[0],
        biggestGap[1],
        personality
      ),
    };

    return counter;
  }

  /**
   * Generate appropriate counter message based on personality
   */
  private static generateCounterMessage(
    gapType: string,
    gapValue: number,
    personality: PlayerPersonality
  ): string {
    const messages = {
      aav: [
        'We need to see more money on the table. My client deserves market value.',
        "The AAV is below what we're seeing for similar players. Let's bridge this gap.",
        "We're looking for a stronger financial commitment. Can you improve the annual value?",
      ],
      gtd: [
        "The guarantees aren't strong enough. My client needs security.",
        'We need stronger guarantees to protect against injury and roster changes.',
        "The guaranteed money is too low. Let's make this deal more secure.",
      ],
      years: [
        "The contract length doesn't provide the stability my client is looking for.",
        'We need a longer commitment to justify the investment.',
        "The years don't match our long-term vision. Can we extend the term?",
      ],
    };

    // Select message based on personality
    const messagePool =
      messages[gapType as keyof typeof messages] || messages.aav;
    const messageIndex = Math.floor(
      personality.agentQuality * messagePool.length
    );

    return messagePool[Math.min(messageIndex, messagePool.length - 1)];
  }

  /**
   * Generate acceptance message
   */
  private static generateAcceptanceMessage(player: any, offer: Offer): string {
    const personality = PlayerPersonalityGenerator.generatePersonality(player);

    if (personality.loyalty > 0.7) {
      return 'My client is excited to join your organization. We have a deal!';
    } else if (personality.moneyVsRole > 0.6) {
      return "The financial terms work for us. We're ready to sign.";
    } else {
      return "This offer meets our requirements. Let's get this done.";
    }
  }

  /**
   * Generate lowball response message
   */
  private static generateLowballResponse(player: any, offer: Offer): string {
    const personality = PlayerPersonalityGenerator.generatePersonality(player);

    if (personality.agentQuality > 0.7) {
      return "That offer is disrespectful. We're raising our ask significantly.";
    } else {
      return "That's too low. We need to see a much better offer to continue talks.";
    }
  }

  /**
   * Update negotiation session with new information
   */
  private static updateSession(
    session: NegotiationSession,
    offer: Offer,
    accepted: boolean,
    counter?: CounterOffer
  ): void {
    // Add to history
    session.history.push({
      type: 'offer',
      offer,
      timestamp: Date.now(),
    });

    if (counter) {
      session.history.push({
        type: 'counter',
        offer: counter,
        timestamp: Date.now(),
        message: counter.message,
      });
    }

    // Update status
    if (accepted) {
      session.status = 'accepted';
    } else {
      session.round += 1;
      session.patience = Math.max(0, session.patience - 1);

      if (session.patience <= 0) {
        session.status = 'expired';
      }
    }

    session.updatedAt = new Date();
  }

  /**
   * Create a new negotiation session
   */
  static createSession(
    playerId: string,
    teamId: string,
    player: any,
    marketContext: MarketContext,
    leagueRules?: { maxYears?: number }
  ): NegotiationSession {
    const personality = PlayerPersonalityGenerator.generatePersonality(player);
    const expectedValue =
      PlayerRatingCalculator.calculatePlayerOVR(player) * 100000;

    // Get max years from league rules, default to 5 if not specified
    const maxYears = leagueRules?.maxYears || 5;

    // Calculate reservation value (minimum acceptable)
    const reservation = {
      aav: Math.round(expectedValue * (0.9 + personality.riskTolerance * 0.1)),
      gtdPct: 0.5 + (1 - personality.riskTolerance) * 0.3,
      years: Math.max(
        1,
        Math.min(maxYears, Math.round(2 + personality.securityPref * 3))
      ),
    };

    // Calculate ask anchor (opening position)
    const askAnchor = {
      aav: Math.round(reservation.aav * (1.1 + personality.agentQuality * 0.1)),
      gtdPct: Math.min(
        0.95,
        reservation.gtdPct * (1.05 + personality.agentQuality * 0.1)
      ),
      years: Math.min(
        maxYears,
        reservation.years + Math.ceil(personality.securityPref * 2)
      ),
    };

    return {
      id: `neg_${playerId}_${teamId}_${Date.now()}`,
      playerId,
      teamId,
      round: 1,
      reservation,
      patience: 4 + Math.floor(personality.agentQuality * 2), // 4-6 rounds
      askAnchor,
      history: [],
      status: 'active',
      marketContext,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

// ===== FREE AGENCY WEEK SYSTEM =====

export class FAWeekManager {
  /**
   * Create a new FA week for a league
   */
  static createFAWeek(
    leagueId: string,
    weekNumber: number,
    settings: FAWeekSettings
  ): FAWeek {
    const now = new Date();
    const weekDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    return {
      id: `${leagueId}_week_${weekNumber}`,
      leagueId,
      weekNumber,
      phase: weekNumber <= 4 ? 'FA_WEEK' : 'OPEN_FA',
      startDate: now,
      endDate: new Date(now.getTime() + weekDuration),
      status: 'active',
      readyTeams: [],
      evaluationResults: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Check if a team can submit more bids
   */
  static canSubmitBid(
    teamId: string,
    currentBids: FABid[],
    settings: FAWeekSettings
  ): boolean {
    const activeBids = currentBids.filter(
      (bid) => bid.teamId === teamId && bid.status === 'pending'
    );
    return activeBids.length < settings.maxConcurrentOffers;
  }

  /**
   * Calculate cap hold for a pending bid
   */
  static calculateCapHold(bid: FABid, salaryCap: number): number {
    const contract = bid.offer;
    const totalValue = contract.totalValue;
    const years = Object.keys(contract.baseSalary).length;

    // Cap hold is the first year's cap hit
    const firstYearKey = Object.keys(contract.baseSalary)[0];
    const firstYearSalary = firstYearKey
      ? contract.baseSalary[parseInt(firstYearKey)] || 0
      : 0;
    const proratedBonus = contract.signingBonus / Math.min(years, 5);

    return firstYearSalary + proratedBonus;
  }

  /**
   * Process FA week evaluation for all players
   */
  static processFAWeekEvaluation(
    bids: FABid[],
    players: Player[],
    marketContext: MarketContext,
    settings: FAWeekSettings
  ): FAEvaluationResult[] {
    const results: FAEvaluationResult[] = [];

    // Group bids by player
    const bidsByPlayer = this.groupBidsByPlayer(bids);

    for (const [playerId, playerBids] of Object.entries(bidsByPlayer)) {
      const player = players.find((p) => p.id === playerId);
      if (!player) continue;

      const decision = this.evaluatePlayerBids(
        player,
        playerBids,
        marketContext,
        settings
      );

      const marketImpact = this.calculateMarketImpact(
        player,
        decision,
        marketContext
      );

      results.push({
        playerId,
        decisions: [decision],
        marketImpact,
        processedAt: new Date(),
      });
    }

    return results;
  }

  /**
   * Calculate week-based acceptance threshold adjustment
   * Players become less picky as free agency weeks progress
   */
  private static calculateWeekBasedAcceptanceThreshold(
    currentWeek: number,
    player: Player,
    baseThreshold: number = 0.7
  ): number {
    // Week 1-2: Players are picky (maintain base threshold)
    if (currentWeek <= 2) {
      return baseThreshold;
    }

    // Week 3-4: Players getting less picky (10% reduction)
    if (currentWeek <= 4) {
      return baseThreshold * 0.9; // 63% threshold
    }

    // Week 5+: Players are desperate (30% reduction)
    if (currentWeek <= 6) {
      return baseThreshold * 0.7; // 49% threshold
    }

    // Week 7+: Players are very desperate (50% reduction)
    return baseThreshold * 0.5; // 35% threshold
  }

  /**
   * Calculate week-based desperation multiplier for scoring
   * This affects how players evaluate offers in later weeks
   */
  private static calculateWeekBasedDesperationMultiplier(
    currentWeek: number,
    player: Player
  ): number {
    // Week 1-2: Normal evaluation
    if (currentWeek <= 2) {
      return 1.0;
    }

    // Week 3-4: Slight desperation (5% boost to offers)
    if (currentWeek <= 4) {
      return 1.05;
    }

    // Week 5+: Moderate desperation (15% boost to offers)
    if (currentWeek <= 6) {
      return 1.15;
    }

    // Week 7+: High desperation (25% boost to offers)
    return 1.25;
  }

  /**
   * Evaluate bids for a specific player
   */
  private static evaluatePlayerBids(
    player: Player,
    bids: FABid[],
    marketContext: MarketContext,
    settings: FAWeekSettings
  ): PlayerDecision {
    // Sort bids by player preference (using existing negotiation logic)
    const scoredBids = bids
      .map((bid) => ({
        bid,
        score: this.scoreBidForPlayer(bid, player, marketContext),
      }))
      .sort((a, b) => b.score - a.score);

    const acceptedBid = scoredBids[0];
    const shortlistedBids = scoredBids.slice(1, settings.shortlistSize + 1);
    const rejectedBids = scoredBids.slice(settings.shortlistSize + 1);

    // Calculate week-based acceptance threshold
    const baseThreshold = 0.7; // 70% base threshold
    const weekAdjustedThreshold = this.calculateWeekBasedAcceptanceThreshold(
      marketContext.currentWeek,
      player,
      baseThreshold
    );

    // Determine if best offer is acceptable based on week-adjusted threshold
    const isAcceptable = acceptedBid.score >= weekAdjustedThreshold;

    if (isAcceptable) {
      return {
        playerId: player.id,
        acceptedBidId: acceptedBid.bid.id,
        shortlistedBidIds: shortlistedBids.map((b) => b.bid.id),
        rejectedBidIds: rejectedBids.map((b) => b.bid.id),
        feedback: this.generateAcceptanceFeedback(acceptedBid.bid),
        trustImpact: this.calculateTrustImpact(acceptedBid.bid, true),
        // Enhanced decision details
        decisionReason: 'accepted',
        startingPositionProspects: this.analyzeStartingPositionProspects(
          player,
          acceptedBid.bid,
          marketContext
        ),
        contractAnalysis: this.createContractAnalysis(
          acceptedBid.bid,
          player,
          marketContext
        ),
        marketFactors: this.createMarketFactors(player, marketContext),
        playerNotes: this.generatePlayerNotes(
          acceptedBid.bid,
          player,
          'accepted'
        ),
        agentNotes: this.generateAgentNotes(
          acceptedBid.bid,
          player,
          'accepted'
        ),
      };
    } else {
      // Even when not acceptable, we need to account for ALL bids
      // The highest scoring bid becomes the "primary consideration" (shortlisted)
      // All other bids are either shortlisted or rejected based on settings
      const primaryBid = acceptedBid; // This is the best offer, even if not acceptable
      const remainingBids = scoredBids.slice(1);
      const additionalShortlistedBids = remainingBids.slice(
        0,
        settings.shortlistSize
      );
      const rejectedBids = remainingBids.slice(settings.shortlistSize);

      return {
        playerId: player.id,
        acceptedBidId: undefined,
        shortlistedBidIds: [
          primaryBid.bid.id,
          ...additionalShortlistedBids.map((b) => b.bid.id),
        ],
        rejectedBidIds: rejectedBids.map((b) => b.bid.id),
        feedback: this.generateShortlistFeedback(
          [primaryBid, ...additionalShortlistedBids],
          rejectedBids
        ),
        trustImpact:
          rejectedBids.length > 0
            ? this.calculateTrustImpact(rejectedBids[0].bid, false)
            : {},
        // Enhanced decision details
        decisionReason: 'shortlisted',
        startingPositionProspects: this.analyzeStartingPositionProspects(
          player,
          primaryBid.bid,
          marketContext
        ),
        contractAnalysis: this.createContractAnalysis(
          primaryBid.bid,
          player,
          marketContext
        ),
        marketFactors: this.createMarketFactors(player, marketContext),
        playerNotes: this.generatePlayerNotes(
          primaryBid.bid,
          player,
          'shortlisted'
        ),
        agentNotes: this.generateAgentNotes(
          primaryBid.bid,
          player,
          'shortlisted'
        ),
      };
    }
  }

  /**
   * Score a bid based on player preferences and market context
   */
  private static scoreBidForPlayer(
    bid: FABid,
    player: Player,
    marketContext: MarketContext
  ): number {
    const contract = bid.offer;

    // Base score from contract terms
    let score = 0;

    // AAV score (0-1) - 30% weight (reduced from 40%)
    const expectedAAV = this.calculateExpectedAAV(player, marketContext);
    const aavScore = Math.min(1, contract.apy / expectedAAV);
    score += aavScore * 0.3;

    // Signing bonus score (0-1) - 25% weight (increased from 0%)
    const expectedBonus = expectedAAV * 0.2; // Expected 20% signing bonus
    const bonusScore =
      contract.signingBonus > 0
        ? Math.min(1, contract.signingBonus / expectedBonus)
        : 0.3; // Penalty for no signing bonus
    score += bonusScore * 0.25;

    // Guarantee score (0-1) - 20% weight (reduced from 30%)
    const guaranteeScore = Math.min(1, contract.guarantees.length / 2);
    score += guaranteeScore * 0.2;

    // Length preference (0-1) - 15% weight (reduced from 20%)
    const lengthScore = this.calculateLengthScore(contract, player);
    score += lengthScore * 0.15;

    // Team factors (0-1) - 10% weight (unchanged)
    const teamScore = this.calculateTeamScore(bid.teamId, marketContext);
    score += teamScore * 0.1;

    // Apply week-based desperation multiplier
    const desperationMultiplier = this.calculateWeekBasedDesperationMultiplier(
      marketContext.currentWeek,
      player
    );

    // Boost the score based on desperation (makes offers more attractive in later weeks)
    score *= desperationMultiplier;

    return score;
  }

  /**
   * Calculate expected AAV for a player based on market context
   */
  static calculateExpectedAAV(
    player: Player,
    marketContext: MarketContext
  ): number {
    // Base from player overall and position
    let baseAAV = player.overall * 100000; // $100k per overall point

    // Calculate realistic positional demand based on league roster settings
    const positionalDemand = this.calculateLeagueAwarePositionalDemand(
      player.position,
      marketContext
    );

    // Adjust for market conditions based on realistic demand
    if (positionalDemand > 0.7) {
      baseAAV *= 1.2; // High demand = 20% premium
    } else if (positionalDemand < 0.3) {
      baseAAV *= 0.8; // Low demand = 20% discount
    }

    // Adjust for season stage
    if (marketContext.seasonStage === 'EarlyFA') {
      baseAAV *= 1.1; // Early FA premium
    }

    return baseAAV;
  }

  /**
   * Calculate realistic positional demand based on league roster settings
   * This makes the market behavior realistic for fantasy football leagues
   */
  private static calculateLeagueAwarePositionalDemand(
    position: string,
    marketContext: MarketContext
  ): number {
    // If no league roster info, fall back to basic position demand
    if (!marketContext.leagueRosterInfo) {
      return this.calculateBasicPositionalDemand(position);
    }

    const { teamCount, positionRequirements, maxPlayers } =
      marketContext.leagueRosterInfo;

    // Calculate total starting spots needed for this position
    const startersNeeded = teamCount * (positionRequirements[position] || 0);

    // Calculate total roster spots available
    const totalRosterSpots = teamCount * maxPlayers;

    // Calculate how saturated this position is
    const positionSaturation = startersNeeded / totalRosterSpots;

    // Convert saturation to demand (inverse relationship)
    // More saturation = lower demand = lower prices
    let demand = 1 - positionSaturation;

    // Apply position-specific adjustments for fantasy football reality
    switch (position) {
      case 'QB':
        // QB demand varies dramatically by league settings
        if (startersNeeded >= 24) {
          demand = 0.9; // 2QB league - very scarce
        } else if (startersNeeded >= 18) {
          demand = 0.7; // Superflex league - scarce
        } else {
          demand = 0.3; // 1QB league - saturated
        }
        break;

      case 'WR':
        // WR is almost always saturated in fantasy
        demand = Math.min(demand, 0.4); // Cap at 40% demand
        break;

      case 'RB':
        // RB demand depends on roster size and scoring
        if (startersNeeded >= 48) {
          demand = 0.6; // Large rosters = moderate demand
        } else {
          demand = 0.4; // Standard rosters = saturated
        }
        break;

      case 'TE':
        // TE demand is usually moderate
        demand = Math.max(demand, 0.5); // Minimum 50% demand
        break;

      case 'K':
      case 'DEF':
        // K and DEF are always saturated
        demand = 0.2;
        break;

      default:
        // Other positions (DL, LB, DB) - moderate demand
        demand = Math.max(demand, 0.4);
    }

    // Ensure demand is within bounds
    return Math.max(0.1, Math.min(1.0, demand));
  }

  /**
   * Fallback method for basic positional demand (when league info unavailable)
   */
  private static calculateBasicPositionalDemand(position: string): number {
    // Basic position demand (will be replaced by league-aware calculation)
    const demandMap: Record<string, number> = {
      QB: 0.6, // Moderate demand (assumes 1QB league)
      RB: 0.5, // Moderate demand
      WR: 0.4, // Saturated
      TE: 0.6, // Moderate demand
      K: 0.2, // Very saturated
      DEF: 0.3, // Saturated
    };

    return demandMap[position] || 0.5;
  }

  /**
   * Calculate length preference score for a player
   */
  private static calculateLengthScore(
    contract: ContractOffer,
    player: Player
  ): number {
    const years = Object.keys(contract.baseSalary).length;

    // Younger players prefer longer deals, older players prefer shorter
    if (player.age < 26) {
      return years >= 3 ? 1 : years >= 2 ? 0.7 : 0.3;
    } else if (player.age < 30) {
      return years >= 2 ? 1 : years >= 1 ? 0.8 : 0.4;
    } else {
      return years === 1 ? 1 : years === 2 ? 0.6 : 0.2;
    }
  }

  /**
   * Calculate team-specific score factors
   */
  private static calculateTeamScore(
    teamId: string,
    marketContext: MarketContext
  ): number {
    // For now, return neutral score
    // This can be enhanced with team reputation, contender status, etc.
    return 0.5;
  }

  /**
   * Calculate market impact from a player's decision
   */
  private static calculateMarketImpact(
    player: Player,
    decision: PlayerDecision,
    marketContext: MarketContext
  ): MarketImpact {
    if (!decision.acceptedBidId) {
      return {
        position: player.position,
        tier: ContractMinimumCalculator.determinePlayerTier(
          player.overall,
          0,
          player.position
        ),
        benchmarkContract: {} as ContractOffer, // No contract signed
        marketShift: 'stable',
        shiftPercentage: 0,
        affectedPlayers: [],
      };
    }

    // Find the accepted bid - we need to look in the bids array, not recentComps
    // For now, return a default market impact since we don't have access to the bid here
    return {
      position: player.position,
      tier: ContractMinimumCalculator.determinePlayerTier(
        player.overall,
        0,
        player.position
      ),
      benchmarkContract: {} as ContractOffer,
      marketShift: 'stable',
      shiftPercentage: 0,
      affectedPlayers: [],
    };
  }

  /**
   * Calculate trust impact on teams
   */
  private static calculateTrustImpact(
    bid: FABid | undefined,
    wasAccepted: boolean
  ): Record<string, number> {
    if (!bid) {
      return {}; // Return empty object if no bid provided
    }

    if (wasAccepted) {
      return { [bid.teamId]: 0.1 }; // Small positive trust boost
    } else {
      return { [bid.teamId]: -0.2 }; // Trust penalty for low offers
    }
  }

  /**
   * Generate feedback messages for players
   */
  private static generateAcceptanceFeedback(bid: FABid): string {
    return `I'm excited to join the team! The offer meets my expectations and I'm ready to contribute.`;
  }

  private static generateShortlistFeedback(
    shortlisted: Array<{ bid: FABid }>,
    rejected: Array<{ bid: FABid }>
  ): string {
    let feedback = `I'm considering ${shortlisted.length} offers. `;

    if (rejected.length > 0) {
      feedback += `Some offers were below market value and have been declined.`;
    }

    return feedback;
  }

  /**
   * Group bids by player for evaluation
   */
  private static groupBidsByPlayer(bids: FABid[]): Record<string, FABid[]> {
    return bids.reduce((acc, bid) => {
      if (!acc[bid.playerId]) {
        acc[bid.playerId] = [];
      }
      acc[bid.playerId].push(bid);
      return acc;
    }, {} as Record<string, FABid[]>);
  }

  /**
   * Analyze starting position prospects for a player
   */
  private static analyzeStartingPositionProspects(
    player: Player,
    bid: FABid | undefined,
    marketContext: MarketContext
  ): PlayerDecision['startingPositionProspects'] {
    // This would typically analyze team depth charts
    // For now, use simplified logic based on player overall and position
    const isStarter = player.overall >= 75;
    const confidence = Math.min(1, player.overall / 100);
    const competingPlayers = Math.max(
      1,
      Math.floor((100 - player.overall) / 10)
    );

    let teamDepth: 'shallow' | 'moderate' | 'deep';
    if (competingPlayers <= 2) teamDepth = 'shallow';
    else if (competingPlayers <= 4) teamDepth = 'moderate';
    else teamDepth = 'deep';

    const reasoning = isStarter
      ? `Strong starter potential with ${player.overall} overall rating`
      : `Depth player competing with ${competingPlayers} other players`;

    return {
      isStarter,
      confidence,
      competingPlayers,
      teamDepth,
      reasoning,
    };
  }

  /**
   * Create detailed contract analysis
   */
  private static createContractAnalysis(
    bid: FABid | undefined,
    player: Player,
    marketContext: MarketContext
  ): PlayerDecision['contractAnalysis'] {
    if (!bid) {
      // Return default values if no bid provided
      return {
        aavScore: 0,
        signingBonusScore: 0,
        guaranteeScore: 0,
        lengthScore: 0,
        teamScore: 0,
        totalScore: 0,
        threshold: 0.7,
      };
    }

    const contract = bid.offer;
    const expectedAAV = this.calculateExpectedAAV(player, marketContext);

    const aavScore = Math.min(1, contract.apy / expectedAAV);
    const expectedBonus = expectedAAV * 0.2;
    const signingBonusScore =
      contract.signingBonus > 0
        ? Math.min(1, contract.signingBonus / expectedBonus)
        : 0.3;
    const guaranteeScore = Math.min(1, contract.guarantees.length / 2);
    const lengthScore = this.calculateLengthScore(contract, player);
    const teamScore = this.calculateTeamScore(bid.teamId, marketContext);

    const totalScore =
      aavScore * 0.3 +
      signingBonusScore * 0.25 +
      guaranteeScore * 0.2 +
      lengthScore * 0.15 +
      teamScore * 0.1;

    return {
      aavScore,
      signingBonusScore,
      guaranteeScore,
      lengthScore,
      teamScore,
      totalScore,
      threshold: 0.7, // Acceptance threshold
    };
  }

  /**
   * Create market factors analysis
   */
  private static createMarketFactors(
    player: Player,
    marketContext: MarketContext
  ): PlayerDecision['marketFactors'] {
    return {
      competingOffers: 0, // Would be calculated from actual bids
      positionalDemand: marketContext.positionalDemand || 0.5,
      marketPressure: 0.5, // Default neutral pressure
      recentComparables: [], // Would be populated from recent signings
    };
  }

  /**
   * Generate player notes based on decision
   */
  private static generatePlayerNotes(
    bid: FABid | undefined,
    player: Player,
    decision: 'accepted' | 'shortlisted' | 'rejected'
  ): string {
    if (!bid) {
      return 'No offer details available for analysis.';
    }

    const contract = bid.offer;

    switch (decision) {
      case 'accepted':
        return `I'm excited about this opportunity! The ${contract.apy.toLocaleString()} AAV and ${
          contract.signingBonus > 0
            ? `$${(contract.signingBonus / 1000000).toFixed(1)}M signing bonus`
            : 'guaranteed money'
        } show this team values my contribution.`;
      case 'shortlisted':
        return `This is a solid offer that I'm considering. The terms are reasonable, but I want to see what other opportunities might be available.`;
      case 'rejected':
        return `While I appreciate the interest, this offer doesn't meet my expectations for a player of my caliber. I'm looking for better terms.`;
      default:
        return 'I need more time to evaluate this offer.';
    }
  }

  /**
   * Generate agent notes based on decision
   */
  private static generateAgentNotes(
    bid: FABid | undefined,
    player: Player,
    decision: 'accepted' | 'shortlisted' | 'rejected'
  ): string {
    if (!bid) {
      return 'Unable to provide agent analysis without offer details.';
    }

    const contract = bid.offer;
    const expectedAAV = this.calculateExpectedAAV(player, {} as MarketContext);

    switch (decision) {
      case 'accepted':
        return `My client is pleased with this offer. The AAV is ${
          contract.apy >= expectedAAV ? 'at or above' : 'below'
        } market value, and the signing bonus provides good security. We recommend accepting.`;
      case 'shortlisted':
        return `This offer is competitive but not exceptional. We're keeping it active while exploring other opportunities. My client may be willing to negotiate.`;
      case 'rejected':
        return `This offer significantly undervalues my client. The AAV is ${(
          ((expectedAAV - contract.apy) / expectedAAV) *
          100
        ).toFixed(0)}% below market value. We cannot accept these terms.`;
      default:
        return 'We need more time to evaluate this offer against the current market.';
    }
  }
}

export class OpenFAManager {
  /**
   * Calculate auto-priced contract for open FA
   */
  static calculateOpenFAContract(
    player: Player,
    marketContext: MarketContext,
    settings: FAWeekSettings
  ): ContractOffer {
    const baseAAV = FAWeekManager.calculateExpectedAAV(player, marketContext);
    const discountedAAV = baseAAV * (1 - settings.openFADiscount / 100);

    // Create 1-year contract
    const contract: ContractOffer = {
      years: 1,
      baseSalary: { [new Date().getFullYear()]: discountedAAV },
      signingBonus: 0, // No signing bonus for open FA
      guarantees: [], // No guarantees for open FA
      contractType: 'prove_it',
      totalValue: discountedAAV,
      apy: discountedAAV,
    };

    return contract;
  }

  /**
   * Process immediate signing for open FA
   */
  static processOpenFASigning(
    playerId: string,
    teamId: string,
    leagueId: string,
    contract: ContractOffer
  ): OpenFASigning {
    return {
      id: `${leagueId}_openfa_${playerId}_${teamId}`,
      leagueId,
      teamId,
      playerId,
      contract,
      signedAt: new Date(),
      marketPrice: contract.apy,
      discountApplied: 20, // Default 20% discount
    };
  }
}

// ============================================================================
// ENHANCED PLAYER MINIMUM CALCULATOR WITH MARKET RIPPLE EFFECTS
// ============================================================================

export interface LeagueCapContext {
  currentYearCap: number;
  projectedCapGrowth: number; // 5-8% per year
  totalTeamCapSpace: number;
  averageTeamCapSpace: number;
  recentSignings: ContractOffer[]; // Last 10-20 signings
  marketBenchmarks: Record<string, number>; // Position-based market rates
  leagueHealth: 'healthy' | 'struggling' | 'prosperous'; // Overall cap health
}

export interface MarketRippleContext {
  similarPlayerSignings: Array<{
    playerId: string;
    position: string;
    tier: 'elite' | 'starter' | 'depth';
    contractValue: number;
    signedAt: Date;
    marketImpact: 'positive' | 'negative' | 'neutral';
  }>;
  positionMarketTrend: 'rising' | 'falling' | 'stable';
  tierMarketTrend: 'rising' | 'falling' | 'stable';
  recentMarketShifts: Array<{
    position: string;
    tier: string;
    shiftPercentage: number;
    trigger: string; // What caused this shift
  }>;
}

export class EnhancedPlayerMinimumCalculator {
  /**
   * Calculate enhanced player minimum considering market ripple effects and league cap health
   */
  static calculateEnhancedMinimum(
    player: any, // Use any to match existing pattern and access Sleeper properties
    leagueContext: LeagueCapContext,
    marketRipple: MarketRippleContext
  ): number {
    // Start with base minimum from existing calculator
    const baseMinimum = this.calculateBaseMinimum(
      player,
      leagueContext.currentYearCap
    );

    // Apply market ripple adjustments
    const marketAdjustment = this.calculateMarketRippleAdjustment(
      player,
      marketRipple
    );

    // Apply league cap health adjustments
    const capHealthAdjustment =
      this.calculateCapHealthAdjustment(leagueContext);

    // Apply position-specific market trends
    const positionTrendAdjustment = this.calculatePositionTrendAdjustment(
      player.position,
      marketRipple.positionMarketTrend
    );

    // Calculate final minimum with safeguards
    const enhancedMinimum = Math.max(
      baseMinimum,
      baseMinimum * marketAdjustment,
      baseMinimum * capHealthAdjustment,
      baseMinimum * positionTrendAdjustment
    );

    // Apply minimum floor based on league cap health
    const minimumFloor = this.calculateMinimumFloor(player, leagueContext);

    return Math.max(enhancedMinimum, minimumFloor);
  }

  /**
   * Calculate base minimum using existing ContractMinimumCalculator
   */
  private static calculateBaseMinimum(player: any, salaryCap: number): number {
    const tier = ContractMinimumCalculator.determinePlayerTier(
      player.overall,
      player.years_exp || 0, // Use years_exp to match existing pattern
      player.position
    );

    return ContractMinimumCalculator.calculateMinimumContract(
      tier,
      player.age,
      player.position,
      salaryCap
    );
  }

  /**
   * Calculate market ripple adjustment based on recent similar signings
   */
  private static calculateMarketRippleAdjustment(
    player: any,
    marketRipple: MarketRippleContext
  ): number {
    const playerTier = ContractMinimumCalculator.determinePlayerTier(
      player.overall,
      player.years_exp || 0, // Use years_exp to match existing pattern
      player.position
    );

    // Find similar player signings (same position and tier)
    const similarSignings = marketRipple.similarPlayerSignings.filter(
      (signing) =>
        signing.position === player.position && signing.tier === playerTier
    );

    if (similarSignings.length === 0) {
      return 1.0; // No market data, no adjustment
    }

    // Calculate average contract value for similar players
    const averageValue =
      similarSignings.reduce((sum, signing) => sum + signing.contractValue, 0) /
      similarSignings.length;

    // Calculate what this player's base value should be
    const baseValue = player.overall * 100000; // $100k per overall point

    // If similar players are undervalued, adjust expectations up
    if (averageValue < baseValue * 0.8) {
      // Market is undervaluing this tier/position - apply upward pressure
      return 1.2; // 20% increase to prevent market collapse
    }

    // If similar players are overvalued, slight downward adjustment
    if (averageValue > baseValue * 1.2) {
      return 0.95; // 5% decrease to prevent inflation
    }

    return 1.0; // Market is stable
  }

  /**
   * Calculate cap health adjustment based on league financial situation
   */
  private static calculateCapHealthAdjustment(
    leagueContext: LeagueCapContext
  ): number {
    const { leagueHealth, averageTeamCapSpace, currentYearCap } = leagueContext;

    // Calculate average team cap space as percentage of cap
    const averageCapSpacePercentage = averageTeamCapSpace / currentYearCap;

    switch (leagueHealth) {
      case 'prosperous':
        // Teams have lots of cap space - players can demand more
        if (averageCapSpacePercentage > 0.15) {
          return 1.15; // 15% increase
        }
        return 1.05; // 5% increase

      case 'healthy':
        // Normal market conditions
        if (averageCapSpacePercentage > 0.1) {
          return 1.02; // 2% increase
        }
        return 1.0; // No adjustment

      case 'struggling':
        // Teams are tight on cap - players may need to accept less
        if (averageCapSpacePercentage < 0.05) {
          return 0.9; // 10% decrease
        }
        return 0.95; // 5% decrease

      default:
        return 1.0;
    }
  }

  /**
   * Calculate position-specific market trend adjustment
   */
  private static calculatePositionTrendAdjustment(
    position: Position,
    positionTrend: 'rising' | 'falling' | 'stable'
  ): number {
    switch (positionTrend) {
      case 'rising':
        return 1.1; // 10% increase for positions in demand
      case 'falling':
        return 0.95; // 5% decrease for positions with low demand
      case 'stable':
      default:
        return 1.0; // No adjustment
    }
  }

  /**
   * Calculate minimum floor to prevent extreme undervaluation
   */
  private static calculateMinimumFloor(
    player: any,
    leagueContext: LeagueCapContext
  ): number {
    const baseMinimum = this.calculateBaseMinimum(
      player,
      leagueContext.currentYearCap
    );

    // Elite players should never go below 80% of their base minimum
    const tier = ContractMinimumCalculator.determinePlayerTier(
      player.overall,
      player.years_exp || 0, // Use years_exp to match existing pattern
      player.position
    );

    switch (tier) {
      case 'elite':
        return baseMinimum * 0.8; // Never below 80%
      case 'starter':
        return baseMinimum * 0.7; // Never below 70%
      case 'depth':
        return baseMinimum * 0.6; // Never below 60%
      default:
        return baseMinimum * 0.7;
    }
  }

  /**
   * Analyze market ripple effects from a recent signing
   */
  static analyzeMarketRipple(
    signedPlayer: any, // Use any to match existing pattern and access Sleeper properties
    contractValue: number,
    existingRipple: MarketRippleContext
  ): MarketRippleContext {
    const playerTier = ContractMinimumCalculator.determinePlayerTier(
      signedPlayer.overall,
      signedPlayer.years_exp || 0, // Use years_exp to match existing pattern
      signedPlayer.position
    );

    // Calculate expected value for this player
    const expectedValue = signedPlayer.overall * 100000;

    // Determine market impact
    let marketImpact: 'positive' | 'negative' | 'neutral';
    if (contractValue < expectedValue * 0.8) {
      marketImpact = 'negative'; // Undervalued signing
    } else if (contractValue > expectedValue * 1.2) {
      marketImpact = 'positive'; // Overvalued signing
    } else {
      marketImpact = 'neutral'; // Fair value
    }

    // Add this signing to recent signings
    const newSigning = {
      playerId: signedPlayer.id,
      position: signedPlayer.position,
      tier: playerTier,
      contractValue,
      signedAt: new Date(),
      marketImpact,
    };

    // Update market trends based on this signing
    const updatedTrends = this.updateMarketTrends(
      signedPlayer.position,
      playerTier,
      marketImpact,
      existingRipple
    );

    return {
      ...existingRipple,
      similarPlayerSignings: [
        ...existingRipple.similarPlayerSignings,
        newSigning,
      ],
      positionMarketTrend: updatedTrends.positionTrend,
      tierMarketTrend: updatedTrends.tierTrend,
      recentMarketShifts: updatedTrends.marketShifts,
    };
  }

  /**
   * Update market trends based on recent signing
   */
  private static updateMarketTrends(
    position: Position,
    tier: 'elite' | 'starter' | 'depth',
    impact: 'positive' | 'negative' | 'neutral',
    existingRipple: MarketRippleContext
  ): {
    positionTrend: 'rising' | 'falling' | 'stable';
    tierTrend: 'rising' | 'falling' | 'stable';
    marketShifts: Array<{
      position: string;
      tier: string;
      shiftPercentage: number;
      trigger: string;
    }>;
  } {
    // Calculate shift percentage based on impact
    let shiftPercentage = 0;
    if (impact === 'positive') shiftPercentage = 5; // 5% upward shift
    else if (impact === 'negative') shiftPercentage = -3; // 3% downward shift

    // Add market shift record
    const marketShift = {
      position,
      tier,
      shiftPercentage,
      trigger: `Recent ${impact} signing in ${position} ${tier} tier`,
    };

    // Update trends based on recent shifts
    const recentShifts = [...existingRipple.recentMarketShifts, marketShift];

    // Calculate position trend
    const positionShifts = recentShifts
      .filter((shift) => shift.position === position)
      .slice(-5); // Last 5 shifts

    const positionTrend = this.calculateTrendFromShifts(positionShifts);

    // Calculate tier trend
    const tierShifts = recentShifts
      .filter((shift) => shift.tier === tier)
      .slice(-5); // Last 5 shifts

    const tierTrend = this.calculateTrendFromShifts(tierShifts);

    return {
      positionTrend,
      tierTrend,
      marketShifts: recentShifts.slice(-10), // Keep last 10 shifts
    };
  }

  /**
   * Calculate trend from market shifts
   */
  private static calculateTrendFromShifts(
    shifts: Array<{ shiftPercentage: number }>
  ): 'rising' | 'falling' | 'stable' {
    if (shifts.length === 0) return 'stable';

    const totalShift = shifts.reduce(
      (sum, shift) => sum + shift.shiftPercentage,
      0
    );
    const averageShift = totalShift / shifts.length;

    if (averageShift > 2) return 'rising';
    if (averageShift < -2) return 'falling';
    return 'stable';
  }
}
