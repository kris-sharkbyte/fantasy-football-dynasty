import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Team, Position, RosterSlot } from '@fantasy-football-dynasty/types';
import { TeamService, RosterStats } from '../services/team.service';
import {
  PlayerDataService,
  SleeperPlayer,
} from '../services/player-data.service';
import {
  DraftSimulationService,
  DraftSimulationSettings,
} from '../services/draft-simulation.service';
import { AuthService } from '../services/auth.service';
import { TeamSidebarComponent } from './components/team-sidebar/team-sidebar.component';
import { TeamHeaderComponent } from './components/team-header/team-header.component';
import { RosterStatsComponent } from './components/roster-stats/roster-stats.component';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TeamSidebarComponent,
    TeamHeaderComponent,
    RosterStatsComponent,
  ],
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss'],
})
export class TeamsComponent implements OnInit {
  private readonly teamService = inject(TeamService);
  private readonly playerDataService = inject(PlayerDataService);
  private readonly draftSimulationService = inject(DraftSimulationService);
  private readonly authService = inject(AuthService);

  // Component state
  private _selectedTeam = signal<Team | null>(null);
  private _showDraftModal = signal(false);
  private _showPlayerSearch = signal(false);
  private _searchQuery = signal('');
  private _selectedPosition = signal<Position | ''>('');
  private _isLoadingPlayers = signal(false);

  // Public signals (writable for template binding)
  public selectedTeam = this._selectedTeam;
  public showDraftModal = this._showDraftModal;
  public showPlayerSearch = this._showPlayerSearch;
  public searchQuery = this._searchQuery;
  public selectedPosition = this._selectedPosition;
  public isLoadingPlayers = this._isLoadingPlayers;

  // Computed values
  public teams = computed(() => this.teamService.userTeams());
  public hasTeams = computed(() => this.teamService.hasTeams());
  public isLoading = computed(() => this.teamService.isLoading());
  public error = computed(() => this.teamService.error());
  public hasPlayers = computed(() => this.playerDataService.hasPlayers());
  public isDraftActive = computed(() =>
    this.draftSimulationService.isDraftActive()
  );
  public draftState = computed(() => this.draftSimulationService.draftState());
  public draftSettings = computed(() =>
    this.draftSimulationService.draftSettings()
  );

  // Draft simulation settings
  public draftRounds = 25;
  public draftTimeLimit = 90;
  public snakeOrder = true;
  public allowTrades = false;

  // Player search results
  public searchResults: SleeperPlayer[] = [];

  async ngOnInit(): Promise<void> {
    // Load user's teams
    await this.teamService.loadUserTeams();

    // Load players data if not already loaded
    if (!this.playerDataService.hasPlayers()) {
      await this.playerDataService.loadPlayers();
    }

    // Select first team if available
    if (this.teams().length > 0) {
      this._selectedTeam.set(this.teams()[0]);
    }
  }

  /**
   * Select a team to view
   */
  selectTeam(team: Team): void {
    this._selectedTeam.set(team);
  }

  /**
   * Get roster statistics for selected team
   */
  getRosterStats(): RosterStats | null {
    const team = this.selectedTeam();
    return team ? this.teamService.getRosterStats(team) : null;
  }

  /**
   * Get roster by position
   */
  getRosterByPosition(position: string): RosterSlot[] {
    const team = this.selectedTeam();
    return team
      ? this.teamService.getRosterByPosition(team, position as Position)
      : [];
  }

  /**
   * Get player details for a roster slot
   */
  getPlayerDetails(playerId: string): SleeperPlayer | null {
    return this.playerDataService.getPlayer(playerId);
  }

  /**
   * Validate roster requirements
   */
  validateRoster(): { isValid: boolean; issues: string[] } {
    const team = this.selectedTeam();
    // TODO: Get league rules from the league service
    // For now, use default validation
    return team
      ? this.teamService.validateRosterRequirements(team)
      : { isValid: false, issues: [] };
  }

  /**
   * Start draft simulation
   */
  async startDraft(): Promise<void> {
    const team = this.selectedTeam();
    if (!team) return;

    const settings: DraftSimulationSettings = {
      rounds: this.draftRounds,
      teams: [team], // Single team draft for now
      snakeOrder: this.snakeOrder,
      timeLimit: this.draftTimeLimit,
      allowTrades: this.allowTrades,
    };

    await this.draftSimulationService.startDraftSimulation(settings);
    this._showDraftModal.set(true);
  }

  /**
   * Hide draft modal
   */
  hideDraftModal(): void {
    this._showDraftModal.set(false);
  }

  /**
   * Make a draft pick
   */
  async makePick(playerId: string): Promise<void> {
    await this.draftSimulationService.makePick(playerId);
  }

  /**
   * Auto-pick for current team
   */
  async autoPick(): Promise<void> {
    await this.draftSimulationService.autoPick();
  }

  /**
   * End draft simulation
   */
  endDraft(): void {
    this.draftSimulationService.endDraft();
    this._showDraftModal.set(false);
  }

  /**
   * Reset draft simulation
   */
  resetDraft(): void {
    this.draftSimulationService.resetDraft();
    this._showDraftModal.set(false);
  }

  /**
   * Show player search modal
   */
  openPlayerSearch(): void {
    this._showPlayerSearch.set(true);
    this._searchQuery.set('');
    this._selectedPosition.set('');
    this.searchResults = [];
  }

  /**
   * Hide player search modal
   */
  hidePlayerSearch(): void {
    this._showPlayerSearch.set(false);
  }

  /**
   * Search for players
   */
  async searchPlayers(): Promise<void> {
    if (!this.searchQuery() && !this.selectedPosition()) {
      this.searchResults = [];
      return;
    }

    this._isLoadingPlayers.set(true);

    try {
      let results: SleeperPlayer[] = [];

      if (this.selectedPosition()) {
        results = this.playerDataService.getPlayersByPosition(
          this.selectedPosition() as Position
        );
      } else {
        results = Object.values(this.playerDataService.players());
      }

      // Filter by search query if provided
      if (this.searchQuery()) {
        const query = this.searchQuery().toLowerCase();
        results = results.filter(
          (player) =>
            player.first_name.toLowerCase().includes(query) ||
            player.last_name.toLowerCase().includes(query) ||
            player.team.toLowerCase().includes(query)
        );
      }

      // Limit results and sort by search rank
      this.searchResults = results
        .slice(0, 50)
        .sort((a, b) => (a.search_rank || 999) - (b.search_rank || 999));
    } finally {
      this._isLoadingPlayers.set(false);
    }
  }

  /**
   * Add player to roster
   */
  async addPlayerToRoster(player: SleeperPlayer): Promise<void> {
    const team = this.selectedTeam();
    if (!team) return;

    try {
      const position = player.fantasy_positions[0] as Position;
      await this.teamService.addPlayerToRoster(
        team.id,
        player.player_id,
        position,
        'active'
      );
      this.hidePlayerSearch();
    } catch (error) {
      console.error('Error adding player to roster:', error);
    }
  }

  /**
   * Remove player from roster
   */
  async removePlayerFromRoster(playerId: string): Promise<void> {
    const team = this.selectedTeam();
    if (!team) return;

    try {
      await this.teamService.removePlayerFromRoster(team.id, playerId);
    } catch (error) {
      console.error('Error removing player from roster:', error);
    }
  }

  /**
   * Handle status change event
   */
  onStatusChange(playerId: string, event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      this.updatePlayerStatus(
        playerId,
        target.value as 'active' | 'bench' | 'ir' | 'taxi'
      );
    }
  }

  /**
   * Update player status
   */
  async updatePlayerStatus(
    playerId: string,
    status: 'active' | 'bench' | 'ir' | 'taxi'
  ): Promise<void> {
    const team = this.selectedTeam();
    if (!team) return;

    try {
      await this.teamService.updatePlayerStatus(team.id, playerId, status);
    } catch (error) {
      console.error('Error updating player status:', error);
    }
  }

  /**
   * Get top available players for draft
   */
  getTopAvailablePlayers(): SleeperPlayer[] {
    const allPlayers = Object.values(this.playerDataService.players());
    const completedPicks = this.draftState()?.completedPicks || [];
    const draftedPlayerIds = new Set(completedPicks.map((p) => p.playerId));

    // Filter out already drafted players and return top 20 by search rank
    return allPlayers
      .filter((p) => !draftedPlayerIds.has(p.player_id))
      .sort((a, b) => (a.search_rank || 999) - (b.search_rank || 999))
      .slice(0, 20);
  }

  /**
   * Get draft statistics
   */
  getDraftStats(): any {
    return this.draftSimulationService.getDraftStats();
  }

  /**
   * Get draft duration
   */
  getDraftDuration(): string {
    const state = this.draftState();
    if (!state || !state.startTime) return '0:00';

    const endTime = state.endTime || new Date();
    const duration = endTime.getTime() - state.startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get position display name
   */
  getPositionDisplayName(position: string): string {
    const positionNames: Record<string, string> = {
      QB: 'Quarterback',
      RB: 'Running Back',
      WR: 'Wide Receiver',
      TE: 'Tight End',
      K: 'Kicker',
      DEF: 'Defense',
    };
    return positionNames[position] || position;
  }

  /**
   * Get status display name
   */
  getStatusDisplayName(status: string): string {
    const statusNames = {
      active: 'Active',
      bench: 'Bench',
      ir: 'Injured Reserve',
      taxi: 'Taxi Squad',
    };
    return statusNames[status as keyof typeof statusNames] || status;
  }

  /**
   * Format player name
   */
  formatPlayerName(player: SleeperPlayer): string {
    return `${player.first_name} ${player.last_name}`;
  }

  /**
   * Clear error
   */
  clearError(): void {
    this.teamService.clearError();
  }
}
