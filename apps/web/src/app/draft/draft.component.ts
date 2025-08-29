import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ActivatedRoute, Router } from '@angular/router';
import { DraftService } from '../services/draft.service';
import { LeagueService } from '../services/league.service';
import { DraftLayoutService } from '../services/draft-layout.service';
import { LeagueMembershipService } from '../services/league-membership.service';
import {
  DraftState,
  Player,
  DraftPick,
  League,
  Team,
  DraftSettings,
} from '@fantasy-football-dynasty/types';
import { DraftBoardComponent } from './components';
import { PlayerSelectionComponent } from './components/player-selection/player-selection.component';
import { SportsDataService } from '../services/sports-data.service';

@Component({
  selector: 'app-draft',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DraftBoardComponent,
    PlayerSelectionComponent,
  ],
  templateUrl: './draft.component.html',
  styleUrls: ['./draft.component.scss'],
})
export class DraftComponent implements OnInit, OnDestroy {
  private readonly leagueService = inject(LeagueService);
  private readonly leagueMembershipService = inject(LeagueMembershipService);
  private readonly draftService = inject(DraftService);
  private readonly sportsDataService = inject(SportsDataService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly draftLayoutService = inject(DraftLayoutService);

  // Use cached league teams from the service
  readonly leagueTeams = this.leagueService.leagueTeams;

  // Signals from services (initialized in constructor)
  draftState = this.draftService.draftState;
  isConnected = this.draftService.isConnected;
  currentPick = this.draftService.currentPick;
  timeRemaining = this.draftService.timeRemaining;
  isMyTurn = this.draftService.isMyTurn;
  showPlayerSelection = this.draftLayoutService.showPlayerList;

  // Local signals
  league = signal<League | null>(null);
  teams = signal<Team[]>([]);
  availablePlayers = signal<Player[]>([]);
  selectedPlayer = signal<Player | null>(null);
  draftPicks = signal<DraftPick[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Search and filters
  searchQuery = signal<string>('');
  selectedPosition = signal<string>('');

  // New signals for draft board
  selectedPick = signal<DraftPick | null>(null);
  watchlist = signal<Player[]>([]);
  isCommissioner = signal<boolean>(false);
  numberOfTeams = signal<number>(0);
  totalRounds = signal<number>(25);

  // Computed values
  draftStats = computed(() => {
    const state = this.draftState();
    return state ? this.draftService.getDraftStats(state) : null;
  });

  timeRemainingFormatted = computed(() => {
    return this.draftService.formatTimeRemaining(this.timeRemaining());
  });

  currentTeam = computed(() => {
    const state = this.draftState();
    const teamsData = this.teams();

    if (!state || !teamsData.length) return null;

    return teamsData.find((team) => team.id === state.currentTeamId) || null;
  });

  // UI state
  showDraftBoard = signal<boolean>(true);
  showPlayerList = this.draftLayoutService.showPlayerList;
  showAutodraftQueue = signal<boolean>(false);

  positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
  leagueId: string = '';

  // Expose Math for template
  Math = Math;

  constructor() {
    // Initialize service signals

    // Sync data with layout service
    effect(() => {
      this.draftLayoutService.updateDraftState(this.draftState());
      this.draftLayoutService.updateConnectionStatus(this.isConnected());
      this.draftLayoutService.updateCurrentPick(this.currentPick());
      this.draftLayoutService.updateTimeRemaining(
        this.timeRemaining(),
        this.timeRemainingFormatted()
      );
      this.draftLayoutService.updateIsMyTurn(this.isMyTurn());
      this.draftLayoutService.updateCurrentTeam(this.currentTeam());
      this.draftLayoutService.updateDraftStats(this.draftStats());
    });

    // Effect to update available players when search/filters change
    effect(() => {
      const query = this.searchQuery();
      const position = this.selectedPosition();

      if (this.leagueId) {
        this.loadAvailablePlayers();
      }
    });
  }

  async ngOnInit() {
    try {
      this.leagueId = this.route.snapshot.params['leagueId'];

      if (!this.leagueId) {
        this.error.set('League ID not found');
        return;
      }

      await this.loadInitialData();

      // Connect to draft if one is active
      this.draftService.connectToDraft(this.leagueId);
    } catch (error) {
      console.error('Error initializing draft component:', error);
      this.error.set('Failed to load draft data');
    } finally {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {
    this.draftService.disconnect();
  }

  public async loadInitialData(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      // Load league
      const leagueResult = await this.leagueService.getLeague(this.leagueId);
      if (leagueResult?.league) {
        this.league.set(leagueResult.league);
        this.totalRounds.set(leagueResult.league.rules.draft.rounds);
      }

      // Teams are now loaded automatically via the league service when a league is selected
      // No need to manually load them here

      // Load draft state from service signals
      const draftState = this.draftService.draftState();
      if (draftState) {
        this.draftState.set(draftState);
        this.currentPick.set(draftState.currentPick);
        this.isMyTurn.set(
          draftState.currentTeamId === this.getCurrentUserTeamId()
        );
      }

      // Check commissioner status
      await this.checkCommissionerStatus();

      // Load watchlist
      await this.loadWatchlist();
    } catch (err) {
      console.error('Error loading initial data:', err);
      this.error.set('Failed to load draft data: ' + (err as Error).message);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadDraftPicks() {
    try {
      const picks = await this.draftService.getDraftPicks(this.leagueId);
      this.draftPicks.set(picks);
    } catch (error) {
      console.error('Error loading draft picks:', error);
    }
  }

  private async loadAvailablePlayers() {
    try {
      const players = await this.draftService.getAvailablePlayers(
        this.leagueId,
        {
          search: this.searchQuery() || undefined,
          position: this.selectedPosition() || undefined,
          limit: 100,
        }
      );
      this.availablePlayers.set(players);
    } catch (error) {
      console.error('Error loading available players:', error);
    }
  }

  private async loadWatchlist() {
    try {
      // Load watchlist from local storage or service
      const watchlistData = localStorage.getItem(`watchlist_${this.leagueId}`);
      if (watchlistData) {
        const watchlistIds = JSON.parse(watchlistData);
        // Filter out players that are already drafted
        const availableWatchlist = watchlistIds.filter(
          (id: string) =>
            !this.draftPicks().some((pick) => pick.playerId === id)
        );
        this.watchlist.set(availableWatchlist);
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
    }
  }

  private async checkCommissionerStatus() {
    try {
      const isCommissioner =
        await this.leagueMembershipService.isLeagueCommissioner(this.leagueId);
      this.isCommissioner.set(isCommissioner);
    } catch (error) {
      console.error('Error checking commissioner status:', error);
      this.isCommissioner.set(false);
    }
  }

  async startDraft() {
    try {
      const league = this.league();
      if (!league) return;

      const settings: DraftSettings = {
        mode: league.rules.draft.mode,
        rounds: league.rules.draft.rounds,
        timeLimit: league.rules.draft.timeLimit,
        autodraftDelay: league.rules.draft.autodraftDelay,
        allowPickTrading: true,
        allowChatting: true,
      };

      await this.draftService.initializeDraft(this.leagueId, settings);

      // Reload data
      await this.loadInitialData();
    } catch (error) {
      console.error('Error starting draft:', error);
      this.error.set('Failed to start draft');
    }
  }

  async makePick(player: Player) {
    try {
      const state = this.draftState();
      if (!state) return;

      // In a real app, you'd get the current user's team ID
      const currentUserTeamId = state.currentTeamId; // Simplified for demo

      await this.draftService.makeDraftPick(
        this.leagueId,
        player.id,
        currentUserTeamId
      );

      // Clear selection and reload data
      this.selectedPlayer.set(null);
      this.closePlayerSelection();
      await this.loadDraftPicks();
      await this.loadAvailablePlayers();

      // Remove from watchlist if it was there
      this.removeFromWatchlist(player.id);
    } catch (error) {
      console.error('Error making draft pick:', error);
      this.error.set('Failed to make draft pick');
    }
  }

  selectPlayer(player: Player) {
    this.selectedPlayer.set(player);
  }

  async pauseDraft() {
    try {
      const state = this.draftState();
      if (!state) return;

      await this.draftService.pauseDraft(this.leagueId, !state.isPaused);
    } catch (error) {
      console.error('Error pausing draft:', error);
    }
  }

  onSearchChange(value: string) {
    this.searchQuery.set(value);
  }

  onPositionChange(position: string) {
    this.selectedPosition.set(position);
  }

  toggleDraftBoard() {
    this.showDraftBoard.set(!this.showDraftBoard());
  }

  togglePlayerList() {
    this.showPlayerList.set(!this.showPlayerList());
  }

  toggleAutodraftQueue() {
    this.showAutodraftQueue.set(!this.showAutodraftQueue());
  }

  getDraftPositionInfo(pickNumber: number) {
    const state = this.draftState();
    return state
      ? this.draftService.getDraftPositionInfo(state, pickNumber)
      : null;
  }

  getTeamName(teamId: string): string {
    const team = this.teams().find((t) => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  }

  canMakePick(): boolean {
    const state = this.draftState();
    if (!state) return false;

    // In a real app, you'd check if it's the current user's team's turn
    return this.draftService.canMakePick(state, state.currentTeamId);
  }

  getPlayerById(playerId: string): Player | null {
    return this.availablePlayers().find((p) => p.id === playerId) || null;
  }

  getPositionColor(position: string): string {
    const colors: Record<string, string> = {
      QB: 'text-red-600',
      RB: 'text-green-600',
      WR: 'text-blue-600',
      TE: 'text-yellow-600',
      K: 'text-purple-600',
      DEF: 'text-gray-600',
    };
    return colors[position] || 'text-gray-600';
  }

  getPositionBgClass(position: string): string {
    const bgColors: Record<string, string> = {
      QB: 'bg-red-100 dark:bg-red-900',
      RB: 'bg-green-100 dark:bg-green-900',
      WR: 'bg-blue-100 dark:bg-blue-900',
      TE: 'bg-yellow-100 dark:bg-yellow-900',
      K: 'bg-purple-100 dark:bg-purple-900',
      DEF: 'bg-gray-100 dark:bg-gray-900',
    };
    return bgColors[position] || 'bg-gray-100 dark:bg-gray-900';
  }

  goToNegotiations(): void {
    // Navigate to contract negotiations
    this.router.navigate(['/negotiations', this.leagueId]);
  }

  // New methods for draft board functionality

  canClaimTeam(teamId: string): boolean {
    // Check if team is available to claim
    // This would integrate with your team claiming logic
    return true; // Simplified for now
  }

  getRounds(): number[] {
    const league = this.league();
    if (!league?.rules?.draft?.rounds) return [];

    const rounds = league.rules.draft.rounds;
    return Array.from({ length: rounds }, (_, i) => i + 1);
  }

  getPicksForRound(round: number): DraftPick[] {
    return this.draftPicks().filter((pick) => pick.round === round);
  }

  getCurrentUserTeamId(): string | null {
    // This would get the current user's team ID
    // For now, return the current team from draft state
    const state = this.draftState();
    return state?.currentTeamId || null;
  }

  getArrowClass(
    pick: DraftPick,
    roundIndex: number,
    pickIndex: number
  ): string {
    const teamsCount = this.teams().length;
    const isSnakeRound = roundIndex % 2 === 1; // Even rounds (0-indexed) are snake

    if (isSnakeRound) {
      // Snake round - arrows point left
      return 'arrow-left';
    } else {
      // Normal round - arrows point right
      return 'arrow-right';
    }
  }

  getArrowSymbol(
    pick: DraftPick,
    roundIndex: number,
    pickIndex: number
  ): string {
    const teamsCount = this.teams().length;
    const isSnakeRound = roundIndex % 2 === 1; // Even rounds (0-indexed) are snake

    if (isSnakeRound) {
      return '←'; // Left arrow for snake rounds
    } else {
      return '→'; // Right arrow for normal rounds
    }
  }

  openPlayerSelection(pick: DraftPick): void {
    this.selectedPick.set(pick);
    this.showPlayerSelection.set(true);
  }

  closePlayerSelection(): void {
    this.showPlayerSelection.set(false);
    this.selectedPick.set(null);
    this.selectedPlayer.set(null);
  }

  // Watchlist functionality

  isInWatchlist(playerId: string): boolean {
    return this.watchlist().some((player) => player.id === playerId);
  }

  addToWatchlist(player: Player): void {
    if (!this.isInWatchlist(player.id)) {
      const currentWatchlist = this.watchlist();
      this.watchlist.set([...currentWatchlist, player]);
      this.saveWatchlist();
    }
  }

  removeFromWatchlist(playerId: string): void {
    const currentWatchlist = this.watchlist();
    this.watchlist.set(
      currentWatchlist.filter((player) => player.id !== playerId)
    );
    this.saveWatchlist();
  }

  toggleWatchlist(player: Player): void {
    if (this.isInWatchlist(player.id)) {
      this.removeFromWatchlist(player.id);
    } else {
      this.addToWatchlist(player);
    }
  }

  private saveWatchlist(): void {
    try {
      const watchlistData = this.watchlist().map((player) => player.id);
      localStorage.setItem(
        `watchlist_${this.leagueId}`,
        JSON.stringify(watchlistData)
      );
    } catch (error) {
      console.error('Error saving watchlist:', error);
    }
  }

  async initializeDraft(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set('');

      // Create default draft settings
      const defaultSettings = {
        mode: 'snake' as const,
        rounds: 20,
        timeLimit: 60,
        autodraftDelay: 10,
        allowPickTrading: false,
        allowChatting: true,
      };

      // Call the Firebase function to initialize the draft
      const result = await this.draftService.initializeDraft(
        this.leagueId,
        defaultSettings
      );

      if (result.success) {
        // Reload draft data after initialization
        await this.loadInitialData();
      } else {
        this.error.set('Failed to initialize draft');
      }
    } catch (err) {
      this.error.set('Error initializing draft: ' + (err as Error).message);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Helper method for the template binding
  isInWatchlistForTemplate(playerId: string): boolean {
    return this.isInWatchlist(playerId);
  }

  claimTeam(pickId: string): void {
    // Handle team claiming for draft order setup
    console.log('Claiming team for pick:', pickId);
    // TODO: Implement team claiming logic
  }

  /**
   * Get the current draft order for the league
   */
  getDraftOrder(): string[] {
    return this.league()?.draftOrder || [];
  }
}
