import { computed, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, combineLatest, shareReplay } from 'rxjs';
import {
  SportsTeam,
  SportsPlayer,
  PlayerStats,
  EnhancedSportsPlayer,
} from '@fantasy-football-dynasty/types';
import {
  PlayerRatingService,
  PlayerRatingContext,
} from '@fantasy-football-dynasty/domain';

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

  activePlayers = computed(() =>
    this._players().filter((player) => player.Status == 'Active')
  );

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
      await Promise.all([
        this.loadTeams(),
        this.loadPlayers(),
        this.loadPlayerStats(),
      ]);
      this.createEnhancedPlayers();
      this._dataReady.set(true);
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

      if (stats && Array.isArray(stats)) {
        this._playerStats.set(stats);
      } else {
        // Set empty array to prevent blocking the rest of the system
        this._playerStats.set([]);
      }
    } catch (error) {
      console.error('Error loading player stats:', error);

      // If it's a timeout, try to load a smaller subset or handle gracefully
      if (error instanceof Error && error.message.includes('timeout')) {
        // Set empty array to prevent blocking the rest of the system
        this._playerStats.set([]);
      }
    }
  }

  getPlayer(playerId: number): SportsPlayer | undefined {
    return this._players().find((p) => p.PlayerID === playerId);
  }

  /**
   * Calculate age from birth date
   */
  private calculateAge(birthDate: string): number {
    if (!birthDate) return 25; // Default age if no birth date

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
      return 25; // Default age on error
    }
  }

  /**
   * Create enhanced players by combining player data with stats and team info
   */
  private createEnhancedPlayers(): void {
    const players = this._players();
    const stats = this._playerStats();
    const teams = this._teams();

    // If no stats are available, create players with default values
    if (!stats || stats.length === 0) {
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

        // Calculate age from birth date
        const age = this.calculateAge(player.BirthDate);

        return {
          ...player,
          Active: isActive, // Override the Active property based on Status
          stats: undefined,
          teamInfo,
          overall,
          marketValue,
          fantasyPoints: 0,
          fantasyPointsPPR: 0,
          Age: age, // Set calculated age
        };
      });

      this._enhancedPlayers.set(enhancedPlayers);
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

      // Calculate age from birth date
      const age = this.calculateAge(player.BirthDate);

      return {
        ...player,
        Active: isActive, // Override the Active property based on Status
        stats: playerStats,
        teamInfo,
        overall,
        marketValue,
        fantasyPoints: playerStats?.FantasyPoints || 0,
        fantasyPointsPPR: playerStats?.FantasyPointsPPR || 0,
        Age: age, // Set calculated age
      };
    });

    this._enhancedPlayers.set(enhancedPlayers);
  }

  /**
   * Calculate player overall rating based on stats and position
   */
  private calculatePlayerOverall(
    player: SportsPlayer,
    stats?: PlayerStats
  ): number {
    if (!stats) return 70; // Default rating for players without stats

    // Use the new PlayerRatingService for more accurate ratings
    const context: PlayerRatingContext = {
      position: player.Position,
      experience: player.Experience,
      age: this.calculateAge(player.BirthDate),
      fantasyPoints: stats.FantasyPoints || 0,
      fantasyPointsPPR: stats.FantasyPointsPPR || 0,
      gamesPlayed: stats.Played || 0,
      gamesStarted: stats.Started || 0,
    };

    return PlayerRatingService.calculateOverallRating(stats, context);
  }

  // Position-specific rating methods removed - now handled by PlayerRatingService

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

    // We consider data loaded if we have teams, players, and enhanced players
    // Stats are optional (can be empty array)
    return teamsLoaded && playersLoaded && enhancedLoaded;
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
