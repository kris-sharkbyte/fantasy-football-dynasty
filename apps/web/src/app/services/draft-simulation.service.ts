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
import { LeagueService } from './league.service';
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  getFirestore,
} from '@angular/fire/firestore';

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
  private readonly leagueService = inject(LeagueService);
  private readonly db = getFirestore();

  private _draftState = signal<DraftSimulationState | null>(null);
  private _draftSettings = signal<DraftSimulationSettings | null>(null);
  private _isSimulating = signal(false);
  private _error = signal<string | null>(null);
  private _progress = signal<{
    current: number;
    total: number;
    percentage: number;
  }>({ current: 0, total: 0, percentage: 0 });

  // Public readonly signals
  public draftState = this._draftState.asReadonly();
  public draftSettings = this._draftSettings.asReadonly();
  public isSimulating = this._isSimulating.asReadonly();
  public error = this._error.asReadonly();
  public progress = this._progress.asReadonly();
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

      const currentTeam = settings.teams[state.currentTeamIndex];
      if (!currentTeam) {
        throw new Error('Current team not found');
      }

      // Get player data
      const player = this.playerDataService.getPlayer(playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      const pick: DraftPick = {
        pickNumber: state.currentPick,
        teamId: currentTeam.id,
        playerId,
        player,
        position: player.fantasy_positions[0] as Position,
        timestamp: new Date(),
      };

      // Add player to team roster in the unified members structure
      await this.addPlayerToMemberRoster(
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
   * Simulate a complete draft for a league
   * This method automatically runs the full draft and saves players to team rosters
   */
  async simulateDraft(leagueId: string): Promise<void> {
    try {
      this._isSimulating.set(true);
      this._error.set(null);

      console.log(`Starting draft simulation for league: ${leagueId}`);

      // Ensure players are loaded
      console.log('Checking if players are loaded...');
      if (!this.playerDataService.hasPlayers()) {
        console.log('Players not loaded, loading now...');
        await this.playerDataService.loadPlayers();
        console.log('Players loaded successfully');
      } else {
        console.log('Players already loaded');
      }

      // Verify players were loaded
      const playerCount = Object.keys(this.playerDataService.players()).length;
      console.log(`Total players available: ${playerCount}`);

      if (playerCount === 0) {
        throw new Error('No players loaded from players-nfl.json');
      }

      // Get league teams from the unified members structure
      const { teams } = await this.leagueService.getLeagueTeams(leagueId);

      if (teams.length === 0) {
        throw new Error('No teams found for this league');
      }

      console.log(`Found ${teams.length} teams for draft simulation`);

      // Get league rules for roster requirements
      const leagueResult = await this.leagueService.getLeague(leagueId);
      const leagueRules = leagueResult?.league?.rules;

      // Create draft settings
      const settings: DraftSimulationSettings = {
        rounds: this.calculateDraftRounds(teams.length, leagueRules),
        teams,
        snakeOrder: true, // Default to snake draft
        timeLimit: 0, // No time limit for simulation
        allowTrades: false, // No trades during simulation
      };

      this._draftSettings.set(settings);

      // Initialize draft state
      const draftState: DraftSimulationState = {
        currentRound: 1,
        currentPick: 1,
        currentTeamIndex: 0,
        completedPicks: [],
        isComplete: false,
        startTime: new Date(),
      };

      this._draftState.set(draftState);

      console.log(`Draft simulation started with ${settings.rounds} rounds`);

      // Run the complete draft simulation
      await this.runCompleteDraft();

      console.log('Draft simulation completed successfully');
    } catch (error) {
      console.error('Error in draft simulation:', error);
      this._error.set(
        error instanceof Error ? error.message : 'Failed to simulate draft'
      );
      throw error;
    } finally {
      this._isSimulating.set(false);
    }
  }

  /**
   * Run the complete draft simulation automatically
   */
  private async runCompleteDraft(): Promise<void> {
    const state = this._draftState();
    const settings = this._draftSettings();

    if (!state || !settings) {
      throw new Error('Draft not properly initialized');
    }

    const totalPicks = settings.rounds * settings.teams.length;
    let currentPick = 1;

    // Initialize progress
    this._progress.set({ current: 0, total: totalPicks, percentage: 0 });

    console.log(`Running ${totalPicks} picks automatically...`);

    while (currentPick <= totalPicks && !state.isComplete) {
      // Auto-pick for current team
      await this.autoPick();

      // Update progress
      const percentage = Math.round((currentPick / totalPicks) * 100);
      this._progress.set({
        current: currentPick,
        total: totalPicks,
        percentage,
      });

      // Update pick counter
      currentPick++;

      // Small delay to prevent overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Mark draft as complete and set progress to 100%
    if (state) {
      const updatedState = { ...state, isComplete: true, endTime: new Date() };
      this._draftState.set(updatedState);
      this._progress.set({
        current: totalPicks,
        total: totalPicks,
        percentage: 100,
      });
    }

    console.log('Complete draft simulation finished');
  }

  /**
   * Calculate number of draft rounds based on league rules and team count
   */
  private calculateDraftRounds(teamCount: number, leagueRules?: any): number {
    if (!leagueRules?.roster?.positionRequirements) {
      // Default: 20 rounds for basic roster
      return 20;
    }

    const requirements = leagueRules.roster.positionRequirements;
    const totalRequiredPlayers = Object.values(requirements).reduce(
      (sum: number, req: any) => sum + req,
      0
    );

    // Add some buffer for bench players and flexibility
    const totalRounds = Math.ceil(totalRequiredPlayers / teamCount) + 2;

    console.log(
      `Calculated ${totalRounds} draft rounds based on roster requirements`
    );
    return totalRounds;
  }

  /**
   * Calculate position priority for a team based on current roster
   */
  private calculatePositionPriority(
    rosterStats: any,
    leagueRules?: any
  ): Position[] {
    const { playersByPosition } = rosterStats;

    console.log('Debug - Position Priority Calculation:', {
      rosterStats,
      leagueRules: leagueRules?.roster?.positionRequirements,
      playersByPosition,
    });

    // Use league rules if available, otherwise fall back to defaults
    const requirements = leagueRules?.roster?.positionRequirements || {
      QB: 2,
      RB: 4,
      WR: 6,
      TE: 2,
      K: 1,
      DEF: 1,
    };

    console.log('Debug - Using requirements:', requirements);

    // Calculate deficit for each position
    const deficits: { position: Position; deficit: number }[] = Object.entries(
      requirements
    ).map(([pos, req]) => ({
      position: pos as Position,
      deficit: Math.max(0, (req as number) - (playersByPosition[pos] || 0)),
    }));

    console.log('Debug - Calculated deficits:', deficits);

    // Sort by deficit (highest first)
    deficits.sort((a, b) => b.deficit - a.deficit);

    const result = deficits.map((d) => d.position);
    console.log('Debug - Final position priority:', result);

    return result;
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

    console.log('Debug - Player Selection:', {
      totalPlayers: allPlayers.length,
      completedPicks: completedPicks.length,
      draftedPlayerIds: Array.from(draftedPlayerIds),
      positionPriority,
    });

    // Filter out already drafted players and players with invalid position data
    const availablePlayers = allPlayers.filter((p) => {
      // Must not be already drafted
      if (draftedPlayerIds.has(p.player_id)) {
        return false;
      }

      // Must have valid fantasy positions array
      if (
        !p.fantasy_positions ||
        !Array.isArray(p.fantasy_positions) ||
        p.fantasy_positions.length === 0
      ) {
        return false;
      }

      // Must have valid position data (not null/undefined)
      if (!p.fantasy_positions.some((pos) => pos && typeof pos === 'string')) {
        return false;
      }

      return true;
    });

    console.log('Debug - Available Players:', {
      availableCount: availablePlayers.length,
      firstFewPlayers: availablePlayers.slice(0, 3).map((p) => ({
        id: p.player_id,
        name: `${p.first_name} ${p.last_name}`,
        position: p.fantasy_positions,
        searchRank: p.search_rank,
      })),
    });

    // Try to find players for each position in priority order
    for (const position of positionPriority) {
      console.log(`Debug - Looking for ${position} players...`);

      const positionPlayers = availablePlayers.filter((p) => {
        // Double-check that fantasy_positions exists and is an array
        return (
          p.fantasy_positions &&
          Array.isArray(p.fantasy_positions) &&
          p.fantasy_positions.includes(position)
        );
      });

      console.log(
        `Debug - Found ${positionPlayers.length} ${position} players`
      );

      if (positionPlayers.length > 0) {
        // Sort by search rank (lower is better) and return best available
        positionPlayers.sort(
          (a, b) => (a.search_rank || 999) - (b.search_rank || 999)
        );

        const selectedPlayer = positionPlayers[0];
        console.log(`Debug - Selected ${position} player:`, {
          id: selectedPlayer.player_id,
          name: `${selectedPlayer.first_name} ${selectedPlayer.last_name}`,
          searchRank: selectedPlayer.search_rank,
        });

        return selectedPlayer;
      }
    }

    // If no players found for priority positions, return any available player
    if (availablePlayers.length > 0) {
      console.log(
        'Debug - No position-specific players found, selecting any available player'
      );
      availablePlayers.sort(
        (a, b) => (a.search_rank || 999) - (b.search_rank || 999)
      );

      const fallbackPlayer = availablePlayers[0];
      console.log('Debug - Fallback player selected:', {
        id: fallbackPlayer.player_id,
        name: `${fallbackPlayer.first_name} ${fallbackPlayer.last_name}`,
        position: fallbackPlayer.fantasy_positions,
        searchRank: fallbackPlayer.search_rank,
      });

      return fallbackPlayer;
    }

    console.log('Debug - No players available at all!');
    console.log(
      'Debug - This should not happen if players were loaded correctly'
    );
    console.log(
      'Debug - Check if PlayerDataService.players() is returning data'
    );
    return null;
  }

  /**
   * Add player to member roster in the unified structure
   */
  private async addPlayerToMemberRoster(
    teamId: string,
    playerId: string,
    position: Position,
    status: 'active' | 'bench' | 'ir' | 'taxi' = 'active'
  ): Promise<void> {
    try {
      // Find the member document that contains this team
      const leaguesRef = collection(this.db, 'leagues');
      const leaguesSnapshot = await getDocs(leaguesRef);

      for (const leagueDoc of leaguesSnapshot.docs) {
        const membersRef = collection(
          this.db,
          'leagues',
          leagueDoc.id,
          'members'
        );
        const membersSnapshot = await getDocs(membersRef);

        for (const memberDoc of membersSnapshot.docs) {
          const memberData = memberDoc.data();
          if (memberData['teamId'] === teamId) {
            // Found the member, update their roster
            const newRosterSlot = {
              id: `${playerId}-${Date.now()}`,
              teamId,
              playerId,
              position,
              status,
              activeFrom: new Date(),
            };

            const updatedRoster = [
              ...(memberData['roster'] || []),
              newRosterSlot,
            ];

            await updateDoc(memberDoc.ref, {
              roster: updatedRoster,
            });

            console.log(`Added player ${playerId} to team ${teamId} roster`);
            return;
          }
        }
      }

      throw new Error(`Team ${teamId} not found in any league members`);
    } catch (error) {
      console.error('Error adding player to member roster:', error);
      throw error;
    }
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
        picksByPosition: {
          QB: 0,
          RB: 0,
          WR: 0,
          TE: 0,
          K: 0,
          DEF: 0,
          DL: 0,
          LB: 0,
          DB: 0,
        },
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
      DL: 0,
      LB: 0,
      DB: 0,
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
