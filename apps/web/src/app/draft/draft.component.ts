import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DraftService } from '../services/draft.service';
import { LeagueService } from '../services/league.service';
import { DraftLayoutService } from '../services/draft-layout.service';
import {
  DraftState,
  Player,
  DraftPick,
  League,
  Team,
  DraftSettings,
} from '../../../../../libs/types/src/lib/types';

@Component({
  selector: 'app-draft',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './draft.component.html',
  styleUrls: ['./draft.component.scss'],
})
export class DraftComponent implements OnInit, OnDestroy {
  // Signals from services (initialized in constructor)
  draftState!: any;
  isConnected!: any;
  currentPick!: any;
  timeRemaining!: any;
  isMyTurn!: any;

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
  showPlayerList = signal<boolean>(true);
  showAutodraftQueue = signal<boolean>(false);

  positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
  leagueId: string = '';

  // Expose Math for template
  Math = Math;

  constructor(
    private draftService: DraftService,
    private leagueService: LeagueService,
    private route: ActivatedRoute,
    private router: Router,
    public draftLayoutService: DraftLayoutService
  ) {
    // Initialize service signals
    this.draftState = this.draftService.draftState;
    this.isConnected = this.draftService.isConnected;
    this.currentPick = this.draftService.currentPick;
    this.timeRemaining = this.draftService.timeRemaining;
    this.isMyTurn = this.draftService.isMyTurn;

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

  private async loadInitialData() {
    // Set the selected league ID for navigation
    this.leagueService.setSelectedLeagueId(this.leagueId);

    // Load league data
    const leagueResponse = await this.leagueService.getLeague(this.leagueId);
    if (leagueResponse && leagueResponse.league) {
      this.league.set(leagueResponse.league);
      this.draftLayoutService.updateLeague(leagueResponse.league);
    }

    // Load teams
    const teamsResponse = await this.leagueService.getLeagueTeams(
      this.leagueId
    );
    this.teams.set(teamsResponse.teams);

    // Load draft picks
    await this.loadDraftPicks();

    // Load available players
    await this.loadAvailablePlayers();
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
      await this.loadDraftPicks();
      await this.loadAvailablePlayers();
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

  goToNegotiations(): void {
    // Navigate to contract negotiations
    this.router.navigate(['/negotiations', this.leagueId]);
  }
}
