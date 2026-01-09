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
import { RadioButtonModule } from 'primeng/radiobutton';

import {
  Position,
  LeaguePhase,
  EnhancedSportsPlayer,
} from '@fantasy-football-dynasty/types';
import { SportsDataService } from '../../../services/sports-data.service';
import { LeagueService } from '../../../services/league.service';
import { TeamService } from '../../../services/team.service';
import { FreeAgencyService } from '../../../services/free-agency.service';
import { PlayerService } from '../../../services/player.service';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';

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
    RadioButtonModule,
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
  private readonly playerService = inject(PlayerService);
  private readonly firestore = inject(Firestore);
  private readonly messageService = inject(MessageService);

  // Cache for contract checks
  private _playersWithContracts = signal<Set<string>>(new Set());

  // Input configuration
  @Input() public config!: PlayersTableConfig;

  // Component state
  isLoading = signal(false);
  error = signal<string | null>(null);
  searchQuery = signal('');
  selectedPosition = signal<Position | 'ALL' | 'S'>('ALL');
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
        const selectedPos = this.selectedPosition();
        filtered = filtered.filter((player) => {
          const playerPos = player.Position || (player as any).position;
          // Handle DEF/DST mapping
          if (
            selectedPos === 'DEF' &&
            (playerPos === 'DEF' || playerPos === 'DST')
          ) {
            return true;
          }
          return playerPos === selectedPos;
        });
      }

      // Team filter
      if (this.selectedTeam() !== 'ALL') {
        filtered = filtered.filter(
          (player) =>
            (player.Team || (player as any).nflTeam || (player as any).team) ===
            this.selectedTeam()
        );
      }

      // Search filter
      if (this.searchQuery()) {
        const query = this.searchQuery().toLowerCase();
        filtered = filtered.filter((player) => {
          // Handle both name formats
          const name = (player as any).name?.toLowerCase() || '';
          const firstName = player.FirstName?.toLowerCase() || '';
          const lastName = player.LastName?.toLowerCase() || '';
          const fullName = name || `${firstName} ${lastName}`.trim();
          const team =
            (
              player.Team ||
              (player as any).nflTeam ||
              (player as any).team
            )?.toLowerCase() || '';
          return fullName.includes(query) || team.includes(query);
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
        const selectedPos = this.selectedPosition();
        filtered = filtered.filter((player) => {
          const playerPos = player.Position || (player as any).position;
          // Handle DEF/DST mapping
          if (
            selectedPos === 'DEF' &&
            (playerPos === 'DEF' || playerPos === 'DST')
          ) {
            return true;
          }
          return playerPos === selectedPos;
        });
      }

      // Team filter
      if (this.selectedTeam() !== 'ALL') {
        filtered = filtered.filter(
          (player) =>
            (player.Team || (player as any).nflTeam || (player as any).team) ===
            this.selectedTeam()
        );
      }

      // Search filter
      if (this.searchQuery()) {
        const query = this.searchQuery().toLowerCase();
        filtered = filtered.filter((player) => {
          // Handle both name formats
          const name = (player as any).name?.toLowerCase() || '';
          const firstName = player.FirstName?.toLowerCase() || '';
          const lastName = player.LastName?.toLowerCase() || '';
          const fullName = name || `${firstName} ${lastName}`.trim();
          const team =
            (
              player.Team ||
              (player as any).nflTeam ||
              (player as any).team
            )?.toLowerCase() || '';
          return fullName.includes(query) || team.includes(query);
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
        const selectedPos = this.selectedPosition();
        filtered = filtered.filter((player) => {
          const playerPos = player.Position || (player as any).position;
          // Handle DEF/DST mapping
          if (
            selectedPos === 'DEF' &&
            (playerPos === 'DEF' || playerPos === 'DST')
          ) {
            return true;
          }
          return playerPos === selectedPos;
        });
      }

      // Team filter
      if (this.selectedTeam() !== 'ALL') {
        filtered = filtered.filter(
          (player) =>
            (player.Team || (player as any).nflTeam || (player as any).team) ===
            this.selectedTeam()
        );
      }

      // Search filter
      if (this.searchQuery()) {
        const query = this.searchQuery().toLowerCase();
        filtered = filtered.filter((player) => {
          // Handle both name formats
          const name = (player as any).name?.toLowerCase() || '';
          const firstName = player.FirstName?.toLowerCase() || '';
          const lastName = player.LastName?.toLowerCase() || '';
          const fullName = name || `${firstName} ${lastName}`.trim();
          const team =
            (
              player.Team ||
              (player as any).nflTeam ||
              (player as any).team
            )?.toLowerCase() || '';
          return fullName.includes(query) || team.includes(query);
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
        // Handle both name formats
        aValue = (
          (a as any).name || `${a.FirstName || ''} ${a.LastName || ''}`.trim()
        ).toLowerCase();
        bValue = (
          (b as any).name || `${b.FirstName || ''} ${b.LastName || ''}`.trim()
        ).toLowerCase();
        break;
      case 'position':
        aValue = a.Position || (a as any).position || '';
        bValue = b.Position || (b as any).position || '';
        break;
      case 'team':
        aValue = a.Team || (a as any).nflTeam || (a as any).team || '';
        bValue = b.Team || (b as any).nflTeam || (b as any).team || '';
        break;
      case 'age':
        aValue = (a as any).age !== undefined ? (a as any).age : a.Age || 0;
        bValue = (b as any).age !== undefined ? (b as any).age : b.Age || 0;
        break;
      case 'experience':
        aValue =
          (a as any).yearsExp !== undefined
            ? (a as any).yearsExp
            : a.Experience || 0;
        bValue =
          (b as any).yearsExp !== undefined
            ? (b as any).yearsExp
            : b.Experience || 0;
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

  // Position options for radio buttons (fixed order)
  public positionFilterOptions: Array<{
    label: string;
    value: Position | 'ALL' | 'S';
  }> = [
    { label: 'All', value: 'ALL' },
    { label: 'QB', value: 'QB' },
    { label: 'RB', value: 'RB' },
    { label: 'WR', value: 'WR' },
    { label: 'TE', value: 'TE' },
    { label: 'K', value: 'K' },
    { label: 'DST', value: 'DEF' }, // DST maps to DEF in the data
    { label: 'DL', value: 'DL' },
    { label: 'LB', value: 'LB' },
    { label: 'S', value: 'S' },
  ];

  // Team options for filter
  public teamOptions = computed(() => {
    // Priority 1: Use getPlayers() function if provided
    if (this.config?.getPlayers) {
      const teams = [
        ...new Set(
          this.config
            .getPlayers()
            .map(
              (player) =>
                player.Team || (player as any).nflTeam || (player as any).team
            )
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
            .map(
              (player) =>
                player.Team || (player as any).nflTeam || (player as any).team
            )
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
            .map(
              (player) =>
                player.Team || (player as any).nflTeam || (player as any).team
            )
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
    effect(() => {
      // Wait for config to be set (it's an @Input, so it may not be available immediately)
      if (!this.config) {
        return;
      }

      const leagueId = this.config.leagueId;
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

    // Effect: Listen to active bids changes from free agency service
    effect(() => {
      if (this.isBidMode()) {
        const activeBids = this.freeAgencyService.activeBids();
        this._activeBids.set(activeBids);
      }
    });

    // Effect: Load contract team names for players with contracts
    effect(() => {
      if (this.isBidMode() && this.config?.leagueId) {
        const players = this._enhancedPlayers();
        players.forEach((player) => {
          if (this.isBidDisabled(player)) {
            // Load team name for players with contracts
            this.loadContractTeamName(player);
          }
        });
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
   * Now uses unified PlayerService
   */
  private async loadLeaguePlayers(leagueId: string): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      // Wait for sports data to be loaded
      await this.sportsDataService.waitForData();

      // Get league players from PlayerService (uses cache)
      const leaguePlayers = await this.playerService.getLeaguePlayers(leagueId);
      this._leaguePlayers.set(leaguePlayers);

      // Preload contracts for this league to populate cache
      await this.playerService.getPlayersWithContracts(leagueId);

      // Get all active sports players and enhance with league data using PlayerService
      const allSportsPlayers = this.sportsDataService.activePlayers();
      const enhancedPlayers = this.playerService.enhancePlayersWithLeagueData(
        allSportsPlayers,
        leaguePlayers
      );

      // Filter to only players that exist in league (have league data)
      const leaguePlayerIds = new Set(
        leaguePlayers.map((lp) => {
          const id = parseInt(lp.sportPlayerID || lp.playerId || '0');
          return isNaN(id) ? null : id;
        }).filter((id): id is number => id !== null)
      );

      const filteredEnhanced = enhancedPlayers.filter((p) =>
        leaguePlayerIds.has(p.PlayerID)
      );

      this._enhancedPlayers.set(filteredEnhanced);
    } catch (error) {
      console.error('[Players Table] Error loading league players:', error);
      this.error.set(
        error instanceof Error ? error.message : 'Failed to load league players'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Load all active contracts for a league and populate the cache
   * Now uses PlayerService cache
   */
  private async loadContractsForLeague(leagueId: string): Promise<void> {
    try {
      // Use PlayerService to get players with contracts (uses cache)
      const playersWithContracts = await this.playerService.getPlayersWithContracts(leagueId);
      this._playersWithContracts.set(playersWithContracts);
    } catch (error) {
      console.error('[Players Table] Error loading contracts:', error);
      // Don't throw - just log the error, cache will be empty
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
    } catch (error) {
      console.error('Error loading free agency data:', error);
    }
  }

  /**
   * Enhance league players with sports data by matching PlayerID
   * @deprecated Now handled by PlayerService.enhancePlayersWithLeagueData()
   * Kept for backward compatibility if needed
   */
  private async enhancePlayersWithSportsData(
    leaguePlayers: any[]
  ): Promise<void> {
    // This method is now handled in loadLeaguePlayers() using PlayerService
    // Keeping as no-op for backward compatibility
  }

  /**
   * Update search query
   */
  updateSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1); // Reset to first page
  }

  /**
   * Update position filter (radio button handler)
   */
  updatePositionFilter(position: Position | 'ALL' | 'S'): void {
    this.selectedPosition.set(position);
    this.currentPage.set(1); // Reset to first page
  }

  /**
   * Get position color for radio button styling
   */
  getPositionFilterColor(position: Position | 'ALL' | 'S'): string {
    const colorMap: Record<string, string> = {
      ALL: '#6b7280', // Gray for "All"
      QB: '#3b82f6', // Blue
      RB: '#10b981', // Green
      WR: '#f59e0b', // Amber
      TE: '#8b5cf6', // Purple
      K: '#ef4444', // Red
      DEF: '#6b7280', // Gray (DST)
      DL: '#dc2626', // Red
      LB: '#7c3aed', // Violet
      S: '#064e3b', // Dark green
    };
    return colorMap[position] || '#6b7280';
  }

  /**
   * Get position color class for row highlighting
   */
  getRowPositionColorClass(player: EnhancedSportsPlayer): string {
    const position = player.Position || (player as any).position;
    if (!position) return '';
    return `row-position--${position}`;
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
   * Handles both formats: SportsPlayer (FirstName/LastName) and Firestore league players (name)
   */
  getPlayerName(player: EnhancedSportsPlayer | any): string {
    // Check for Firestore league player format (name field)
    if ((player as any).name) {
      return (player as any).name;
    }

    // Check for SportsPlayer format (FirstName/LastName)
    const firstName = player.FirstName || '';
    const lastName = player.LastName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName) {
      return fullName;
    }

    // Fallback to Name field if available
    if (player.Name) {
      return player.Name;
    }

    return 'Unknown Player';
  }

  /**
   * Get player age from birth date or direct age field
   * Handles both formats: SportsPlayer (BirthDate/Age) and Firestore league players (age)
   */
  getPlayerAge(player: EnhancedSportsPlayer | any): number {
    // Check for direct age field (Firestore league players)
    if ((player as any).age !== undefined && (player as any).age !== null) {
      return (player as any).age;
    }

    // Check for Age field (SportsPlayer)
    if (player.Age !== undefined && player.Age !== null) {
      return player.Age;
    }

    // Calculate from BirthDate if available
    if (player.BirthDate) {
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

    return 0;
  }

  /**
   * Get player photo URL
   */
  getPlayerPhoto(player: EnhancedSportsPlayer): string {
    return player.PhotoUrl || '/assets/images/default-player.png';
  }

  /**
   * Get position display name
   * Handles both formats: SportsPlayer (Position) and Firestore league players (position)
   */
  getPositionDisplay(position: string | undefined): string {
    return position || 'Unknown';
  }

  /**
   * Get team display name
   */
  getTeamDisplay(team: string | undefined): string {
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
   * Handles both formats: SportsPlayer (Experience) and Firestore league players (yearsExp)
   */
  getExperienceDisplay(player: EnhancedSportsPlayer | any): string {
    // Check for yearsExp (Firestore league players)
    const exp =
      (player as any).yearsExp !== undefined
        ? (player as any).yearsExp
        : player.Experience || 0;
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
   * Excludes accepted and rejected bids - only counts active bids (pending, shortlisted, considering)
   */
  getPlayerBidCount(playerId: string | number): number {
    const id =
      typeof playerId === 'number'
        ? playerId
        : parseInt(playerId?.toString() || '0');
    if (!id || isNaN(id)) {
      return 0;
    }

    const activeBids = this._activeBids();
    const playerBids = activeBids.filter(
      (bid) =>
        bid.playerId === id &&
        bid.status !== 'accepted' &&
        bid.status !== 'rejected'
    );

    return playerBids.length;
  }

  /**
   * Check if current team has bid on a player
   */
  hasTeamBid(playerId: string | number): boolean {
    const id =
      typeof playerId === 'number'
        ? playerId
        : parseInt(playerId?.toString() || '0');
    if (!id || isNaN(id)) return false;

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
   * Check if a player has an active contract
   * Now uses PlayerService
   */
  async hasActiveContract(player: EnhancedSportsPlayer): Promise<boolean> {
    const leagueId = this.config?.leagueId;
    if (!leagueId) return false;

    // Use PlayerService to check contract
    return await this.playerService.hasActiveContract(
      player.PlayerID,
      leagueId
    );
  }

  /**
   * Check if bid button should be disabled/hidden
   * Uses PlayerService cache for synchronous check
   */
  isBidDisabled(player: EnhancedSportsPlayer): boolean {
    const leagueId = this.config?.leagueId;
    if (!leagueId) return false;

    // Check cache synchronously (PlayerService maintains cache)
    const playersWithContracts = this.playerService.playersWithContractsCache();
    const cached = playersWithContracts.get(leagueId);
    
    if (cached) {
      // Check if player has contract using leaguePlayerId if available, otherwise sportsPlayerId
      const leaguePlayerId = player.leaguePlayerId;
      if (leaguePlayerId && cached.has(leaguePlayerId)) {
        return true;
      }
      // Fallback to sportsPlayerId check
      if (cached.has(player.PlayerID.toString())) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get team name for a player with an active contract
   * Returns null if player has no contract
   */
  async getPlayerContractTeamName(
    player: EnhancedSportsPlayer
  ): Promise<string | null> {
    const leagueId = this.config?.leagueId;
    if (!leagueId) return null;

    try {
      // Get contract info
      const contract = await this.playerService.getPlayerContract(
        player.PlayerID,
        leagueId
      );

      if (!contract) {
        return null;
      }

      // Get team name from league members
      const leagueMembers = this.leagueService.leagueMembers();
      const teamMember = leagueMembers.find(
        (member) => member.teamId === contract.teamId
      );

      return teamMember?.teamName || 'Unknown Team';
    } catch (error) {
      console.error('[Players Table] Error getting contract team name:', error);
      return null;
    }
  }

  // Cache for contract team names (keyed by playerId or leaguePlayerId)
  private _contractTeamNames = signal<Map<string, string>>(new Map());

  /**
   * Get team name for a player with contract (synchronous, uses cache)
   */
  getPlayerContractTeamNameSync(player: EnhancedSportsPlayer): string | null {
    const leagueId = this.config?.leagueId;
    if (!leagueId) return null;

    // Check cache first
    const cache = this._contractTeamNames();
    // Try leaguePlayerId first, then sportsPlayerId
    const cacheKey = player.leaguePlayerId || player.PlayerID.toString();
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey) || null;
    }

    // Also check by sportsPlayerId if different
    if (player.leaguePlayerId && cache.has(player.PlayerID.toString())) {
      return cache.get(player.PlayerID.toString()) || null;
    }

    // If not in cache, trigger async load
    this.loadContractTeamName(player);

    return null;
  }

  /**
   * Load contract team name asynchronously and update cache
   */
  private async loadContractTeamName(player: EnhancedSportsPlayer): Promise<void> {
    const teamName = await this.getPlayerContractTeamName(player);
    if (teamName) {
      // Cache by both leaguePlayerId and sportsPlayerId for lookup flexibility
      const leaguePlayerId = player.leaguePlayerId;
      const sportsPlayerId = player.PlayerID.toString();
      
      this._contractTeamNames.update((cache) => {
        const newCache = new Map(cache);
        if (leaguePlayerId) {
          newCache.set(leaguePlayerId, teamName);
        }
        newCache.set(sportsPlayerId, teamName);
        return newCache;
      });
    }
  }

  /**
   * Handle bid button click
   */
  async onBidClick(player: EnhancedSportsPlayer): Promise<void> {
    // Double-check contract before allowing bid
    const hasContract = await this.hasActiveContract(player);
    if (hasContract) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Bid',
        detail: 'This player already has an active contract.',
        life: 3000,
      });
      return;
    }

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
    // TODO: Implement trade functionality
    // This could open a trade dialog or navigate to trade page
  }
}
