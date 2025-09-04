import {
  Component,
  OnInit,
  signal,
  computed,
  effect,
  inject,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import {
  Position,
  LeaguePhase,
  EnhancedSportsPlayer,
} from '@fantasy-football-dynasty/types';
import { SportsDataService } from '../../../services/sports-data.service';
import { LeagueService } from '../../../services/league.service';
import { TeamService } from '../../../services/team.service';
import { FreeAgencyService } from '../../../services/free-agency.service';

export interface PlayerAction {
  label: string;
  icon: string;
  severity: 'primary' | 'secondary' | 'success' | 'info' | 'danger';
  action: (player: EnhancedSportsPlayer) => void;
  disabled?: (player: EnhancedSportsPlayer) => boolean;
  visible?: (player: EnhancedSportsPlayer) => boolean;
}

export type PlayersTableMode = 'default' | 'bid' | 'sign';

export interface PlayersTableConfig {
  title: string;
  subtitle?: string;
  emptyMessage: string;
  showFilters: boolean;
  showSearch: boolean;
  showPagination: boolean;
  pageSize: number;
  mode: PlayersTableMode;
  actions: PlayerAction[];
  leagueId?: string; // Optional: if provided, will enhance players with league data
  getPlayers?: () => EnhancedSportsPlayer[]; // Optional: fallback if no leagueId
  onPlayerClick?: (player: EnhancedSportsPlayer) => void;
  // Free agency specific options
  showBidCounts?: boolean; // Show bid counts column (bid mode)
  showEstimatedMinimum?: boolean; // Show estimated minimum column (bid mode)
  showMarketTrends?: boolean; // Show market trend indicators (bid mode)
  onBidClick?: (player: EnhancedSportsPlayer) => void; // Bid action callback
  onSignClick?: (player: EnhancedSportsPlayer) => void; // Sign action callback
  onTradeClick?: (player: EnhancedSportsPlayer) => void; // Trade action callback
}

@Component({
  selector: 'app-players-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    TagModule,
    DialogModule,
    InputNumberModule,
    ToastModule,
    CardModule,
    DividerModule,
    BadgeModule,
    TooltipModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    SelectModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './players-table.component.html',
  styleUrls: ['./players-table.component.scss'],
  providers: [MessageService, ConfirmationService],
})
export class PlayersTableComponent implements OnInit {
  private readonly sportsDataService = inject(SportsDataService);
  private readonly leagueService = inject(LeagueService);
  private readonly teamService = inject(TeamService);
  private readonly freeAgencyService = inject(FreeAgencyService);

  // Input configuration
  @Input() public config!: PlayersTableConfig;

  // Component state
  isLoading = signal(false);
  error = signal<string | null>(null);
  searchQuery = signal('');
  selectedPosition = signal<Position | 'ALL'>('ALL');
  selectedTeam = signal<string>('ALL');
  currentPage = signal(1);

  // Sorting state
  sortField = signal<string>('overall');
  sortOrder = signal<number>(-1); // -1 for descending, 1 for ascending

  // League-specific data
  private _leaguePlayers = signal<any[]>([]);
  private _enhancedPlayers = signal<EnhancedSportsPlayer[]>([]);

  // Free agency specific data
  private _activeBids = signal<any[]>([]);

  // Computed values
  public filteredPlayers = computed(() => {
    // Priority 1: Use getPlayers() function if provided (for custom filtered data like team roster)
    if (this.config?.getPlayers) {
      let filtered = [...this.config.getPlayers()];

      // Position filter
      if (this.selectedPosition() !== 'ALL') {
        filtered = filtered.filter(
          (player) => player.Position === this.selectedPosition()
        );
      }

      // Team filter
      if (this.selectedTeam() !== 'ALL') {
        filtered = filtered.filter(
          (player) => player.Team === this.selectedTeam()
        );
      }

      // Search filter
      if (this.searchQuery()) {
        const query = this.searchQuery().toLowerCase();
        filtered = filtered.filter((player) => {
          const firstName = player.FirstName?.toLowerCase() || '';
          const lastName = player.LastName?.toLowerCase() || '';
          const team = player.Team?.toLowerCase() || '';
          return (
            firstName.includes(query) ||
            lastName.includes(query) ||
            team.includes(query)
          );
        });
      }

      // Sorting
      filtered.sort((a, b) => this.sortPlayers(a, b));

      return filtered;
    }
    // Priority 2: Use enhanced players with league data if available
    else if (this.config?.leagueId && this._enhancedPlayers().length > 0) {
      // Use enhanced players with league data
      let filtered = [...this._enhancedPlayers()];

      // Position filter
      if (this.selectedPosition() !== 'ALL') {
        filtered = filtered.filter(
          (player) => player.Position === this.selectedPosition()
        );
      }

      // Team filter
      if (this.selectedTeam() !== 'ALL') {
        filtered = filtered.filter(
          (player) => player.Team === this.selectedTeam()
        );
      }

      // Search filter
      if (this.searchQuery()) {
        const query = this.searchQuery().toLowerCase();
        filtered = filtered.filter((player) => {
          const firstName = player.FirstName?.toLowerCase() || '';
          const lastName = player.LastName?.toLowerCase() || '';
          const team = player.Team?.toLowerCase() || '';
          return (
            firstName.includes(query) ||
            lastName.includes(query) ||
            team.includes(query)
          );
        });
      }

      // Sorting
      filtered.sort((a, b) => this.sortPlayers(a, b));

      return filtered;
    }
    // Priority 3: Use sports data service directly
    else {
      // Use sports data service directly
      let players = this.sportsDataService.activePlayers();
      let filtered = [...players];

      // Position filter
      if (this.selectedPosition() !== 'ALL') {
        filtered = filtered.filter(
          (player) => player.Position === this.selectedPosition()
        );
      }

      // Team filter
      if (this.selectedTeam() !== 'ALL') {
        filtered = filtered.filter(
          (player) => player.Team === this.selectedTeam()
        );
      }

      // Search filter
      if (this.searchQuery()) {
        const query = this.searchQuery().toLowerCase();
        filtered = filtered.filter((player) => {
          const firstName = player.FirstName?.toLowerCase() || '';
          const lastName = player.LastName?.toLowerCase() || '';
          const team = player.Team?.toLowerCase() || '';
          return (
            firstName.includes(query) ||
            lastName.includes(query) ||
            team.includes(query)
          );
        });
      }

      // Sorting
      filtered.sort((a, b) => this.sortPlayers(a, b));

      return filtered;
    }
  });

  /**
   * Sort players based on current sort field and order
   */
  private sortPlayers(a: any, b: any): number {
    const field = this.sortField();
    let aValue: any;
    let bValue: any;

    // Safely access player properties based on sort field
    switch (field) {
      case 'overall':
        aValue = a.overall || 0;
        bValue = b.overall || 0;
        break;
      case 'name':
        aValue = `${a.FirstName || ''} ${a.LastName || ''}`.toLowerCase();
        bValue = `${b.FirstName || ''} ${b.LastName || ''}`.toLowerCase();
        break;
      case 'position':
        aValue = a.Position || '';
        bValue = b.Position || '';
        break;
      case 'team':
        aValue = a.Team || '';
        bValue = b.Team || '';
        break;
      case 'age':
        aValue = a.Age || 0;
        bValue = b.Age || 0;
        break;
      case 'experience':
        aValue = a.Experience || 0;
        bValue = b.Experience || 0;
        break;
      case 'fantasyPoints':
        aValue = a.fantasyPoints || 0;
        bValue = b.fantasyPoints || 0;
        break;
      case 'fantasyPointsPPR':
        aValue = a.fantasyPointsPPR || 0;
        bValue = b.fantasyPointsPPR || 0;
        break;
      default:
        aValue = a[field] || 0;
        bValue = b[field] || 0;
    }

    // Handle string vs number comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      if (aValue < bValue) return this.sortOrder() * -1;
      if (aValue > bValue) return this.sortOrder() * 1;
      return 0;
    } else {
      // Numeric comparison
      if (aValue < bValue) return this.sortOrder() * -1;
      if (aValue > bValue) return this.sortOrder() * 1;
      return 0;
    }
  }

  public paginatedPlayers = computed(() => {
    const players = this.filteredPlayers();
    if (!this.config?.showPagination) return players;

    const startIndex = (this.currentPage() - 1) * this.config.pageSize;
    const endIndex = startIndex + this.config.pageSize;
    return players.slice(startIndex, endIndex);
  });

  public totalPages = computed(() => {
    if (!this.config?.showPagination) return 1;
    return Math.ceil(this.filteredPlayers().length / this.config.pageSize);
  });

  public hasPlayers = computed(() => this.filteredPlayers().length > 0);
  public hasFilters = computed(() => this.config?.showFilters || false);
  public hasSearch = computed(() => this.config?.showSearch || false);

  // Free agency specific computed values
  public isBidMode = computed(() => this.config?.mode === 'bid');
  public isSignMode = computed(() => this.config?.mode === 'sign');
  public showBidColumns = computed(
    () =>
      this.isBidMode() &&
      (this.config?.showBidCounts ||
        this.config?.showEstimatedMinimum ||
        this.config?.showMarketTrends)
  );

  // Position options for filter
  public positionOptions = computed(() => {
    // Priority 1: Use getPlayers() function if provided
    if (this.config?.getPlayers) {
      const positions = [
        ...new Set(
          this.config
            .getPlayers()
            .map((player) => player.Position)
            .filter(Boolean)
        ),
      ];
      return [
        { label: 'All Positions', value: 'ALL' },
        ...positions.map((pos) => ({ label: pos, value: pos })),
      ];
    }
    // Priority 2: Use enhanced players with league data if available
    else if (this.config?.leagueId && this._enhancedPlayers().length > 0) {
      // Get positions from enhanced players
      const positions = [
        ...new Set(
          this._enhancedPlayers()
            .map((player) => player.Position)
            .filter(Boolean)
        ),
      ];
      return [
        { label: 'All Positions', value: 'ALL' },
        ...positions.map((pos) => ({ label: pos, value: pos })),
      ];
    }
    // Priority 3: Get positions from sports data service
    else {
      // Get positions from sports data service
      const positions = [
        ...new Set(
          this.sportsDataService
            .activePlayers()
            .map((player) => player.Position)
            .filter(Boolean)
        ),
      ];
      return [
        { label: 'All Positions', value: 'ALL' },
        ...positions.map((pos) => ({ label: pos, value: pos })),
      ];
    }
  });

  // Team options for filter
  public teamOptions = computed(() => {
    // Priority 1: Use getPlayers() function if provided
    if (this.config?.getPlayers) {
      const teams = [
        ...new Set(
          this.config
            .getPlayers()
            .map((player) => player.Team)
            .filter(Boolean)
        ),
      ];
      return [
        { label: 'All Teams', value: 'ALL' },
        ...teams.map((team) => ({ label: team, value: team })),
      ];
    }
    // Priority 2: Use enhanced players with league data if available
    else if (this.config?.leagueId && this._enhancedPlayers().length > 0) {
      // Get teams from enhanced players
      const teams = [
        ...new Set(
          this._enhancedPlayers()
            .map((player) => player.Team)
            .filter(Boolean)
        ),
      ];
      return [
        { label: 'All Teams', value: 'ALL' },
        ...teams.map((team) => ({ label: team, value: team })),
      ];
    }
    // Priority 3: Get teams from sports data service
    else {
      // Get teams from sports data service
      const teams = [
        ...new Set(
          this.sportsDataService
            .activePlayers()
            .map((player) => player.Team)
            .filter(Boolean)
        ),
      ];
      return [
        { label: 'All Teams', value: 'ALL' },
        ...teams.map((team) => ({ label: team, value: team })),
      ];
    }
  });

  // Effect: Load league data when config changes
  constructor() {
    console.log('PlayersTableComponent constructor');
    console.log('config', this.config);
    effect(() => {
      const leagueId = this.config?.leagueId;
      if (leagueId) {
        this.loadLeaguePlayers(leagueId);
      } else {
        // Clear league data when no league is selected
        this._leaguePlayers.set([]);
        this._enhancedPlayers.set([]);
      }
    });

    // Effect: Load free agency data when in bid mode
    effect(() => {
      if (this.isBidMode()) {
        this.loadFreeAgencyData();
      }
    });

    // Effect: Monitor player minimums changes for debugging // Removed
    // effect(() => { // Removed
    //   const minimums = this._playerMinimums(); // Removed
    //   if (this.config?.showEstimatedMinimum && this.isBidMode()) { // Removed
    //     console.log(`Player minimums signal updated:`, { // Removed
    //       totalPlayers: Object.keys(minimums).length, // Removed
    //       samplePlayer: Object.keys(minimums)[0], // Removed
    //       sampleValue: // Removed
    //         Object.keys(minimums).length > 0 // Removed
    //           ? minimums[Object.keys(minimums)[0]] // Removed
    //           : null, // Removed
    //     }); // Removed
    //   } // Removed
    // }); // Removed
  }

  ngOnInit(): void {
    if (!this.config) {
      console.error('PlayersTableComponent: No configuration provided');
      return;
    }

    // If using league data, the effect will handle loading
    // If not, we rely on SportsDataService which should already be loaded
    if (!this.config.leagueId && !this.config.getPlayers) {
      // Ensure sports data is loaded
      this.sportsDataService.waitForData();
    }

    // Load free agency data if we're in bid mode and showing estimated minimums
    if (this.config.mode === 'bid' && this.config.showEstimatedMinimum) {
      // Wait a bit for data to be ready, then load minimums
      setTimeout(() => {
        this.loadFreeAgencyData();
      }, 100);
    }
  }

  /**
   * Load league players and enhance them with sports data
   */
  private async loadLeaguePlayers(leagueId: string): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      // Wait for sports data to be loaded
      await this.sportsDataService.waitForData();

      // Get league players from LeagueService
      const leaguePlayers = await this.leagueService.getLeaguePlayers(leagueId);
      this._leaguePlayers.set(leaguePlayers);

      // Enhance players with sports data
      await this.enhancePlayersWithSportsData(leaguePlayers);
    } catch (error) {
      console.error('Error loading league players:', error);
      this.error.set(
        error instanceof Error ? error.message : 'Failed to load league players'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Load free agency specific data (bids, player minimums)
   */
  private async loadFreeAgencyData(): Promise<void> {
    try {
      // Load active bids
      const activeBids = this.freeAgencyService.activeBids();
      this._activeBids.set(activeBids);

      // No need to load player minimums - they're already in the league data
      console.log('Free agency data loaded - minimums come from league data');
    } catch (error) {
      console.error('Error loading free agency data:', error);
    }
  }

  /**
   * Enhance league players with sports data by matching PlayerID
   */
  private async enhancePlayersWithSportsData(
    leaguePlayers: any[]
  ): Promise<void> {
    try {
      // Get all active sports players
      const sportsPlayers = this.sportsDataService.activePlayers();

      // Create a map for quick lookup
      const sportsPlayersMap = new Map<number, EnhancedSportsPlayer>();
      sportsPlayers.forEach((player) => {
        sportsPlayersMap.set(player.PlayerID, player);
      });

      // Enhance each league player with sports data
      const enhancedPlayers: EnhancedSportsPlayer[] = leaguePlayers
        .map((leaguePlayer) => {
          // Find matching sports player by PlayerID
          const sportsPlayer = sportsPlayersMap.get(
            parseInt(leaguePlayer.playerId)
          );

          if (!sportsPlayer) {
            return null;
          }

          // Create enhanced player by merging both data sources
          const enhancedPlayer: EnhancedSportsPlayer = {
            ...sportsPlayer, // Start with sports data
            // Override with league-specific data where available
            overall: leaguePlayer.overall || sportsPlayer.overall,
            // Add league-specific properties
            ...leaguePlayer,
          };

          return enhancedPlayer;
        })
        .filter((player): player is EnhancedSportsPlayer => player !== null);

      this._enhancedPlayers.set(enhancedPlayers);
      console.log(
        `Enhanced ${enhancedPlayers.length} players with sports data`
      );
    } catch (error) {
      console.error('Error enhancing players with sports data:', error);
      this.error.set('Failed to enhance players with sports data');
    }
  }

  /**
   * Update search query
   */
  updateSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1); // Reset to first page
  }

  /**
   * Update position filter
   */
  updatePositionFilter(position: Position | 'ALL'): void {
    this.selectedPosition.set(position);
    this.currentPage.set(1); // Reset to first page
  }

  /**
   * Update team filter
   */
  updateTeamFilter(team: string): void {
    this.selectedTeam.set(team);
    this.currentPage.set(1); // Reset to first page
  }

  /**
   * Sort by a specific field
   */
  sortBy(field: string): void {
    if (this.sortField() === field) {
      // Toggle sort order if same field
      this.sortOrder.update((order) => order * -1);
    } else {
      // Set new field with default descending order
      this.sortField.set(field);
      this.sortOrder.set(-1);
    }
    this.currentPage.set(1); // Reset to first page
  }

  /**
   * Get sort icon for a column
   */
  getSortIcon(field: string): string {
    if (this.sortField() !== field) return 'pi pi-sort';
    return this.sortOrder() === 1 ? 'pi pi-sort-up' : 'pi pi-sort-down';
  }

  /**
   * Get sort class for a column
   */
  getSortClass(field: string): string {
    if (this.sortField() !== field) return '';
    return this.sortOrder() === 1 ? 'sort-asc' : 'sort-desc';
  }

  /**
   * Go to specific page
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  /**
   * Go to next page
   */
  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  /**
   * Go to previous page
   */
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  /**
   * Handle player click
   */
  onPlayerClick(player: EnhancedSportsPlayer): void {
    if (this.config.onPlayerClick) {
      this.config.onPlayerClick(player);
    }
  }

  /**
   * Execute player action
   */
  executeAction(action: PlayerAction, player: EnhancedSportsPlayer): void {
    if (action.disabled && action.disabled(player)) {
      return;
    }
    action.action(player);
  }

  /**
   * Check if action should be visible
   */
  isActionVisible(action: PlayerAction, player: EnhancedSportsPlayer): boolean {
    if (action.visible) {
      return action.visible(player);
    }
    return true;
  }

  /**
   * Check if action should be disabled
   */
  isActionDisabled(
    action: PlayerAction,
    player: EnhancedSportsPlayer
  ): boolean {
    if (action.disabled) {
      return action.disabled(player);
    }
    return false;
  }

  /**
   * Get player display name
   */
  getPlayerName(player: EnhancedSportsPlayer): string {
    const firstName = player.FirstName || '';
    const lastName = player.LastName || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown Player';
  }

  /**
   * Get player age from birth date
   */
  getPlayerAge(player: EnhancedSportsPlayer): number {
    if (!player.BirthDate) return 0;

    try {
      const birth = new Date(player.BirthDate);
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
      return 0;
    }
  }

  /**
   * Get player photo URL
   */
  getPlayerPhoto(player: EnhancedSportsPlayer): string {
    return player.PhotoUrl || '/assets/images/default-player.png';
  }

  /**
   * Get position display name
   */
  getPositionDisplay(position: string): string {
    return position || 'Unknown';
  }

  /**
   * Get team display name
   */
  getTeamDisplay(team: string): string {
    return team || 'FA';
  }

  /**
   * Get overall rating display
   */
  getOverallDisplay(player: EnhancedSportsPlayer): string {
    return player.overall?.toString() || 'N/A';
  }

  /**
   * Get fantasy points display
   */
  getPlayerFantasyPoints(player: EnhancedSportsPlayer): number | null {
    // Prefer PPR points if available, fall back to standard
    return player.fantasyPointsPPR || player.fantasyPoints || null;
  }

  /**
   * Get experience display
   */
  getExperienceDisplay(player: EnhancedSportsPlayer): string {
    const exp = player.Experience || 0;
    if (exp === 0) return 'Rookie';
    if (exp === 1) return '1';
    return `${exp}`;
  }

  /**
   * Get personality type display (if available from league data)
   */
  getPersonalityDisplay(player: EnhancedSportsPlayer): string {
    return (player as any).personality?.type || 'N/A';
  }

  /**
   * Get development grade display (if available from league data)
   */
  getDevGradeDisplay(player: EnhancedSportsPlayer): string {
    return (player as any).devGrade || 'N/A';
  }

  // Free agency specific methods

  /**
   * Get bid count for a specific player
   */
  getPlayerBidCount(playerId: string | number): number {
    const id = playerId?.toString();
    if (!id) return 0;
    return this._activeBids().filter((bid) => bid.playerId === id).length;
  }

  /**
   * Check if current team has bid on a player
   */
  hasTeamBid(playerId: string | number): boolean {
    const id = playerId?.toString();
    if (!id) return false;

    const currentTeamId = this.leagueService.currentUserTeamId();
    if (!currentTeamId) return false;

    return this._activeBids().some(
      (bid) => bid.playerId === id && bid.teamId === currentTeamId
    );
  }

  /**
   * Get player minimum for display
   */
  getPlayerMinimumForDisplay(playerId: string | number): number | null {
    const id = playerId?.toString();
    if (!id) return null;

    // Find the player in the enhanced players list
    const player = this._enhancedPlayers().find(
      (p) => p.PlayerID?.toString() === id
    );

    if (!player) {
      console.warn(`Player not found for ID: ${id}`);
      return null;
    }

    // Get the minimumContract from the league data (it was spread in during enhancement)
    const minimumContract = (player as any).minimumContract;

    return minimumContract || null;
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  }

  /**
   * Get position color class for styling
   */
  getPositionColorClass(position: string): string {
    const positionColors: Record<string, string> = {
      QB: 'position-color--QB',
      RB: 'position-color--RB',
      WR: 'position-color--WR',
      TE: 'position-color--TE',
      K: 'position-color--K',
      DEF: 'position-color--DEF',
      DL: 'position-color--DL',
      LB: 'position-color--LB',
      DB: 'position-color--DB',
      DE: 'position-color--DE',
      LS: 'position-color--LS',
      P: 'position-color--P',
    };
    return positionColors[position] || 'position-color--default';
  }

  /**
   * Handle bid button click
   */
  onBidClick(player: EnhancedSportsPlayer): void {
    if (this.config.onBidClick) {
      this.config.onBidClick(player);
    }
  }

  /**
   * Handle sign button click
   */
  onSignClick(player: EnhancedSportsPlayer): void {
    if (this.config.onSignClick) {
      this.config.onSignClick(player);
    }
  }

  /**
   * Clear all filters and reset to default state
   */
  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedPosition.set('ALL');
    this.selectedTeam.set('ALL');
    this.currentPage.set(1);
    this.clearSort();
  }

  /**
   * Clear current sort and reset to default (overall descending)
   */
  clearSort(): void {
    this.sortField.set('overall');
    this.sortOrder.set(-1);
  }

  /**
   * Get filter summary text
   */
  getFilterSummary(): string {
    const totalPlayers = this.filteredPlayers().length;
    const positionFilter =
      this.selectedPosition() !== 'ALL'
        ? ` | Position: ${this.selectedPosition()}`
        : '';
    const teamFilter =
      this.selectedTeam() !== 'ALL' ? ` | Team: ${this.selectedTeam()}` : '';
    const searchFilter = this.searchQuery()
      ? ` | Search: "${this.searchQuery()}"`
      : '';
    const sortInfo =
      this.sortField() !== 'overall' || this.sortOrder() !== -1
        ? ` | Sorted by: ${this.getSortFieldDisplay()} ${
            this.sortOrder() === 1 ? '↑' : '↓'
          }`
        : '';

    return `${totalPlayers} players${positionFilter}${teamFilter}${searchFilter}${sortInfo}`;
  }

  /**
   * Get display name for sort field
   */
  private getSortFieldDisplay(): string {
    const fieldMap: Record<string, string> = {
      overall: 'Overall',
      name: 'Name',
      position: 'Position',
      team: 'Team',
      age: 'Age',
      experience: 'Experience',
      fantasyPoints: 'Fantasy Points',
      fantasyPointsPPR: 'Fantasy Points (PPR)',
    };
    return fieldMap[this.sortField()] || this.sortField();
  }

  /**
   * Get colspan for empty message based on current configuration
   */
  getEmptyMessageColspan(): number {
    let baseCols = 8; // Photo, Name, Position, Team, Age, Experience, Overall, Actions

    if (this.config?.leagueId) {
      baseCols += 2; // Dev Grade, Personality
    }

    if (this.showBidColumns()) {
      if (this.config?.showEstimatedMinimum) baseCols += 1;
      if (this.config?.showBidCounts) baseCols += 1;
    }

    return baseCols;
  }

  /**
   * Refresh all data
   */
  async refresh(): Promise<void> {
    if (this.config?.leagueId) {
      await this.loadLeaguePlayers(this.config.leagueId);
    }

    // Refresh free agency data if in bid mode
    if (this.isBidMode()) {
      await this.loadFreeAgencyData();
    }
  }

  /**
   * Check if a player is signed (for sign mode)
   */
  isPlayerSigned(player: any): boolean {
    return player.status === 'signed' && player.signedTeamName;
  }

  /**
   * Check if a player is owned by the current user
   */
  isPlayerOwnedByCurrentUser(player: any): boolean {
    return player.isOwnedByCurrentUser === true;
  }

  /**
   * Get the signed team name for a player
   */
  getSignedTeamName(player: any): string {
    return player.signedTeamName || 'Unknown Team';
  }

  /**
   * Handle trade action for players owned by other teams
   */
  onTradeClick(player: any): void {
    console.log('[Players Table] Trade clicked for player:', player);
    // TODO: Implement trade functionality
    // This could open a trade dialog or navigate to trade page
  }
}
