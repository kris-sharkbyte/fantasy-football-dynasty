import { Injectable, signal, computed } from '@angular/core';
import { Position } from '@fantasy-football-dynasty/types';

export interface SleeperPlayer {
  hashtag: string;
  depth_chart_position: number;
  status: string;
  sport: string;
  fantasy_positions: string[];
  number: number;
  search_last_name: string;
  injury_start_date: string | null;
  weight: string;
  position: string;
  practice_participation: string | null;
  sportradar_id: string;
  team: string;
  last_name: string;
  college: string;
  fantasy_data_id: number;
  injury_status: string | null;
  player_id: string;
  height: string;
  search_full_name: string;
  age: number;
  stats_id: string;
  birth_country: string;
  espn_id: string;
  search_rank: number;
  first_name: string;
  depth_chart_order: number;
  years_exp: number;
  rotowire_id: string | null;
  rotoworld_id: number | null;
  search_first_name: string;
  yahoo_id: string | null;
}

export interface PlayerSearchFilters {
  position?: Position;
  team?: string;
  age?: { min?: number; max?: number };
  yearsExp?: { min?: number; max?: number };
  status?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PlayerDataService {
  private _players = signal<Record<string, SleeperPlayer>>({});
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  public players = this._players.asReadonly();
  public isLoading = this._isLoading.asReadonly();
  public error = this._error.asReadonly();
  public hasPlayers = computed(() => Object.keys(this._players()).length > 0);

  /**
   * Load all players from the Sleeper JSON file
   */
  async loadPlayers(): Promise<void> {
    try {
      this._isLoading.set(true);
      this._error.set(null);

      // Load the players JSON file
      const response = await fetch('/players-nfl.json');
      if (!response.ok) {
        throw new Error('Failed to load players data');
      }

      const playersData: Record<string, SleeperPlayer> = await response.json();
      this._players.set(playersData);
    } catch (error) {
      console.error('Error loading players:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to load players'
      );
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Get a specific player by ID
   */
  getPlayer(playerId: string): SleeperPlayer | null {
    return this._players()[playerId] || null;
  }

  /**
   * Search players with filters
   */
  searchPlayers(filters: PlayerSearchFilters = {}): SleeperPlayer[] {
    const allPlayers = Object.values(this._players());
    
    return allPlayers.filter(player => {
      // Position filter
      if (filters.position && !player.fantasy_positions.includes(filters.position)) {
        return false;
      }

      // Team filter
      if (filters.team && player.team !== filters.team) {
        return false;
      }

      // Age filter
      if (filters.age) {
        if (filters.age.min !== undefined && player.age < filters.age.min) {
          return false;
        }
        if (filters.age.max !== undefined && player.age > filters.age.max) {
          return false;
        }
      }

      // Years experience filter
      if (filters.yearsExp) {
        if (filters.yearsExp.min !== undefined && player.years_exp < filters.yearsExp.min) {
          return false;
        }
        if (filters.yearsExp.max !== undefined && player.years_exp > filters.yearsExp.max) {
          return false;
        }
      }

      // Status filter
      if (filters.status && player.status !== filters.status) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get players by position
   */
  getPlayersByPosition(position: Position): SleeperPlayer[] {
    return this.searchPlayers({ position });
  }

  /**
   * Get players by team
   */
  getPlayersByTeam(team: string): SleeperPlayer[] {
    return this.searchPlayers({ team });
  }

  /**
   * Get available free agents (players without a team)
   */
  getFreeAgents(): SleeperPlayer[] {
    return this.searchPlayers({ team: 'FA' });
  }

  /**
   * Get rookie players (0 years experience)
   */
  getRookies(): SleeperPlayer[] {
    return this.searchPlayers({ yearsExp: { min: 0, max: 0 } });
  }

  /**
   * Get veteran players (1+ years experience)
   */
  getVeterans(): SleeperPlayer[] {
    return this.searchPlayers({ yearsExp: { min: 1 } });
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Refresh players data
   */
  async refresh(): Promise<void> {
    await this.loadPlayers();
  }
}
