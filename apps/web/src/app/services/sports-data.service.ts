import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, combineLatest, shareReplay } from 'rxjs';
import {
  SportsTeam,
  SportsPlayer,
  PlayerStats,
  EnhancedSportsPlayer,
} from '@fantasy-football-dynasty/types';

@Injectable({
  providedIn: 'root',
})
export class SportsDataService {
  // Private state signals
  private _teams = signal<SportsTeam[]>([]);
  private _players = signal<SportsPlayer[]>([]);
  private _playerStats = signal<PlayerStats[]>([]);
  private _enhancedPlayers = signal<EnhancedSportsPlayer[]>([]);
  private _dataReady = signal<boolean>(false);

  // Public readonly signals
  public teams = this._teams.asReadonly();
  public players = this._players.asReadonly();
  public playerStats = this._playerStats.asReadonly();
  public enhancedPlayers = this._enhancedPlayers.asReadonly();
  public dataReady = this._dataReady.asReadonly();

  constructor(private http: HttpClient) {
    this.loadAllData();
  }

  /**
   * Wait for data to be loaded
   */
  public async waitForData(): Promise<void> {
    if (this._dataReady()) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const checkData = () => {
        if (this._dataReady()) {
          resolve();
        } else {
          setTimeout(checkData, 100);
        }
      };
      checkData();
    });
  }

  /**
   * Load all sports data on service initialization
   */
  private async loadAllData(): Promise<void> {
    try {
      console.log('SportsDataService: Starting to load all data...');
      await Promise.all([
        this.loadTeams(),
        this.loadPlayers(),
        this.loadPlayerStats(),
      ]);
      console.log(
        'SportsDataService: All data loaded, creating enhanced players...'
      );
      this.createEnhancedPlayers();
      this._dataReady.set(true); // Mark data as ready
      console.log(
        'SportsDataService: Data loading complete, dataReady set to true'
      );
    } catch (error) {
      console.error('Error loading all data:', error);
    }
  }

  /**
   * Load teams data
   */
  private async loadTeams(): Promise<void> {
    try {
      const teams = await this.http
        .get<SportsTeam[]>('/teams.sportsdata.json')
        .toPromise();
      if (teams) {
        this._teams.set(teams);
        console.log(`Loaded ${teams.length} teams`);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  }

  /**
   * Load players data
   */
  private async loadPlayers(): Promise<void> {
    try {
      const players = await this.http
        .get<SportsPlayer[]>('/players.sportsdata.json')
        .toPromise();
      if (players) {
        this._players.set(players);
        console.log(`Loaded ${players.length} players`);
      }
    } catch (error) {
      console.error('Error loading players:', error);
    }
  }

  /**
   * Load player stats data
   */
  private async loadPlayerStats(): Promise<void> {
    try {
      console.log('SportsDataService: Starting to load player stats...');

      // Add timeout to prevent hanging on large files
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Player stats loading timeout')),
          30000
        ); // 30 second timeout
      });

      const statsPromise = this.http
        .get<PlayerStats[]>('/players-stats-2024.sportsdata.json')
        .toPromise();

      const stats = (await Promise.race([
        statsPromise,
        timeoutPromise,
      ])) as PlayerStats[];

      console.log(
        'SportsDataService: HTTP response received for player stats:',
        stats
      );

      if (stats && Array.isArray(stats)) {
        console.log(
          'SportsDataService: Player stats loaded successfully, count:',
          stats.length
        );
        this._playerStats.set(stats);
        console.log(`Loaded ${stats.length} player stats`);
      } else {
        console.warn(
          'SportsDataService: Player stats response was null/undefined or not an array'
        );
        console.warn('Response type:', typeof stats);
        console.warn('Response:', stats);
      }
    } catch (error) {
      console.error('Error loading player stats:', error);

      // If it's a timeout, try to load a smaller subset or handle gracefully
      if (error instanceof Error && error.message.includes('timeout')) {
        console.warn(
          'Player stats loading timed out - this may be due to file size'
        );
        // Set empty array to prevent blocking the rest of the system
        this._playerStats.set([]);
      }
    }
  }

  /**
   * Create enhanced players by combining player data with stats and team info
   */
  private createEnhancedPlayers(): void {
    const players = this._players();
    const stats = this._playerStats();
    const teams = this._teams();

    console.log('SportsDataService: Creating enhanced players with:', {
      playersCount: players.length,
      statsCount: stats.length,
      teamsCount: teams.length,
    });

    // Debug: Check Active property values
    const activeCount = players.filter((p) => p.Status == 'Active').length;
    const inactiveCount = players.filter((p) => p.Status != 'Active').length;
    console.log('SportsDataService: Player Active status:', {
      activeCount,
      inactiveCount,
      totalPlayers: players.length,
    });

    // If no stats are available, create players with default values
    if (!stats || stats.length === 0) {
      console.warn(
        'SportsDataService: No player stats available, creating players with default values'
      );

      const enhancedPlayers: EnhancedSportsPlayer[] = players.map((player) => {
        // Find team info
        const teamInfo = teams.find((t) => t.Key === player.Team);

        // Use default overall rating since no stats are available
        const overall = 70; // Default rating

        // Calculate market value with default overall
        const marketValue = this.calculateMarketValue(
          player,
          undefined, // No stats
          overall
        );

        // Map Status to Active property since JSON doesn't have Active boolean
        const isActive = player.Status === 'Active';

        return {
          ...player,
          Active: isActive, // Override the Active property based on Status
          stats: undefined,
          teamInfo,
          overall,
          marketValue,
          fantasyPoints: 0,
          fantasyPointsPPR: 0,
        };
      });

      this._enhancedPlayers.set(enhancedPlayers);
      console.log(
        `Created ${enhancedPlayers.length} enhanced players with default values (no stats available)`
      );
      return;
    }

    const enhancedPlayers: EnhancedSportsPlayer[] = players.map((player) => {
      // Find player stats
      const playerStats = stats.find((s) => s.PlayerID === player.PlayerID);

      // Find team info
      const teamInfo = teams.find((t) => t.Key === player.Team);

      // Calculate overall rating based on stats and position
      const overall = this.calculatePlayerOverall(player, playerStats);

      // Calculate market value
      const marketValue = this.calculateMarketValue(
        player,
        playerStats,
        overall
      );

      // Map Status to Active property since JSON doesn't have Active boolean
      const isActive = player.Status === 'Active';

      return {
        ...player,
        Active: isActive, // Override the Active property based on Status
        stats: playerStats,
        teamInfo,
        overall,
        marketValue,
        fantasyPoints: playerStats?.FantasyPoints || 0,
        fantasyPointsPPR: playerStats?.FantasyPointsPPR || 0,
      };
    });

    this._enhancedPlayers.set(enhancedPlayers);
    console.log(`Created ${enhancedPlayers.length} enhanced players`);
  }

  /**
   * Calculate player overall rating based on stats and position
   */
  private calculatePlayerOverall(
    player: SportsPlayer,
    stats?: PlayerStats
  ): number {
    if (!stats) return 70; // Default rating for players without stats

    let baseRating = 70;

    // Position-based calculations
    switch (player.Position) {
      case 'QB':
        baseRating = this.calculateQBRating(stats);
        break;
      case 'RB':
        baseRating = this.calculateRBRating(stats);
        break;
      case 'WR':
        baseRating = this.calculateWRRating(stats);
        break;
      case 'TE':
        baseRating = this.calculateTERating(stats);
        break;
      case 'K':
        baseRating = this.calculateKRating(stats);
        break;
      case 'DEF':
      case 'DL':
      case 'LB':
      case 'DB':
        baseRating = this.calculateDefenseRating(stats);
        break;
      default:
        baseRating = 70;
    }

    // Adjust for experience (veteran bonus)
    if (player.Experience > 5) {
      baseRating += Math.min(5, (player.Experience - 5) * 0.5);
    }

    // Ensure rating is within bounds
    return Math.max(50, Math.min(99, Math.round(baseRating)));
  }

  /**
   * Calculate QB rating based on passing stats
   */
  private calculateQBRating(stats: PlayerStats): number {
    let rating = 70;

    // Passing efficiency
    if (stats.PassingAttempts > 0) {
      const completionRate = stats.PassingCompletions / stats.PassingAttempts;
      rating += completionRate * 10; // 0-10 points for completion rate

      const yardsPerAttempt = stats.PassingYards / stats.PassingAttempts;
      rating += Math.min(10, yardsPerAttempt * 0.5); // 0-10 points for YPA

      const tdRate = stats.PassingTouchdowns / stats.PassingAttempts;
      rating += Math.min(10, tdRate * 100); // 0-10 points for TD rate

      const intRate = stats.PassingInterceptions / stats.PassingAttempts;
      rating -= Math.min(10, intRate * 100); // 0-10 points penalty for INT rate
    }

    // Rushing bonus
    if (stats.RushingYards > 0) {
      rating += Math.min(5, stats.RushingYards / 100); // 0-5 points for rushing
    }

    return rating;
  }

  /**
   * Calculate RB rating based on rushing and receiving stats
   */
  private calculateRBRating(stats: PlayerStats): number {
    let rating = 70;

    // Rushing efficiency
    if (stats.RushingAttempts > 0) {
      const yardsPerCarry = stats.RushingYards / stats.RushingAttempts;
      rating += Math.min(15, yardsPerCarry * 3); // 0-15 points for YPC

      const tdRate = stats.RushingTouchdowns / stats.RushingAttempts;
      rating += Math.min(10, tdRate * 100); // 0-10 points for TD rate
    }

    // Receiving bonus
    if (stats.ReceivingTargets > 0) {
      const catchRate = stats.Receptions / stats.ReceivingTargets;
      rating += catchRate * 5; // 0-5 points for catch rate

      if (stats.ReceivingYards > 0) {
        rating += Math.min(5, stats.ReceivingYards / 100); // 0-5 points for receiving yards
      }
    }

    return rating;
  }

  /**
   * Calculate WR rating based on receiving stats
   */
  private calculateWRRating(stats: PlayerStats): number {
    let rating = 70;

    if (stats.ReceivingTargets > 0) {
      const catchRate = stats.Receptions / stats.ReceivingTargets;
      rating += catchRate * 10; // 0-10 points for catch rate

      if (stats.ReceivingYards > 0) {
        const yardsPerTarget = stats.ReceivingYards / stats.ReceivingTargets;
        rating += Math.min(15, yardsPerTarget * 0.3); // 0-15 points for yards per target
      }

      const tdRate = stats.ReceivingTouchdowns / stats.ReceivingTargets;
      rating += Math.min(10, tdRate * 100); // 0-10 points for TD rate
    }

    return rating;
  }

  /**
   * Calculate TE rating based on receiving stats
   */
  private calculateTERating(stats: PlayerStats): number {
    // Similar to WR but with slightly different weights
    return this.calculateWRRating(stats);
  }

  /**
   * Calculate K rating based on kicking stats
   */
  private calculateKRating(stats: PlayerStats): number {
    let rating = 70;

    if (stats.FieldGoalsAttempted > 0) {
      const accuracy = stats.FieldGoalsMade / stats.FieldGoalsAttempted;
      rating += accuracy * 20; // 0-20 points for accuracy

      // Bonus for long field goals
      rating += Math.min(10, stats.FieldGoalsMade50Plus * 2); // 0-10 points for 50+ yard FGs
    }

    return rating;
  }

  /**
   * Calculate defense rating based on defensive stats
   */
  private calculateDefenseRating(stats: PlayerStats): number {
    let rating = 70;

    // Tackles
    const totalTackles = stats.SoloTackles + stats.AssistedTackles;
    rating += Math.min(10, totalTackles / 5); // 0-10 points for tackles

    // Sacks
    rating += Math.min(10, stats.Sacks * 2); // 0-10 points for sacks

    // Interceptions
    rating += Math.min(10, stats.Interceptions * 3); // 0-10 points for INTs

    // Passes defended
    rating += Math.min(5, stats.PassesDefended); // 0-5 points for PDs

    return rating;
  }

  /**
   * Calculate market value based on overall rating and performance
   */
  private calculateMarketValue(
    player: SportsPlayer,
    stats?: PlayerStats,
    overall?: number
  ): number {
    if (!overall) overall = 70;

    let baseValue = overall * 10000; // Base value: $10k per overall point

    // Position multipliers
    const positionMultipliers: Record<string, number> = {
      QB: 1.5,
      RB: 1.3,
      WR: 1.2,
      TE: 1.1,
      K: 0.5,
      DEF: 0.8,
      DL: 0.9,
      LB: 0.9,
      DB: 0.8,
    };

    const multiplier = positionMultipliers[player.Position] || 1.0;
    baseValue *= multiplier;

    // Performance bonus
    if (stats) {
      const fantasyPoints = stats.FantasyPoints || 0;
      baseValue += fantasyPoints * 100; // $100 per fantasy point
    }

    // Experience bonus/penalty
    if (player.Experience > 8) {
      baseValue *= 0.8; // Veterans get slight discount
    } else if (player.Experience < 3) {
      baseValue *= 1.2; // Young players get premium
    }

    return Math.round(baseValue);
  }

  /**
   * Check if all data has been loaded
   */
  public isDataLoaded(): boolean {
    const teamsLoaded = this._teams().length > 0;
    const playersLoaded = this._players().length > 0;
    const statsLoaded = this._playerStats().length >= 0; // Allow empty stats array
    const enhancedLoaded = this._enhancedPlayers().length > 0;

    console.log('SportsDataService data loading status:', {
      teams: teamsLoaded,
      players: playersLoaded,
      stats: statsLoaded,
      enhanced: enhancedLoaded,
      teamsCount: this._teams().length,
      playersCount: this._players().length,
      statsCount: this._playerStats().length,
      enhancedCount: this._enhancedPlayers().length,
    });

    // We consider data loaded if we have teams, players, and enhanced players
    // Stats are optional (can be empty array)
    return teamsLoaded && playersLoaded && enhancedLoaded;
  }

  /**
   * Get all active players (not retired/inactive)
   */
  public getActivePlayers(): EnhancedSportsPlayer[] {
    const allPlayers = this._enhancedPlayers();
    console.log('SportsDataService.getActivePlayers() called');
    console.log('Total enhanced players:', allPlayers.length);
    console.log('Data loaded status:', this.isDataLoaded());

    if (!this.isDataLoaded()) {
      console.warn(
        'SportsDataService: Data not fully loaded yet, returning empty array'
      );
      return [];
    }

    // Debug: Check Active property values in enhanced players
    const activeCount = allPlayers.filter((p) => p.Active).length;
    const inactiveCount = allPlayers.filter((p) => !p.Active).length;
    console.log('SportsDataService: Enhanced Player Active status:', {
      activeCount,
      inactiveCount,
      totalPlayers: allPlayers.length,
    });

    // Debug: Show first few players and their Active status
    const firstFewPlayers = allPlayers.slice(0, 5);
    console.log(
      'SportsDataService: First few players Active status:',
      firstFewPlayers.map((p) => ({
        name: p.Name,
        position: p.Position,
        active: p.Active,
        team: p.Team,
      }))
    );

    const activePlayers = allPlayers.filter((player) => player.Active);
    console.log('Active players count:', activePlayers.length);
    console.log('First few active players:', activePlayers.slice(0, 3));

    return activePlayers;
  }

  /**
   * Get players by position
   */
  public getPlayersByPosition(position: string): EnhancedSportsPlayer[] {
    return this._enhancedPlayers().filter(
      (p) => p.Position === position && p.Active
    );
  }

  /**
   * Get player by ID
   */
  public getPlayerById(playerId: number): EnhancedSportsPlayer | undefined {
    return this._enhancedPlayers().find((p) => p.PlayerID === playerId);
  }

  /**
   * Get team by key
   */
  public getTeamByKey(teamKey: string): SportsTeam | undefined {
    return this._teams().find((t) => t.Key === teamKey);
  }

  /**
   * Search players by name
   */
  public searchPlayers(query: string): EnhancedSportsPlayer[] {
    const searchTerm = query.toLowerCase();
    return this._enhancedPlayers().filter(
      (p) =>
        p.Active &&
        (p.FirstName.toLowerCase().includes(searchTerm) ||
          p.LastName.toLowerCase().includes(searchTerm) ||
          p.Name.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get top players by overall rating
   */
  public getTopPlayers(limit: number = 50): EnhancedSportsPlayer[] {
    return this._enhancedPlayers()
      .filter((p) => p.Active && p.overall)
      .sort((a, b) => (b.overall || 0) - (a.overall || 0))
      .slice(0, limit);
  }

  /**
   * Get players by fantasy position
   */
  public getPlayersByFantasyPosition(
    fantasyPosition: string
  ): EnhancedSportsPlayer[] {
    return this._enhancedPlayers().filter(
      (p) => p.Active && p.FantasyPosition === fantasyPosition
    );
  }
}
