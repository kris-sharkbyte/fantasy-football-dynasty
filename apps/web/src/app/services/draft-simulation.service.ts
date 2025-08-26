import { Injectable, signal, computed, inject } from '@angular/core';
import {
  Team,
  Position,
  DraftClass,
  DraftClassConfig,
  PlayerRights,
} from '@fantasy-football-dynasty/types';
import { PlayerDataService, SleeperPlayer } from './player-data.service';
import { TeamService } from './team.service';

export interface DraftSimulationSettings {
  rounds: number;
  teams: Team[];
  snakeOrder: boolean;
  timeLimit: number;
  allowTrades: boolean;
}

export interface DraftPick {
  pickNumber: number;
  teamId: string;
  playerId: string;
  player: SleeperPlayer;
  position: Position;
  timestamp: Date;
}

export interface DraftSimulationState {
  currentRound: number;
  currentPick: number;
  currentTeamIndex: number;
  completedPicks: DraftPick[];
  isComplete: boolean;
  startTime: Date;
  endTime?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class DraftSimulationService {
  private readonly playerDataService = inject(PlayerDataService);
  private readonly teamService = inject(TeamService);

  private _draftState = signal<DraftSimulationState | null>(null);
  private _draftSettings = signal<DraftSimulationSettings | null>(null);
  private _isSimulating = signal(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  public draftState = this._draftState.asReadonly();
  public draftSettings = this._draftSettings.asReadonly();
  public isSimulating = this._isSimulating.asReadonly();
  public error = this._error.asReadonly();
  public isDraftActive = computed(
    () => this._draftState() !== null && !this._draftState()?.isComplete
  );

  /**
   * Start a new draft simulation
   */
  async startDraftSimulation(settings: DraftSimulationSettings): Promise<void> {
    try {
      this._isSimulating.set(true);
      this._error.set(null);

      // Ensure players are loaded
      if (!this.playerDataService.hasPlayers()) {
        await this.playerDataService.loadPlayers();
      }

      this._draftSettings.set(settings);

      const draftState: DraftSimulationState = {
        currentRound: 1,
        currentPick: 1,
        currentTeamIndex: 0,
        completedPicks: [],
        isComplete: false,
        startTime: new Date(),
      };

      this._draftState.set(draftState);
    } catch (error) {
      console.error('Error starting draft simulation:', error);
      this._error.set(
        error instanceof Error
          ? error.message
          : 'Failed to start draft simulation'
      );
    } finally {
      this._isSimulating.set(false);
    }
  }

  /**
   * Make a draft pick
   */
  async makePick(playerId: string): Promise<void> {
    try {
      const state = this._draftState();
      const settings = this._draftSettings();

      if (!state || !settings || state.isComplete) {
        throw new Error('No active draft simulation');
      }

      const player = this.playerDataService.getPlayer(playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      const currentTeam = settings.teams[state.currentTeamIndex];
      if (!currentTeam) {
        throw new Error('Current team not found');
      }

      // Create draft pick
      const pick: DraftPick = {
        pickNumber: state.currentPick,
        teamId: currentTeam.id,
        playerId,
        player,
        position: player.fantasy_positions[0] as Position,
        timestamp: new Date(),
      };

      // Add player to team roster
      await this.teamService.addPlayerToRoster(
        currentTeam.id,
        playerId,
        pick.position,
        'active'
      );

      // Update draft state
      const updatedState: DraftSimulationState = {
        ...state,
        completedPicks: [...state.completedPicks, pick],
        currentPick: state.currentPick + 1,
      };

      // Check if round is complete
      if (state.currentTeamIndex === settings.teams.length - 1) {
        updatedState.currentRound++;
        updatedState.currentTeamIndex = 0;

        // Check if draft is complete
        if (updatedState.currentRound > settings.rounds) {
          updatedState.isComplete = true;
          updatedState.endTime = new Date();
        }
      } else {
        updatedState.currentTeamIndex++;
      }

      this._draftState.set(updatedState);
    } catch (error) {
      console.error('Error making draft pick:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to make draft pick'
      );
    }
  }

  /**
   * Auto-pick for a team (selects best available player by position need)
   */
  async autoPick(): Promise<void> {
    try {
      const state = this._draftState();
      const settings = this._draftSettings();

      if (!state || !settings || state.isComplete) {
        throw new Error('No active draft simulation');
      }

      const currentTeam = settings.teams[state.currentTeamIndex];
      if (!currentTeam) {
        throw new Error('Current team not found');
      }

      // Get team's current roster
      const rosterStats = this.teamService.getRosterStats(currentTeam);

      // Determine position priority based on current roster
      const positionPriority = this.calculatePositionPriority(
        rosterStats,
        this._draftSettings()
      );

      // Find best available player for highest priority position
      const bestPlayer = this.findBestAvailablePlayer(positionPriority);

      if (bestPlayer) {
        await this.makePick(bestPlayer.player_id);
      } else {
        throw new Error('No suitable players available for auto-pick');
      }
    } catch (error) {
      console.error('Error auto-picking:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to auto-pick'
      );
    }
  }

  /**
   * Calculate position priority for a team based on current roster
   */
  private calculatePositionPriority(
    rosterStats: any,
    leagueRules?: any
  ): Position[] {
    const { playersByPosition } = rosterStats;

    // Use league rules if available, otherwise fall back to defaults
    const requirements = leagueRules?.roster?.positionRequirements || {
      QB: 2,
      RB: 4,
      WR: 6,
      TE: 2,
      K: 1,
      DEF: 1,
    };

    // Calculate deficit for each position
    const deficits: { position: Position; deficit: number }[] = Object.entries(
      requirements
    ).map(([pos, req]) => ({
      position: pos as Position,
      deficit: Math.max(0, (req as number) - (playersByPosition[pos] || 0)),
    }));

    // Sort by deficit (highest first)
    deficits.sort((a, b) => b.deficit - a.deficit);

    return deficits.map((d) => d.position);
  }

  /**
   * Find best available player for a position
   */
  private findBestAvailablePlayer(
    positionPriority: Position[]
  ): SleeperPlayer | null {
    const allPlayers = Object.values(this.playerDataService.players());
    const completedPicks = this._draftState()?.completedPicks || [];
    const draftedPlayerIds = new Set(completedPicks.map((p) => p.playerId));

    // Filter out already drafted players
    const availablePlayers = allPlayers.filter(
      (p) => !draftedPlayerIds.has(p.player_id)
    );

    // Try to find players for each position in priority order
    for (const position of positionPriority) {
      const positionPlayers = availablePlayers.filter((p) =>
        p.fantasy_positions.includes(position)
      );

      if (positionPlayers.length > 0) {
        // Sort by search rank (lower is better) and return best available
        positionPlayers.sort(
          (a, b) => (a.search_rank || 999) - (b.search_rank || 999)
        );
        return positionPlayers[0];
      }
    }

    // If no players found for priority positions, return any available player
    if (availablePlayers.length > 0) {
      availablePlayers.sort(
        (a, b) => (a.search_rank || 999) - (b.search_rank || 999)
      );
      return availablePlayers[0];
    }

    return null;
  }

  /**
   * Get current draft order
   */
  getCurrentDraftOrder(): string[] {
    const state = this._draftState();
    const settings = this._draftSettings();

    if (!state || !settings) return [];

    const { teams, snakeOrder } = settings;
    const { currentRound } = state;

    if (snakeOrder && currentRound % 2 === 0) {
      // Even rounds go in reverse order
      return [...teams].reverse().map((t) => t.id);
    } else {
      // Odd rounds go in normal order
      return teams.map((t) => t.id);
    }
  }

  /**
   * Get next pick information
   */
  getNextPick(): { teamId: string; pickNumber: number; round: number } | null {
    const state = this._draftState();
    const settings = this._draftSettings();

    if (!state || !settings || state.isComplete) return null;

    const currentTeam = settings.teams[state.currentTeamIndex];
    if (!currentTeam) return null;

    return {
      teamId: currentTeam.id,
      pickNumber: state.currentPick,
      round: state.currentRound,
    };
  }

  /**
   * Get draft statistics
   */
  getDraftStats(): {
    totalPicks: number;
    picksByTeam: Record<string, number>;
    picksByPosition: Record<Position, number>;
    averagePickTime: number;
  } {
    const state = this._draftState();
    if (!state) {
      return {
        totalPicks: 0,
        picksByTeam: {},
        picksByPosition: { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0 },
        averagePickTime: 0,
      };
    }

    const picksByTeam: Record<string, number> = {};
    const picksByPosition: Record<Position, number> = {
      QB: 0,
      RB: 0,
      WR: 0,
      TE: 0,
      K: 0,
      DEF: 0,
    };

    state.completedPicks.forEach((pick) => {
      picksByTeam[pick.teamId] = (picksByTeam[pick.teamId] || 0) + 1;
      picksByPosition[pick.position]++;
    });

    const totalPicks = state.completedPicks.length;
    const averagePickTime =
      totalPicks > 0
        ? (Date.now() - state.startTime.getTime()) / totalPicks
        : 0;

    return {
      totalPicks,
      picksByTeam,
      picksByPosition,
      averagePickTime,
    };
  }

  /**
   * End draft simulation early
   */
  endDraft(): void {
    const state = this._draftState();
    if (state) {
      this._draftState.set({
        ...state,
        isComplete: true,
        endTime: new Date(),
      });
    }
  }

  /**
   * Reset draft simulation
   */
  resetDraft(): void {
    this._draftState.set(null);
    this._draftSettings.set(null);
    this._error.set(null);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }
}
