import {
  Contract,
  Guarantee,
  CapLedger,
  Team,
  Player,
  Position,
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
