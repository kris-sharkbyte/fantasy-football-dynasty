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

// Sports data interfaces based on actual data structure
export interface SportsPlayer {
  Age?: number;
  college?: string;
  AverageDraftPosition?: number | null;
  BirthDate?: string;
  ByeWeek?: number;
  College?: string;
  CollegeDraftPick?: number;
  CollegeDraftRound?: number;
  CollegeDraftTeam?: string;
  CollegeDraftYear?: number;
  DraftKingsName?: string;
  DraftKingsPlayerID?: number;
  Experience?: number;
  FanDuelName?: string;
  FanDuelPlayerID?: number;
  FantasyPosition?: string;
  FirstName?: string;
  Height?: string;
  InjuryStatus?: string | null;
  IsUndraftedFreeAgent?: boolean;
  LastName?: string;
  Number?: number;
  PhotoUrl?: string;
  PlayerID: number;
  Position: string;
  PositionCategory?: string;
  Status?: string;
  Team?: string;
  TeamID?: number;
  Weight?: number;
  // Additional properties that might be added by the sports data service
  overall?: number;
  fantasyPoints?: number;
  stats?: PlayerStats[];
}

export interface PlayerStats {
  AssistedTackles?: number;
  AuctionValue?: number | null;
  AuctionValuePPR?: number | null;
  AverageDraftPosition?: number | null;
  AverageDraftPosition2QB?: number | null;
  AverageDraftPositionDynasty?: number | null;
  AverageDraftPositionPPR?: number | null;
  AverageDraftPositionRookie?: number | null;
  ExtraPointsAttempted?: number;
  ExtraPointsMade?: number;
  FantasyPoints?: number;
  FantasyPointsDraftKings?: number;
  FantasyPointsFanDuel?: number;
  FantasyPointsPPR?: number;
  FantasyPosition?: string;
  FieldGoalsAttempted?: number;
  FieldGoalsMade?: number;
  FieldGoalsMade0to19?: number;
  FieldGoalsMade20to29?: number;
  FieldGoalsMade30to39?: number;
  FieldGoalsMade40to49?: number;
  FieldGoalsMade50Plus?: number;
  FumbleReturnTouchdowns?: number;
  Fumbles?: number;
  FumblesForced?: number;
  FumblesLost?: number;
  FumblesRecovered?: number;
  InterceptionReturnTouchdowns?: number;
  Interceptions?: number;
  KickReturns?: number;
  KickReturnTouchdowns?: number;
  KickReturnYards?: number;
  Name?: string;
  Number?: number;
  PassesDefended?: number;
  PassingAttempts?: number;
  PassingCompletionPercentage?: number;
  PassingCompletions?: number;
  PassingInterceptions?: number;
  PassingLong?: number;
  PassingRating?: number;
  PassingSacks?: number;
  PassingSackYards?: number;
  PassingTouchdowns?: number;
  PassingYards?: number;
  PassingYardsPerAttempt?: number;
  PassingYardsPerCompletion?: number;
  Played?: number;
  PlayerID: number;
  PlayerSeasonID?: number;
  Position?: string;
  PositionCategory?: string;
  PuntReturns?: number;
  PuntReturnTouchdowns?: number;
  PuntReturnYards?: number;
  QuarterbackHits?: number;
  ReceivingLong?: number;
  ReceivingTargets?: number;
  ReceivingTouchdowns?: number;
  ReceivingYards?: number;
  ReceivingYardsPerReception?: number;
  Receptions?: number;
  RushingAttempts?: number;
  RushingLong?: number;
  RushingTouchdowns?: number;
  RushingYards?: number;
  RushingYardsPerAttempt?: number;
  Sacks?: number;
  SackYards?: number;
  Season?: number;
  SeasonType?: number;
  SoloTackles?: number;
  Started?: number;
  TacklesForLoss?: number;
  Team?: string;
  TeamID?: number;
  TwoPointConversionPasses?: number;
  TwoPointConversionReceptions?: number;
  TwoPointConversionRuns?: number;
}

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
  async createLeague(
    data: LeagueSetupData,
    sportsDataPlayers?: SportsPlayer[]
  ): Promise<LeagueSetupResult> {
    // Initialize the service
    await this.initialize();

    // Create the league
    const league = this.createLeagueEntity(data);

    // Create teams
    const teams = this.createTeams(data.numberOfTeams, league.id);

    // Create enhanced players with personalities
    const players = await this.setupPlayers(
      data.currentYear,
      sportsDataPlayers
    );

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
        location: {
          city: 'New York',
          state: 'NY',
          timezone: 'EST',
          marketSize: 'large',
          climate: 'temperate',
          stadiumName: 'Default Stadium',
          stadiumCapacity: 70000,
          isContender: false,
          isStable: true,
          taxRate: 0.0685,
        },
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
    currentYear: number,
    sportsDataPlayers?: SportsPlayer[] // Use proper interface
  ): Promise<PlayerSetupResult[]> {
    // Import base players (this would come from your data source)
    const basePlayers = await this.importBasePlayers();
    const results: PlayerSetupResult[] = [];

    // Filter for fantasy-relevant positions only (including IDP)
    const fantasyPositions = [
      'QB',
      'RB',
      'WR',
      'TE',
      'K',
      'DEF',
      'DL',
      'LB',
      'DB',
    ];

    // If we have sports data players, use them as the base
    let playersToProcess = basePlayers;
    if (sportsDataPlayers && sportsDataPlayers.length > 0) {
      // Debug: Log what we're getting from sports data
      console.log(
        '[LeagueSetupService] Sports data players received:',
        sportsDataPlayers.length
      );
      console.log(
        '[LeagueSetupService] Sample sports player:',
        sportsDataPlayers[0]
      );
      console.log(
        '[LeagueSetupService] Sample player FirstName:',
        sportsDataPlayers[0]?.FirstName
      );
      console.log(
        '[LeagueSetupService] Sample player LastName:',
        sportsDataPlayers[0]?.LastName
      );
      console.log(
        '[LeagueSetupService] Sample player Position:',
        sportsDataPlayers[0]?.Position
      );
      console.log(
        '[LeagueSetupService] Sample player PlayerID:',
        sportsDataPlayers[0]?.PlayerID
      );

      // Filter sports data players for fantasy positions
      const filteredSportsPlayers = sportsDataPlayers.filter(
        (player) =>
          player.Position && fantasyPositions.includes(player.Position)
      );

      console.log(
        '[LeagueSetupService] Filtered sports players for fantasy positions:',
        filteredSportsPlayers.length
      );

      if (filteredSportsPlayers.length > 0) {
        playersToProcess = filteredSportsPlayers.map((sportsPlayer) => {
          // Construct full name from FirstName and LastName
          const fullName = `${sportsPlayer.FirstName || ''} ${
            sportsPlayer.LastName || ''
          }`.trim();

          const mappedPlayer = {
            id: sportsPlayer.PlayerID.toString(),
            name: fullName || 'Unknown Player',
            position: sportsPlayer.Position as Position, // Cast to Position type
            age: this.calculateAgeFromBirthDate(sportsPlayer.BirthDate || ''),
            overall: this.calculateOverallFromStats(sportsPlayer), // Calculate from actual stats
            yearsExp: sportsPlayer.Experience || 0,
            nflTeam: sportsPlayer.Team || 'FA',
            devGrade: this.getDevGradeFromOverall(
              this.calculateOverallFromStats(sportsPlayer)
            ),
            traits: {
              // Keep minimal traits for personality system compatibility
              speed: 0,
              strength: 0,
              agility: 0,
              awareness: 0,
              injury: 0,
              schemeFit: [],
            },
            stats: [], // We'll need to link stats separately by PlayerID
          };

          // Debug: Log the mapped player
          console.log('[LeagueSetupService] Mapped sports player:', {
            originalFirstName: sportsPlayer.FirstName,
            originalLastName: sportsPlayer.LastName,
            fullName: fullName,
            mappedName: mappedPlayer.name,
            originalId: sportsPlayer.PlayerID,
            mappedId: mappedPlayer.id,
          });

          return mappedPlayer;
        });
      }
    }

    const filteredPlayers = playersToProcess.filter((player) =>
      fantasyPositions.includes(player.position)
    );

    for (const basePlayer of filteredPlayers) {
      // Create enhanced player with personality
      const enhancedPlayer = EnhancedPlayerFactory.createEnhancedPlayer(
        basePlayer,
        currentYear
      );

      // Use the calculated overall from stats
      const overall = basePlayer.overall;

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
   * Calculate overall rating from actual stats (2024 season performance)
   */
  private calculateOverallFromStats(sportsPlayer: SportsPlayer): number {
    // Base overall from sports data if available
    if (sportsPlayer.overall && sportsPlayer.overall > 0) {
      return sportsPlayer.overall;
    }

    // Fallback calculation based on fantasy points from previous season
    if (sportsPlayer.fantasyPoints && sportsPlayer.fantasyPoints > 0) {
      const fantasyPoints = sportsPlayer.fantasyPoints;

      // Convert fantasy points to overall rating (adjust these thresholds based on your scoring system)
      if (fantasyPoints >= 300) return 95; // Elite (e.g., CMC, Tyreek)
      if (fantasyPoints >= 250) return 90; // Top tier
      if (fantasyPoints >= 200) return 85; // High tier
      if (fantasyPoints >= 150) return 80; // Above average
      if (fantasyPoints >= 100) return 75; // Average
      if (fantasyPoints >= 50) return 70; // Below average
      return 65; // Low tier
    }

    // If no stats available, use position-based default
    const position = sportsPlayer.Position || 'QB'; // Default to QB if Position is undefined
    if (!position) {
      return this.getPositionBaseRating('QB'); // Fallback to QB if still undefined
    }
    // At this point, position is guaranteed to be a string, so we can safely cast it
    const safePosition = position as Position;
    return this.getPositionBaseRating(safePosition);
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
      case 'K':
        return 52; // Kickers start lower
      case 'DEF':
        return 58; // Team defenses start moderate
      case 'DL':
        return 56; // Defensive linemen start moderate
      case 'LB':
        return 57; // Linebackers start moderate
      case 'DB':
        return 55; // Defensive backs start moderate
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
      case 'K':
        return 0.8; // Kickers are less valuable
      case 'DEF':
        return 1.1; // Team defenses are moderately valuable
      case 'DL':
        return 1.0; // Defensive linemen are standard value
      case 'LB':
        return 1.1; // Linebackers are moderately valuable
      case 'DB':
        return 1.0; // Defensive backs are standard value
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
      K: 0.5, // Kickers are moderately scarce
      DEF: 0.7, // Defenses are scarce
      DL: 0.4, // Defensive linemen are somewhat scarce
      LB: 0.5, // Linebackers are moderately scarce
      DB: 0.4, // Defensive backs are somewhat scarce
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

    // Define the positions we support (including IDP)
    const positions: Position[] = [
      'QB',
      'RB',
      'WR',
      'TE',
      'K',
      'DEF',
      'DL',
      'LB',
      'DB',
    ];

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
   * Import base players from sports data or generate sample data
   */
  private async importBasePlayers(): Promise<Player[]> {
    const players: Player[] = [];

    // Generate a full roster of players for fantasy football
    // We need approximately 300-400 players for a 12-team league with 25-30 man rosters

    // Generate 32 QBs (one per NFL team + extras)
    for (let i = 0; i < 32; i++) {
      const age = 24 + (i % 8); // Ages 24-31
      const overall = 75 + (i % 20); // Overall 75-94
      players.push({
        id: `qb_${i}`,
        name: `QB ${i + 1}`,
        position: 'QB',
        age,
        overall,
        yearsExp: age - 22,
        nflTeam: this.getRandomNFLTeam(),
        devGrade: overall >= 90 ? 'A' : overall >= 85 ? 'B' : 'C',
        traits: {
          // Minimal traits for compatibility
          speed: 0,
          strength: 0,
          agility: 0,
          awareness: 0,
          injury: 0,
          schemeFit: [],
        },
        stats: [],
      });
    }

    // Generate 64 RBs (2 per NFL team + extras)
    for (let i = 0; i < 64; i++) {
      const age = 23 + (i % 6); // Ages 23-28
      const overall = 78 + (i % 17); // Overall 78-94
      players.push({
        id: `rb_${i}`,
        name: `RB ${i + 1}`,
        position: 'RB',
        age,
        overall,
        yearsExp: age - 22,
        nflTeam: this.getRandomNFLTeam(),
        devGrade: overall >= 90 ? 'A' : overall >= 85 ? 'B' : 'C',
        traits: {
          // Minimal traits for compatibility
          speed: 0,
          strength: 0,
          agility: 0,
          awareness: 0,
          injury: 0,
          schemeFit: [],
        },
        stats: [],
      });
    }

    // Generate 96 WRs (3 per NFL team + extras)
    for (let i = 0; i < 96; i++) {
      const age = 24 + (i % 7); // Ages 24-30
      const overall = 76 + (i % 19); // Overall 76-94
      players.push({
        id: `wr_${i}`,
        name: `WR ${i + 1}`,
        position: 'WR',
        age,
        overall,
        yearsExp: age - 22,
        nflTeam: this.getRandomNFLTeam(),
        devGrade: overall >= 90 ? 'A' : overall >= 85 ? 'B' : 'C',
        traits: {
          // Minimal traits for compatibility
          speed: 0,
          strength: 0,
          agility: 0,
          awareness: 0,
          injury: 0,
          schemeFit: [],
        },
        stats: [],
      });
    }

    // Generate 48 TEs (1.5 per NFL team + extras)
    for (let i = 0; i < 48; i++) {
      const age = 25 + (i % 7); // Ages 25-31
      const overall = 75 + (i % 20); // Overall 75-94
      players.push({
        id: `te_${i}`,
        name: `TE ${i + 1}`,
        position: 'TE',
        age,
        overall,
        yearsExp: age - 22,
        nflTeam: this.getRandomNFLTeam(),
        devGrade: overall >= 90 ? 'A' : overall >= 85 ? 'B' : 'C',
        traits: {
          // Minimal traits for compatibility
          speed: 0,
          strength: 0,
          agility: 0,
          awareness: 0,
          injury: 0,
          schemeFit: [],
        },
        stats: [],
      });
    }

    // Generate 32 Kickers (1 per NFL team)
    for (let i = 0; i < 32; i++) {
      const age = 28 + (i % 6); // Ages 28-33
      const overall = 72 + (i % 18); // Overall 72-89
      players.push({
        id: `k_${i}`,
        name: `K ${i + 1}`,
        position: 'K',
        age,
        overall,
        yearsExp: age - 22,
        nflTeam: this.getRandomNFLTeam(),
        devGrade: overall >= 85 ? 'A' : overall >= 80 ? 'B' : 'C',
        traits: {
          // Minimal traits for compatibility
          speed: 0,
          strength: 0,
          agility: 0,
          awareness: 0,
          injury: 0,
          schemeFit: [],
        },
        stats: [],
      });
    }

    // Generate 32 Team Defenses (1 per NFL team)
    for (let i = 0; i < 32; i++) {
      const age = 1; // Team defenses don't age
      const overall = 75 + (i % 20); // Overall 75-94
      players.push({
        id: `def_${i}`,
        name: `DEF ${this.getRandomNFLTeam()}`,
        position: 'DEF',
        age,
        overall,
        yearsExp: 0,
        nflTeam: this.getRandomNFLTeam(),
        devGrade: overall >= 90 ? 'A' : overall >= 85 ? 'B' : 'C',
        traits: {
          // Minimal traits for compatibility
          speed: 0,
          strength: 0,
          agility: 0,
          awareness: 0,
          injury: 100, // Team defenses don't get injured
          schemeFit: [],
        },
        stats: [],
      });
    }

    // Generate 48 DL (1.5 per NFL team + extras)
    for (let i = 0; i < 48; i++) {
      const age = 25 + (i % 7); // Ages 25-31
      const overall = 76 + (i % 19); // Overall 76-94
      players.push({
        id: `dl_${i}`,
        name: `DL ${i + 1}`,
        position: 'DL',
        age,
        overall,
        yearsExp: age - 22,
        nflTeam: this.getRandomNFLTeam(),
        devGrade: overall >= 90 ? 'A' : overall >= 85 ? 'B' : 'C',
        traits: {
          // Minimal traits for compatibility
          speed: 0,
          strength: 0,
          agility: 0,
          awareness: 0,
          injury: 0,
          schemeFit: [],
        },
        stats: [],
      });
    }

    // Generate 48 LBs (1.5 per NFL team + extras)
    for (let i = 0; i < 48; i++) {
      const age = 24 + (i % 7); // Ages 24-30
      const overall = 77 + (i % 18); // Overall 77-94
      players.push({
        id: `lb_${i}`,
        name: `LB ${i + 1}`,
        position: 'LB',
        age,
        overall,
        yearsExp: age - 22,
        nflTeam: this.getRandomNFLTeam(),
        devGrade: overall >= 90 ? 'A' : overall >= 85 ? 'B' : 'C',
        traits: {
          // Minimal traits for compatibility
          speed: 0,
          strength: 0,
          agility: 0,
          awareness: 0,
          injury: 0,
          schemeFit: [],
        },
        stats: [],
      });
    }

    // Generate 48 DBs (1.5 per NFL team + extras)
    for (let i = 0; i < 48; i++) {
      const age = 24 + (i % 7); // Ages 24-30
      const overall = 76 + (i % 19); // Overall 76-94
      players.push({
        id: `db_${i}`,
        name: `DB ${i + 1}`,
        position: 'DB',
        age,
        overall,
        yearsExp: age - 22,
        nflTeam: this.getRandomNFLTeam(),
        devGrade: overall >= 90 ? 'A' : overall >= 85 ? 'B' : 'C',
        traits: {
          // Minimal traits for compatibility
          speed: 0,
          strength: 0,
          agility: 0,
          awareness: 0,
          injury: 0,
          schemeFit: [],
        },
        stats: [],
      });
    }

    console.log(`Generated ${players.length} base players for league setup`);
    return players;
  }

  /**
   * Calculate age from birth date string
   */
  private calculateAgeFromBirthDate(birthDate: string): number {
    if (!birthDate) return 25;

    try {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
      ) {
        age--;
      }

      return age;
    } catch (error) {
      console.warn('Error calculating age from birth date:', birthDate, error);
      return 25;
    }
  }

  /**
   * Get development grade from overall rating
   */
  private getDevGradeFromOverall(overall: number): 'A' | 'B' | 'C' | 'D' {
    if (overall >= 90) return 'A';
    if (overall >= 85) return 'B';
    if (overall >= 80) return 'C';
    return 'D';
  }

  /**
   * Get a random NFL team for player assignment
   */
  private getRandomNFLTeam(): string {
    const teams = [
      'ARI',
      'ATL',
      'BAL',
      'BUF',
      'CAR',
      'CHI',
      'CIN',
      'CLE',
      'DAL',
      'DEN',
      'DET',
      'GB',
      'HOU',
      'IND',
      'JAX',
      'KC',
      'LV',
      'LAC',
      'LAR',
      'MIA',
      'MIN',
      'NE',
      'NO',
      'NYG',
      'NYJ',
      'PHI',
      'PIT',
      'SEA',
      'SF',
      'TB',
      'TEN',
      'WAS',
    ];
    return teams[Math.floor(Math.random() * teams.length)];
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
