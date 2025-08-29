import { Injectable } from '@angular/core';
import {
  League,
  LeagueRules,
  Team,
  Player,
  Position,
  LeaguePhase,
} from '@fantasy-football-dynasty/types';
import { EnhancedPlayerFactory } from './personalities/enhanced-player-factory';
import { EnhancedPlayer } from './personalities/enhanced-player';

export interface LeagueSetupData {
  name: string;
  description?: string;
  numberOfTeams: number;
  rules: LeagueRules;
  isPrivate: boolean;
  currentYear: number;
}

export interface PlayerSetupResult {
  enhancedPlayer: EnhancedPlayer;
  overall: number;
  minimumContract: MinimumContract;
}

export interface MinimumContract {
  apy: number;
  guaranteedAmount: number;
  years: number;
  signingBonus: number;
}

export interface LeagueSetupResult {
  league: League;
  teams: Team[];
  players: PlayerSetupResult[];
  marketContext: LeagueMarketContext;
}

export interface LeagueMarketContext {
  positionScarcity: Record<Position, number>;
  apyPercentiles: Record<Position, APYPercentiles>;
  guaranteePercentiles: Record<Position, GuaranteePercentiles>;
  marketTrends: Record<Position, 'rising' | 'falling' | 'stable'>;
}

export interface APYPercentiles {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface GuaranteePercentiles {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

/**
 * Service for setting up new fantasy football leagues
 * Handles player personality generation, rating calculation, and market initialization
 */
@Injectable({
  providedIn: 'root',
})
export class LeagueSetupService {
  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await EnhancedPlayerFactory.initialize();
  }

  /**
   * Create a complete league setup
   */
  async createLeague(data: LeagueSetupData): Promise<LeagueSetupResult> {
    // Initialize the service
    await this.initialize();

    // Create the league
    const league = this.createLeagueEntity(data);

    // Create teams
    const teams = this.createTeams(data.numberOfTeams, league.id);

    // Create enhanced players with personalities
    const players = await this.setupPlayers(data.currentYear);

    // Initialize market context
    const marketContext = this.initializeMarketContext(players, data.rules);

    // Update player market context with league-specific data
    this.updatePlayerMarketContext(players, marketContext);

    return {
      league,
      teams,
      players,
      marketContext,
    };
  }

  /**
   * Create the league entity
   */
  private createLeagueEntity(data: LeagueSetupData): League {
    const now = new Date();
    const joinCode = this.generateJoinCode();

    return {
      id: this.generateId(),
      name: data.name,
      description: data.description,
      numberOfTeams: data.numberOfTeams,
      currentYear: data.currentYear,
      phase: LeaguePhase.offseason,
      status: 'active',
      isPrivate: data.isPrivate,
      joinCode,
      rules: data.rules,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Create teams for the league
   */
  private createTeams(numberOfTeams: number, leagueId: string): Team[] {
    const teams: Team[] = [];
    const teamNames = this.generateTeamNames(numberOfTeams);

    for (let i = 0; i < numberOfTeams; i++) {
      const team: Team = {
        id: this.generateId(),
        leagueId,
        name: teamNames[i],
        ownerUserId: '', // Will be set when owner joins
        capSpace: 200000000, // $200M salary cap
        roster: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      teams.push(team);
    }

    return teams;
  }

  /**
   * Set up players with personalities and ratings
   */
  private async setupPlayers(
    currentYear: number
  ): Promise<PlayerSetupResult[]> {
    // Import base players (this would come from your data source)
    const basePlayers = await this.importBasePlayers();
    const results: PlayerSetupResult[] = [];

    for (const basePlayer of basePlayers) {
      // Create enhanced player with personality
      const enhancedPlayer = EnhancedPlayerFactory.createEnhancedPlayer(
        basePlayer,
        currentYear
      );

      // Calculate overall rating
      const overall = this.calculatePlayerOverall(enhancedPlayer);

      // Calculate minimum contract requirements
      const minimumContract = this.calculateMinimumContract(
        enhancedPlayer,
        overall
      );

      results.push({
        enhancedPlayer,
        overall,
        minimumContract,
      });
    }

    return results;
  }

  /**
   * Calculate player overall rating
   */
  private calculatePlayerOverall(player: EnhancedPlayer): number {
    const { stats, age, yearsExp, devGrade } = player;
    let overall = 50; // Base rating

    // Age-based adjustments
    if (age >= 25 && age <= 28) overall += 5; // Prime years
    else if (age >= 29 && age <= 32) overall += 2; // Veteran
    else if (age >= 33) overall -= 5; // Declining

    // Experience adjustments
    if (yearsExp >= 3 && yearsExp <= 7) overall += 3; // Experienced
    else if (yearsExp >= 8) overall -= 2; // Very experienced (declining)

    // Development grade adjustments
    switch (devGrade) {
      case 'A':
        overall += 15;
        break;
      case 'B':
        overall += 10;
        break;
      case 'C':
        overall += 5;
        break;
      case 'D':
        overall -= 5;
        break;
    }

    // Position-specific base ratings
    const positionBase = this.getPositionBaseRating(player.position);
    overall = Math.max(overall, positionBase);

    // Ensure overall is within bounds
    return Math.max(50, Math.min(99, overall));
  }

  /**
   * Get base rating for position
   */
  private getPositionBaseRating(position: Position): number {
    switch (position) {
      case 'QB':
        return 65; // QBs start higher
      case 'RB':
        return 60;
      case 'WR':
        return 58;
      case 'TE':
        return 55;
      default:
        return 50;
    }
  }

  /**
   * Calculate minimum contract requirements
   */
  private calculateMinimumContract(
    player: EnhancedPlayer,
    overall: number
  ): MinimumContract {
    // Base APY calculation
    let baseAPY = overall * 100000; // $100K per overall point

    // Position multipliers
    const positionMultiplier = this.getPositionMultiplier(player.position);
    baseAPY *= positionMultiplier;

    // Personality adjustments
    const personalityMultiplier = this.getPersonalityMultiplier(player);
    baseAPY *= personalityMultiplier;

    // Age adjustments
    const ageMultiplier = this.getAgeMultiplier(player.age);
    baseAPY *= ageMultiplier;

    // Calculate contract terms
    const years = this.calculateContractYears(player, overall);
    const guaranteedAmount = baseAPY * years * 0.7; // 70% guaranteed
    const signingBonus = baseAPY * 0.3; // 30% signing bonus

    return {
      apy: Math.round(baseAPY),
      guaranteedAmount: Math.round(guaranteedAmount),
      years,
      signingBonus: Math.round(signingBonus),
    };
  }

  /**
   * Get position multiplier for APY calculation
   */
  private getPositionMultiplier(position: Position): number {
    switch (position) {
      case 'QB':
        return 2.5; // QBs are most valuable
      case 'WR':
        return 1.5; // WRs are valuable
      case 'RB':
        return 1.2; // RBs are moderately valuable
      case 'TE':
        return 1.3; // TEs are somewhat valuable
      default:
        return 1.0;
    }
  }

  /**
   * Get personality multiplier for APY calculation
   */
  private getPersonalityMultiplier(player: EnhancedPlayer): number {
    const { personality } = player;
    let multiplier = 1.0;

    // Aggressive negotiators want more
    if (personality.traits.negotiationStyle === 'aggressive') {
      multiplier *= 1.2;
    }

    // High ego players demand more
    if (personality.hiddenSliders.ego > 0.7) {
      multiplier *= 1.1;
    }

    // Desperate players accept less
    if (personality.traits.negotiationStyle === 'desperate') {
      multiplier *= 0.8;
    }

    return multiplier;
  }

  /**
   * Get age multiplier for APY calculation
   */
  private getAgeMultiplier(age: number): number {
    if (age >= 25 && age <= 28) return 1.1; // Prime years
    if (age >= 29 && age <= 32) return 1.0; // Veteran
    if (age >= 33) return 0.8; // Declining
    return 0.9; // Young players
  }

  /**
   * Calculate contract years based on player characteristics
   */
  private calculateContractYears(
    player: EnhancedPlayer,
    overall: number
  ): number {
    // Elite players get longer contracts
    if (overall >= 90) return 5;
    if (overall >= 85) return 4;
    if (overall >= 80) return 3;
    return 2; // Default 2 years
  }

  /**
   * Initialize market context for the league
   */
  private initializeMarketContext(
    players: PlayerSetupResult[],
    rules: LeagueRules
  ): LeagueMarketContext {
    const positionScarcity: Record<Position, number> = {
      QB: 0.8, // QBs are scarce
      RB: 0.3, // RBs are plentiful
      WR: 0.4, // WRs are somewhat scarce
      TE: 0.6, // TEs are moderately scarce
    };

    // Adjust based on league roster requirements
    const { positionRequirements } = rules.roster;
    const totalTeams = Object.values(positionRequirements).reduce(
      (sum, count) => sum + count,
      0
    );

    // Calculate scarcity based on demand vs supply
    for (const [position, required] of Object.entries(positionRequirements)) {
      const available = players.filter(
        (p) => p.enhancedPlayer.position === position
      ).length;
      const demand = required * 12; // Assume 12 teams
      positionScarcity[position as Position] = Math.min(
        1.0,
        demand / available
      );
    }

    // Calculate APY percentiles for each position
    const apyPercentiles: Record<Position, APYPercentiles> = {} as any;
    const guaranteePercentiles: Record<Position, GuaranteePercentiles> =
      {} as any;
    const marketTrends: Record<Position, 'rising' | 'falling' | 'stable'> =
      {} as any;

    // Define the positions we support
    const positions: Position[] = ['QB', 'RB', 'WR', 'TE'];

    for (const position of positions) {
      const positionPlayers = players.filter(
        (p) => p.enhancedPlayer.position === position
      );
      if (positionPlayers.length > 0) {
        const apys = positionPlayers
          .map((p) => p.minimumContract.apy)
          .sort((a, b) => a - b);
        const guarantees = positionPlayers
          .map((p) => p.minimumContract.guaranteedAmount)
          .sort((a, b) => a - b);

        apyPercentiles[position] = this.calculatePercentiles(apys);
        guaranteePercentiles[position] = this.calculatePercentiles(guarantees);
        marketTrends[position] = 'stable'; // Start stable
      }
    }

    return {
      positionScarcity,
      apyPercentiles,
      guaranteePercentiles,
      marketTrends,
    };
  }

  /**
   * Calculate percentiles from an array of numbers
   */
  private calculatePercentiles(
    values: number[]
  ): APYPercentiles | GuaranteePercentiles {
    const sorted = values.sort((a, b) => a - b);
    const len = sorted.length;

    return {
      p25: sorted[Math.floor(len * 0.25)] || 0,
      p50: sorted[Math.floor(len * 0.5)] || 0,
      p75: sorted[Math.floor(len * 0.75)] || 0,
      p90: sorted[Math.floor(len * 0.9)] || 0,
    };
  }

  /**
   * Update player market context with league-specific data
   */
  private updatePlayerMarketContext(
    players: PlayerSetupResult[],
    marketContext: LeagueMarketContext
  ): void {
    for (const { enhancedPlayer } of players) {
      const position = enhancedPlayer.position;
      const context = enhancedPlayer.personality.marketContext;

      // Update supply pressure
      context.supplyPressure = marketContext.positionScarcity[position];

      // Update market trend
      context.marketTrend = marketContext.marketTrends[position];

      // Update percentiles
      context.apyPercentiles = marketContext.apyPercentiles[position];
      context.guaranteePercentiles =
        marketContext.guaranteePercentiles[position];

      // Update timestamp
      context.lastUpdated = Date.now();
    }
  }

  /**
   * Import base players (placeholder - replace with actual data source)
   */
  private async importBasePlayers(): Promise<Player[]> {
    // This is a placeholder - replace with actual player import logic
    const players: Player[] = [];

    // Generate some sample players for testing
    const positions: Position[] = ['QB', 'RB', 'WR', 'TE'];
    const names = [
      'Patrick Mahomes',
      'Josh Allen',
      'Lamar Jackson',
      'Jalen Hurts',
      'Christian McCaffrey',
      'Saquon Barkley',
      'Derrick Henry',
      'Nick Chubb',
      'Tyreek Hill',
      'Stefon Diggs',
      'Davante Adams',
      'Justin Jefferson',
      'Travis Kelce',
      'Mark Andrews',
      'George Kittle',
      'T.J. Hockenson',
    ];

    for (let i = 0; i < names.length; i++) {
      const position = positions[i % positions.length];
      const age = 24 + (i % 8); // Ages 24-31
      const overall = 80 + (i % 15); // Overall 80-94

      players.push({
        id: `player_${i}`,
        name: names[i],
        position,
        age,
        overall,
        yearsExp: age - 22,
        nflTeam: 'FA',
        devGrade:
          overall >= 90 ? 'A' : overall >= 85 ? 'B' : overall >= 80 ? 'C' : 'D',
        traits: {
          speed: 70 + (i % 20),
          strength: 60 + (i % 25),
          agility: 70 + (i % 20),
          awareness: 65 + (i % 25),
          injury: 50 + (i % 30),
          schemeFit: [],
        },
        stats: [],
      });
    }

    return players;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate a join code for the league
   */
  private generateJoinCode(): string {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  /**
   * Generate team names
   */
  private generateTeamNames(count: number): string[] {
    const teamNames = [
      'Thunder Bolts',
      'Fire Dragons',
      'Ice Warriors',
      'Storm Riders',
      'Phoenix Flames',
      'Shadow Wolves',
      'Golden Eagles',
      'Silver Sharks',
      'Crimson Knights',
      'Azure Dragons',
      'Emerald Giants',
      'Ruby Lions',
    ];

    return teamNames.slice(0, count);
  }
}
