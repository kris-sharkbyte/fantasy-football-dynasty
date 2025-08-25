import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
  Observable,
  interval,
  switchMap,
  takeWhile,
  firstValueFrom,
} from 'rxjs';
import {
  DraftState,
  DraftSettings,
  DraftPick,
  Player,
  AutodraftQueue,
  PlayerRights,
} from '../../../../../libs/types/src/lib/types';

@Injectable({
  providedIn: 'root',
})
export class DraftService {
  // Signals for reactive UI - no more subjects!
  draftState = signal<DraftState | null>(null);
  isConnected = signal<boolean>(false);
  currentPick = signal<number>(1);
  timeRemaining = signal<number>(0);
  isMyTurn = signal<boolean>(false);
  currentTeam = signal<string | null>(null);

  private readonly functions = inject(Functions);

  /**
   * Initialize a new draft
   */
  async initializeDraft(
    leagueId: string,
    settings: DraftSettings
  ): Promise<{ success: boolean; draftId: string }> {
    try {
      const response = await this.callFunction('initializeDraft', {
        leagueId,
        settings,
      });

      if (response.success) {
        // Start listening to draft updates
        this.connectToDraft(leagueId);
      }

      return response;
    } catch (error) {
      console.error('Error initializing draft:', error);
      throw error;
    }
  }

  /**
   * Make a draft pick
   */
  async makeDraftPick(
    leagueId: string,
    playerId: string,
    teamId: string
  ): Promise<{ success: boolean }> {
    try {
      const response = await this.callFunction('makeDraftPick', {
        leagueId,
        playerId,
        teamId,
      });

      return response;
    } catch (error) {
      console.error('Error making draft pick:', error);
      throw error;
    }
  }

  /**
   * Update autodraft queue
   */
  async updateAutodraftQueue(
    leagueId: string,
    teamId: string,
    playerIds: string[]
  ): Promise<{ success: boolean }> {
    try {
      const response = await this.callFunction('updateAutodraftQueue', {
        leagueId,
        teamId,
        playerIds,
      });

      return response;
    } catch (error) {
      console.error('Error updating autodraft queue:', error);
      throw error;
    }
  }

  /**
   * Pause or resume draft
   */
  async pauseDraft(
    leagueId: string,
    isPaused: boolean
  ): Promise<{ success: boolean }> {
    try {
      const response = await this.callFunction('pauseDraft', {
        leagueId,
        isPaused,
      });

      return response;
    } catch (error) {
      console.error('Error pausing/resuming draft:', error);
      throw error;
    }
  }

  /**
   * Connect to real-time draft updates
   */
  connectToDraft(leagueId: string): void {
    // In a real implementation, this would use Firestore real-time listeners
    // For now, we'll simulate with polling

    this.isConnected.set(true);

    // Poll for draft state updates every 2 seconds
    interval(2000)
      .pipe(
        switchMap(() => this.getDraftState(leagueId)),
        takeWhile(() => this.isConnected())
      )
      .subscribe({
        next: (draftState) => {
          if (draftState) {
            this.updateDraftState(draftState);
          }
        },
        error: (error) => {
          console.error('Error getting draft state:', error);
          this.disconnect();
        },
      });
  }

  /**
   * Disconnect from draft updates
   */
  disconnect(): void {
    this.isConnected.set(false);
    this.draftState.set(null);
  }

  /**
   * Get current draft state
   */
  private async getDraftState(leagueId: string): Promise<DraftState | null> {
    try {
      // This would typically be a Firestore listener
      // For now, we'll simulate getting the state
      const response = await this.callFunction('getDraftState', { leagueId });
      return response.draftState;
    } catch (error) {
      console.error('Error getting draft state:', error);
      return null;
    }
  }

  /**
   * Update local draft state and signals
   */
  private updateDraftState(draftState: DraftState): void {
    this.draftState.set(draftState);
    this.currentPick.set(draftState.currentPick);
    this.timeRemaining.set(draftState.timeRemaining);
    this.currentTeam.set(draftState.currentTeamId);

    // Determine if it's the current user's turn
    // This would need to be enhanced with proper team/user mapping
    // For now, we'll just update the signal
    this.isMyTurn.set(!draftState.isPaused && !draftState.isComplete);
  }

  /**
   * Get available players for drafting
   */
  async getAvailablePlayers(
    leagueId: string,
    filters?: {
      position?: string;
      search?: string;
      limit?: number;
    }
  ): Promise<Player[]> {
    try {
      // Get all players
      const playersResponse = await this.callFunction('searchPlayers', {
        query: filters?.search,
        position: filters?.position,
        limit: filters?.limit || 100,
      });

      // Get drafted players to filter out
      const draftedResponse = await this.callFunction('getDraftedPlayers', {
        leagueId,
      });
      const draftedPlayerIds = new Set(draftedResponse.playerIds || []);

      // Filter out drafted players
      return playersResponse.players.filter(
        (player: Player) => !draftedPlayerIds.has(player.id)
      );
    } catch (error) {
      console.error('Error getting available players:', error);
      return [];
    }
  }

  /**
   * Get draft picks for a league
   */
  async getDraftPicks(leagueId: string): Promise<DraftPick[]> {
    try {
      const response = await this.callFunction('getDraftPicks', { leagueId });
      return response.picks || [];
    } catch (error) {
      console.error('Error getting draft picks:', error);
      return [];
    }
  }

  /**
   * Get team's autodraft queue
   */
  async getAutodraftQueue(leagueId: string, teamId: string): Promise<string[]> {
    try {
      const response = await this.callFunction('getAutodraftQueue', {
        leagueId,
        teamId,
      });
      return response.playerIds || [];
    } catch (error) {
      console.error('Error getting autodraft queue:', error);
      return [];
    }
  }

  /**
   * Get player rights for negotiation
   */
  async getPlayerRights(
    leagueId: string,
    teamId?: string
  ): Promise<PlayerRights[]> {
    try {
      const response = await this.callFunction('getPlayerRights', {
        leagueId,
        teamId,
      });
      return response.rights || [];
    } catch (error) {
      console.error('Error getting player rights:', error);
      return [];
    }
  }

  /**
   * Calculate draft position info
   */
  getDraftPositionInfo(draftState: DraftState, pickNumber: number) {
    if (!draftState) return null;

    const teamsCount = draftState.draftOrder.length;
    const round = Math.ceil(pickNumber / teamsCount);
    const positionInRound = ((pickNumber - 1) % teamsCount) + 1;

    // Snake draft logic for actual position
    let actualPosition: number;
    if (round % 2 === 1) {
      actualPosition = positionInRound;
    } else {
      actualPosition = teamsCount - positionInRound + 1;
    }

    const teamId = draftState.draftOrder[actualPosition - 1];

    return {
      round,
      position: actualPosition,
      teamId,
      overall: pickNumber,
    };
  }

  /**
   * Format time remaining for display
   */
  formatTimeRemaining(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Helper method to call Firebase Functions
   */
  private async callFunction(functionName: string, data: any): Promise<any> {
    try {
      const callable = httpsCallable(this.functions, functionName);
      const result = await callable(data);
      return result.data;
    } catch (error) {
      console.error(`Error calling function ${functionName}:`, error);
      throw error;
    }
  }

  /**
   * Get draft statistics
   */
  getDraftStats(draftState: DraftState) {
    if (!draftState) return null;

    const totalPicks =
      draftState.draftOrder.length * draftState.settings.rounds;
    const completedPicks = draftState.completedPicks.length;
    const remainingPicks = totalPicks - completedPicks;
    const currentRound = Math.ceil(
      draftState.currentPick / draftState.draftOrder.length
    );
    const progressPercentage = (completedPicks / totalPicks) * 100;

    return {
      totalPicks,
      completedPicks,
      remainingPicks,
      currentRound,
      totalRounds: draftState.settings.rounds,
      progressPercentage,
    };
  }

  /**
   * Check if a team can make a pick
   */
  canMakePick(draftState: DraftState, teamId: string): boolean {
    return (
      !draftState.isPaused &&
      !draftState.isComplete &&
      draftState.currentTeamId === teamId &&
      draftState.timeRemaining > 0
    );
  }
}
