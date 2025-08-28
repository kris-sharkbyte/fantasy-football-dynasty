import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FreeAgencyService,
  FAWeekPlayer,
  FAWeekBid,
} from '../../../services/free-agency.service';
import { TeamService } from '../../../services/team.service';
import { LeagueService } from '../../../services/league.service';
import { LeagueMembershipService } from '../../../services/league-membership.service';
import { ContractOffer } from '@fantasy-football-dynasty/types';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ContractInputsComponent } from '../../../teams/negotiation/components/contract-inputs/contract-inputs.component';
import { SelectModule } from 'primeng/select';

type PositionOption = { label: string; value: string };
type PositionGroup = { label: string; items: PositionOption[] };

@Component({
  selector: 'app-fa-week',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconFieldModule,
    InputTextModule,
    InputIconModule,
    TableModule,
    TagModule,
    ButtonModule,
    ContractInputsComponent,
    SelectModule,
  ],
  templateUrl: './fa-week.component.html',
  styleUrls: ['./fa-week.component.scss'],
})
export class FAWeekComponent implements OnInit {
  private readonly freeAgencyService = inject(FreeAgencyService);
  private readonly teamService = inject(TeamService);
  private readonly leagueService = inject(LeagueService);
  private readonly leagueMembershipService = inject(LeagueMembershipService);

  // Private state signals
  private _selectedPlayer = signal<FAWeekPlayer | null>(null);
  private _showBidModal = signal<boolean>(false);
  private _bidForm = signal({
    years: 1,
    baseSalary: 0,
    signingBonus: 0,
  });
  private _isSubmitting = signal<boolean>(false);
  private _playerMinimum = signal<number | null>(null);
  private _marketContextSummary = signal<any>(null);
  private _isLoadingMore = signal<boolean>(false);
  private _hasMorePlayers = signal<boolean>(true);
  private _playerMinimumsCache = signal<Record<string, number | null>>({});

  // Public signals for template access
  public selectedPlayer = signal<FAWeekPlayer | null>(null);
  public showBidModal = signal<boolean>(false);
  public bidForm = signal({
    years: 1,
    baseSalary: 0,
    signingBonus: 0,
  });
  public isSubmitting = signal<boolean>(false);
  public playerMinimum = signal<number | null>(null);
  public marketContextSummary = signal<any>(null);
  public isLoadingMore = signal<boolean>(false);
  public hasMorePlayers = signal<boolean>(true);
  public currentTeamCap = signal<number>(0);
  public currentTeamBids = signal<any[]>([]);

  // Computed values
  public currentWeek = computed(() =>
    this.freeAgencyService.currentWeekNumber()
  );
  public isFAWeekPhase = computed(() => this.freeAgencyService.isFAWeekPhase());
  public weekStatus = computed(() => this.freeAgencyService.weekStatus());
  public readyTeamsCount = computed(() =>
    this.freeAgencyService.readyTeamsCount()
  );
  public totalTeamsCount = computed(() =>
    this.freeAgencyService.totalTeamsCount()
  );
  public isReadyToAdvance = computed(() =>
    this.freeAgencyService.isReadyToAdvance()
  );
  public availablePlayers = computed(() =>
    this.freeAgencyService.availablePlayers()
  );
  public activeBids = computed(() => this.freeAgencyService.activeBids());
  public teamBids = computed(() => this.currentTeamBids());

  // Salary cap calculations
  public remainingCapSpace = computed(() => {
    const totalCap = this.currentTeamCap();
    const totalBidsValue = this.currentTeamBids()
      .filter((bid: any) => bid.status === 'pending')
      .reduce((sum: number, bid: any) => sum + (bid.offer.totalValue || 0), 0);
    return totalCap - totalBidsValue;
  });

  public totalBidsValue = computed(() => {
    return this.currentTeamBids()
      .filter((bid: any) => bid.status === 'pending')
      .reduce((sum: number, bid: any) => sum + (bid.offer.totalValue || 0), 0);
  });

  // Form helpers
  public yearsOptions = computed(() => {
    try {
      const league = this.leagueService.selectedLeague();
      const maxYears = league?.rules?.contracts?.maxYears || 7;

      const options = [];
      for (let i = 1; i <= maxYears; i++) {
        options.push({ label: i.toString(), value: i });
      }
      return options;
    } catch (error) {
      console.warn('Error computing years options, using default:', error);
      // Fallback to default options
      return [
        { label: '1', value: 1 },
        { label: '2', value: 2 },
        { label: '3', value: 3 },
        { label: '4', value: 4 },
        { label: '5', value: 5 },
        { label: '6', value: 6 },
        { label: '7', value: 7 },
      ];
    }
  });
  public currentYear = new Date().getFullYear();

  // Position filtering
  public positionFilter = signal<string>('all');
  public searchQuery = signal<string>('');
  public availablePositionGroups = computed<PositionGroup[]>(() => {
    // collect unique positions from your players
    const posSet = new Set(
      this.availablePlayers().map((p) => p.position as string)
    );

    // canonical ordering you wanted
    const order: Record<string, number> = {
      // Offense
      QB: 1,
      RB: 2,
      WR: 3,
      TE: 4,
      FB: 5,
      OG: 6,
      OT: 7,
      // Defense
      DE: 101,
      DT: 102,
      DL: 103,
      NT: 104,
      LB: 105,
      LS: 106,
      ILB: 107,
      OLB: 108,
      CB: 109,
      FS: 110,
      S: 111,
      // Special Teams
      K: 201,
      P: 202,
    };

    const inSet = (...codes: string[]) => codes.filter((c) => posSet.has(c));
    const sortByOrder = (a: string, b: string) =>
      (order[a] ?? 9999) - (order[b] ?? 9999) || a.localeCompare(b);

    // groups per your spec
    const offense = inSet('QB', 'RB', 'WR', 'TE', 'FB', 'OG', 'OT').sort(
      sortByOrder
    );
    const defense = inSet(
      'DE',
      'DT',
      'DL',
      'NT',
      'LB',
      'LS',
      'ILB',
      'OLB',
      'CB',
      'FS',
      'S'
    ).sort(sortByOrder);
    const special = inSet('K', 'P').sort(sortByOrder);

    // anything else found gets tucked under "Other" at the end
    const known = new Set([...offense, ...defense, ...special]);
    const other = Array.from(posSet)
      .filter((c) => !known.has(c))
      .sort(sortByOrder);

    const toItems = (arr: string[]): PositionOption[] =>
      arr.map((c) => ({ label: c, value: c }));

    const groups: PositionGroup[] = [];
    if (offense.length)
      groups.push({ label: 'Offense', items: toItems(offense) });
    if (defense.length)
      groups.push({ label: 'Defense', items: toItems(defense) });
    if (special.length)
      groups.push({ label: 'Special Teams', items: toItems(special) });
    if (other.length) groups.push({ label: 'Other', items: toItems(other) });

    return groups;
  });

  // Filtered players based on position and search
  public filteredPlayers = computed(() => {
    let players = this.availablePlayers();
    const filter = this.positionFilter();
    const query = this.searchQuery()?.toLowerCase() || '';

    // Filter by position
    if (filter !== 'all') {
      players = players.filter((player) => player.position === filter);
    }

    // Filter by search query
    if (query) {
      players = players.filter(
        (player) =>
          player.name?.toLowerCase().includes(query) ||
          player.nflTeam?.toLowerCase().includes(query)
      );
    }

    return players;
  });

  // Position color mapping
  public getPositionColor(position: string): string {
    const colorMap: Record<string, string> = {
      QB: '#3B82F6', // Blue
      RB: '#10B981', // Green
      WR: '#F59E0B', // Amber
      TE: '#8B5CF6', // Purple
      K: '#EF4444', // Red
      DEF: '#6B7280', // Gray
      DL: '#DC2626', // Red
      LB: '#7C3AED', // Violet
      DB: '#059669', // Emerald
    };
    return colorMap[position] || '#6B7280'; // Default gray
  }

  /**
   * Select a player for bidding
   */
  selectPlayer(player: FAWeekPlayer): void {
    console.log('selectPlayer called for:', player.name);
    this.selectedPlayer.set(player);
    this.openBidModal();
  }

  /**
   * Open bid modal for selected player
   */
  openBidModal(): void {
    console.log('openBidModal called');
    const selectedPlayer = this.selectedPlayer();
    console.log('Selected player:', selectedPlayer);

    if (!selectedPlayer) {
      console.error('No player selected for bid modal');
      return;
    }

    // Initialize bid form for the selected player FIRST
    this.initializeBidForm(selectedPlayer);
    console.log('Bid form initialized:', this.bidForm());

    // Load player minimum and market context when opening modal
    this.loadPlayerData();

    // Only show modal after form is initialized
    console.log('Setting showBidModal to true');
    this.showBidModal.set(true);
    console.log('showBidModal is now:', this.showBidModal());
  }

  /**
   * Load player data for the bid modal
   */
  private async loadPlayerData(): Promise<void> {
    const player = this.selectedPlayer();
    if (!player) return;

    try {
      // Load player minimum
      await this.getPlayerMinimum(player.id);

      // Load market context summary
      await this.getMarketContextSummary();
    } catch (error) {
      console.error('Error loading player data:', error);
    }
  }

  /**
   * Initialize bid form with player-specific defaults
   */
  private initializeBidForm(player: FAWeekPlayer): void {
    // Get cached player minimum
    const cachedMinimum = this._playerMinimumsCache()[player.id];

    // Start with 1 year and use cached minimum if available
    this.bidForm.set({
      years: 1,
      baseSalary: cachedMinimum || 0,
      signingBonus: 0,
    });

    // Set the player minimum for the modal
    if (cachedMinimum) {
      this.playerMinimum.set(cachedMinimum);
    }

    console.log(
      'Bid form initialized:',
      this.bidForm(),
      'with minimum:',
      cachedMinimum
    );
  }

  /**
   * Update years and automatically adjust salary distribution
   */
  updateYears(years: number): void {
    const currentForm = this.bidForm();
    const currentTotalSalary = currentForm.baseSalary || 0;

    // For the new structure, we just update years and keep the total salary
    // The salary will be split when the contract is actually created
    this.bidForm.set({
      ...currentForm,
      years,
    });
  }

  /**
   * Update total salary
   */
  updateSalary(totalSalary: number): void {
    const currentForm = this.bidForm();

    this.bidForm.set({
      ...currentForm,
      baseSalary: totalSalary,
    });
  }

  /**
   * Update signing bonus
   */
  updateSigningBonus(bonus: number): void {
    const currentForm = this.bidForm();
    this.bidForm.set({
      ...currentForm,
      signingBonus: bonus,
    });
  }

  /**
   * Handle position filter change event
   */
  onPositionFilterChange(pos: PositionOption | null): void {
    const positionGroup = pos ?? { label: 'all', value: 'all' };
    console.log('onPositionFilterChange', positionGroup);
    this.positionFilter.set(positionGroup.value);
  }

  /**
   * Load additional players for pagination
   */
  async loadMorePlayers(): Promise<void> {
    if (this.isLoadingMore() || !this.hasMorePlayers()) return;

    try {
      this.isLoadingMore.set(true);

      const currentCount = this.availablePlayers().length;
      const additionalPlayers =
        await this.freeAgencyService.loadAdditionalPlayers(currentCount, 100);

      if (additionalPlayers.length === 0) {
        this.hasMorePlayers.set(false);
      } else {
        // Add new players to the existing list
        const allPlayers = [...this.availablePlayers(), ...additionalPlayers];
        // Note: This will update the UI through the service's signal
        console.log(
          `Loaded ${additionalPlayers.length} additional players, total: ${allPlayers.length}`
        );
      }
    } catch (error) {
      console.error('Error loading more players:', error);
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  /**
   * Handle search input changes with debouncing
   */
  onSearchInputChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);

    // Clear any existing timeout
    if ((this as any).searchTimeout) {
      clearTimeout((this as any).searchTimeout);
    }

    // Debounce search to avoid too many API calls
    (this as any).searchTimeout = setTimeout(() => {
      this.performSearch(value);
    }, 300);
  }

  /**
   * Perform search using the service
   */
  private async performSearch(query: string): Promise<void> {
    if (!query.trim()) {
      // If search is empty, reload initial players
      // Note: The service should handle this automatically
      return;
    }

    try {
      console.log('Performing search for:', query);
      const searchResults = await this.freeAgencyService.searchPlayers(query);
      console.log('Search results:', searchResults.length);

      // Update the search query to trigger filtered display
      // The filteredPlayers computed will handle the rest
    } catch (error) {
      console.error('Error performing search:', error);
    }
  }

  /**
   * Handle global search input changes for PrimeNG table
   */
  onGlobalSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  /**
   * Clear all filters and search
   */
  clearFilters(): void {
    this.positionFilter.set('all');
    this.searchQuery.set('');
  }

  /**
   * Calculate total contract value
   */
  calculateTotalValue(): number {
    const form = this.bidForm();
    return (form.baseSalary || 0) + (form.signingBonus || 0);
  }

  /**
   * Calculate total bid value (base salary + signing bonus)
   */
  private calculateTotalBidValue(): number {
    const form = this.bidForm();
    return (form.baseSalary || 0) + (form.signingBonus || 0);
  }

  /**
   * Calculate Average Annual Value (AAV) of the bid
   */
  public calculateAAV(): number {
    const totalValue = this.calculateTotalBidValue();
    return Math.round(totalValue / this.bidForm().years);
  }

  /**
   * Submit bid for selected player
   */
  async submitBid(): Promise<void> {
    if (this.isSubmitting()) return;

    const player = this.selectedPlayer();
    if (!player) return;

    try {
      this.isSubmitting.set(true);

      // Calculate total bid value
      const totalBidValue = this.calculateTotalBidValue();

      // Check if bid is below player's minimum
      const playerMinimum = this.playerMinimum();
      if (playerMinimum && totalBidValue < playerMinimum) {
        const shouldProceed = await this.showLowBidWarning(
          totalBidValue,
          playerMinimum
        );
        if (!shouldProceed) {
          return; // User cancelled the bid
        }
      }

      // Submit the bid
      const totalSalary = this.bidForm().baseSalary || 0;
      const years = this.bidForm().years;

      // Convert simple salary to yearly breakdown
      const baseSalaryByYear: Record<number, number> = {};
      for (let i = 1; i <= years; i++) {
        baseSalaryByYear[i] = Math.round(totalSalary / years);
      }

      const contractOffer: ContractOffer = {
        years: years as 1 | 2 | 3,
        baseSalary: baseSalaryByYear,
        signingBonus: this.bidForm().signingBonus || 0,
        guarantees: [],
        contractType: 'standard',
        totalValue: this.calculateTotalBidValue(),
        apy: this.calculateAAV(),
      };

      await this.freeAgencyService.submitBid(
        player.id,
        this.getCurrentTeamId(),
        contractOffer
      );

      // Close modal and reset form
      this.showBidModal.set(false);
      this.selectedPlayer.set(null);
      this.bidForm.set({
        years: 1,
        baseSalary: 0,
        signingBonus: 0,
      });

      // Refresh team data to show new bid
      await this.loadCurrentTeamData();

      console.log('Bid submitted successfully');
    } catch (error) {
      console.error('Error submitting bid:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Show warning when bid is below player's minimum
   */
  private async showLowBidWarning(
    bidAmount: number,
    playerMinimum: number
  ): Promise<boolean> {
    const difference = playerMinimum - bidAmount;
    const percentageBelow = ((difference / playerMinimum) * 100).toFixed(1);

    const message = `Warning: Your bid of $${bidAmount.toLocaleString()} is $${difference.toLocaleString()} below this player's minimum desired contract of $${playerMinimum.toLocaleString()} (${percentageBelow}% below minimum).

This player will likely reject your bid, which could:
• Reduce your team's trust rating with this player
• Make future negotiations more difficult
• Result in the player signing with another team

Are you sure you want to submit this bid anyway?`;

    return new Promise((resolve) => {
      // Using browser's built-in confirm dialog for now
      // In a production app, you might want to use a custom PrimeNG dialog
      const confirmed = window.confirm(message);
      resolve(confirmed);
    });
  }

  /**
   * Cancel bid modal
   */
  closeBidModal(): void {
    this.showBidModal.set(false);
    this.selectedPlayer.set(null);
    this.bidForm.set({
      years: 1,
      baseSalary: 0,
      signingBonus: 0,
    });
  }

  /**
   * Mark team as ready to advance
   */
  async markReady(): Promise<void> {
    try {
      const teamId = this.getCurrentTeamId();
      if (!teamId) {
        console.error('No team ID available');
        return;
      }

      await this.freeAgencyService.markTeamReady(teamId);

      // Refresh team data to show updated status
      await this.loadCurrentTeamData();

      // Refresh team statuses to update counts
      await this.refreshTeamStatuses();

      // Show success feedback
      console.log('Team marked as ready successfully');
      // TODO: Add toast notification
    } catch (error) {
      console.error('Error marking team ready:', error);
      // TODO: Add error notification
    }
  }

  /**
   * Advance to next week (commissioner only)
   */
  async advanceWeek(): Promise<void> {
    try {
      const success = await this.freeAgencyService.advanceToNextWeek();
      if (success) {
        // TODO: Show success message
      } else {
        throw new Error('Failed to advance week');
      }
    } catch (error) {
      console.error('Error advancing week:', error);
      // TODO: Show error message
    }
  }

  /**
   * Trigger weekly player evaluation manually (for testing)
   */
  async triggerWeeklyEvaluation(): Promise<void> {
    try {
      await this.freeAgencyService.triggerWeeklyEvaluation();
      // TODO: Show success message
    } catch (error) {
      console.error('Error triggering weekly evaluation:', error);
      // TODO: Show error message
    }
  }

  /**
   * Get current team ID from league membership service
   */
  private getCurrentTeamId(): string {
    const currentLeague = this.leagueService.selectedLeague();
    if (!currentLeague) {
      console.error('No league selected');
      return '';
    }

    // Get current user's team ID from league membership
    const memberships = this.leagueMembershipService.userMemberships();
    const myMembership = memberships.find(
      (m) => m.leagueId === currentLeague.id && m.isActive
    );

    if (!myMembership?.teamId) {
      console.error(
        'Team not found for current user in league:',
        currentLeague.id
      );
      return '';
    }

    return myMembership.teamId;
  }

  /**
   * Get player bid count
   */
  getPlayerBidCount(playerId: string): number {
    return this.freeAgencyService.getPlayerBids(playerId).length;
  }

  /**
   * Check if player has bids from current team
   */
  hasTeamBid(playerId: string): boolean {
    const teamBids = this.currentTeamBids();
    return teamBids.some((bid: any) => bid.playerId === playerId);
  }

  /**
   * Get player status display text
   */
  getPlayerStatusText(status: string): string {
    switch (status) {
      case 'available':
        return 'Available';
      case 'bidding':
        return 'Bidding Active';
      case 'evaluating':
        return 'Evaluating Offers';
      case 'signed':
        return 'Signed';
      case 'shortlisted':
        return 'Shortlisted';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get player status CSS class
   */
  getPlayerStatusClass(status: string): string {
    switch (status) {
      case 'available':
        return 'status-available';
      case 'bidding':
        return 'status-bidding';
      case 'evaluating':
        return 'status-evaluating';
      case 'signed':
        return 'status-signed';
      case 'shortlisted':
        return 'status-shortlisted';
      default:
        return 'status-unknown';
    }
  }

  /**
   * Get player status severity for PrimeNG tags
   */
  getPlayerStatusSeverity(status: string): string {
    switch (status) {
      case 'available':
        return 'success';
      case 'bidding':
        return 'info';
      case 'evaluating':
        return 'warning';
      case 'signed':
        return 'success';
      case 'shortlisted':
        return 'warning';
      default:
        return 'secondary';
    }
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
   * Get player name by ID
   */
  getPlayerName(playerId: string): string {
    const player = this.availablePlayers().find((p) => p.id === playerId);
    return player?.name || 'Unknown Player';
  }

  /**
   * Get player position by ID
   */
  getPlayerPosition(playerId: string): string {
    const player = this.availablePlayers().find((p) => p.id === playerId);
    return player?.position || 'Unknown';
  }

  /**
   * Get player minimum for display in table (from cache)
   */
  getPlayerMinimumForDisplay(playerId: string): number | null {
    const cache = this._playerMinimumsCache();
    return cache[playerId] || null;
  }

  /**
   * Get enhanced player minimum
   */
  async getPlayerMinimum(playerId: string): Promise<number | null> {
    const cache = this._playerMinimumsCache();
    if (cache[playerId] !== undefined) {
      return cache[playerId];
    }

    try {
      const minimum = await this.freeAgencyService.getEnhancedPlayerMinimum(
        playerId
      );
      this._playerMinimumsCache.update((cache) => ({
        ...cache,
        [playerId]: minimum,
      }));
      this.playerMinimum.set(minimum);
      return minimum;
    } catch (error) {
      console.error('Error getting player minimum:', error);
      this._playerMinimumsCache.update((cache) => ({
        ...cache,
        [playerId]: null,
      }));
      this.playerMinimum.set(null);
      return null;
    }
  }

  /**
   * Get market context summary
   */
  async getMarketContextSummary(): Promise<any> {
    try {
      const summary = await this.freeAgencyService.getMarketContextSummary();
      this.marketContextSummary.set(summary);
      return summary;
    } catch (error) {
      console.error('Error getting market context summary:', error);
      this.marketContextSummary.set(null);
      return null;
    }
  }

  /**
   * Get total salary for display
   */
  getTotalSalary(): number {
    const form = this.bidForm();
    return form.baseSalary || 0;
  }

  /**
   * Check if the bid is valid
   */
  public isValidBid(): boolean {
    const form = this.bidForm();
    const totalValue = this.calculateTotalBidValue();

    // Basic validation
    if (!form.years || !form.baseSalary || totalValue <= 0) {
      return false;
    }

    // Check if bid is below player's minimum (but still allow it with warning)
    const playerMinimum = this.playerMinimum();
    if (playerMinimum && totalValue < playerMinimum) {
      // Bid is below minimum but still valid (user will get warning)
      return true;
    }

    return true;
  }

  /**
   * Check if bid is below player's minimum
   */
  public isBidBelowMinimum(): boolean {
    const playerMinimum = this.playerMinimum();
    if (!playerMinimum) return false;

    const totalValue = this.calculateTotalBidValue();
    return totalValue < playerMinimum;
  }

  /**
   * Cancel a pending bid
   */
  async cancelBid(bidId: string): Promise<void> {
    try {
      const success = await this.freeAgencyService.cancelBid(bidId);
      if (success) {
        console.log('Bid cancelled successfully');
        // TODO: Show success message
      } else {
        throw new Error('Failed to cancel bid');
      }
    } catch (error) {
      console.error('Error cancelling bid:', error);
      // TODO: Show error message
    }
  }

  /**
   * Refresh available players data
   */
  private async refreshAvailablePlayers(): Promise<void> {
    try {
      // Trigger a refresh of available players in the service
      await this.freeAgencyService.loadCurrentFAWeek();

      // Wait a bit for the data to update
      setTimeout(() => {
        console.log('Refreshed players count:', this.availablePlayers().length);
        const firstPlayers = this.availablePlayers().slice(0, 3);
        firstPlayers.forEach((player, index) => {
          console.log(`Refreshed Player ${index + 1}:`, {
            name: player.name,
            age: player.age,
            position: player.position,
            overall: player.overall,
          });
        });
      }, 500);
    } catch (error) {
      console.error('Error refreshing available players:', error);
    }
  }

  ngOnInit(): void {
    // Load initial data
    this.loadInitialData();

    // Debug: Check if players are loaded
    console.log('FA Week Component initialized');
    console.log('Available players count:', this.availablePlayers().length);
    console.log('Available players:', this.availablePlayers());

    // Debug: Check first few players for age data
    const firstPlayers = this.availablePlayers().slice(0, 3);
    firstPlayers.forEach((player, index) => {
      console.log(`Player ${index + 1}:`, {
        name: player.name,
        age: player.age,
        position: player.position,
        overall: player.overall,
      });
    });

    // If no players are loaded, try to trigger loading
    if (this.availablePlayers().length === 0) {
      console.log('No players loaded, checking service state...');
      // The service should auto-load players, but let's add a small delay and check again
      setTimeout(() => {
        console.log(
          'After delay - Available players count:',
          this.availablePlayers().length
        );
        console.log(
          'After delay - Available players:',
          this.availablePlayers()
        );

        // Preload minimums for first few players to populate cache
        this.preloadPlayerMinimums();
      }, 1000);
    } else {
      // Preload minimums for first few players to populate cache
      this.preloadPlayerMinimums();
    }

    // Add a longer delay to refresh players if they still don't have age data
    setTimeout(() => {
      const playersWithAge = this.availablePlayers().filter(
        (p) => p.age && p.age > 0
      );
      if (playersWithAge.length === 0) {
        console.log('No players with age data found, refreshing...');
        this.refreshAvailablePlayers();
      }
    }, 3000);
  }

  /**
   * Preload player minimums for the first few players to populate the cache
   */
  private async preloadPlayerMinimums(): Promise<void> {
    const players = this.availablePlayers();
    if (players.length === 0) return;

    // Load minimums for first 10 players to populate cache
    const playersToLoad = players.slice(0, 10);

    for (const player of playersToLoad) {
      try {
        await this.getPlayerMinimum(player.id);
      } catch (error) {
        console.error(`Error preloading minimum for ${player.name}:`, error);
      }
    }
  }

  /**
   * Load initial data for the component
   */
  private async loadInitialData(): Promise<void> {
    try {
      // Load market context summary
      await this.getMarketContextSummary();

      // Load current team data
      await this.loadCurrentTeamData();
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }

  /**
   * Load current team's data including cap space and bids
   */
  private async loadCurrentTeamData(): Promise<void> {
    try {
      const teamId = this.getCurrentTeamId();
      if (!teamId) {
        console.warn('No team ID available, skipping team data load');
        return;
      }

      // Load team's cap space
      const team = await this.teamService.getTeam(teamId);
      if (team) {
        this.currentTeamCap.set(team.capSpace || 200000000); // Default 200M if not set
      }

      // Load team's bids
      const teamBids = this.freeAgencyService.getTeamBids(teamId);
      this.currentTeamBids.set(teamBids);

      console.log('Loaded team data:', {
        teamId,
        capSpace: team?.capSpace,
        bidsCount: teamBids.length,
      });
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  }

  /**
   * Refresh team statuses to get accurate team counts
   */
  private async refreshTeamStatuses(): Promise<void> {
    try {
      // Trigger a refresh of team statuses in the service
      // This will update the readyTeamsCount and totalTeamsCount
      await this.freeAgencyService.loadCurrentFAWeek();
    } catch (error) {
      console.error('Error refreshing team statuses:', error);
    }
  }

  /**
   * Refresh current team's bids data
   */
  private refreshTeamBids(): void {
    const teamId = this.getCurrentTeamId();
    if (teamId) {
      const teamBids = this.freeAgencyService.getTeamBids(teamId);
      this.currentTeamBids.set(teamBids);
    }
  }

  // ============================================================================
  // CONTRACT INPUTS EVENT HANDLERS
  // ============================================================================

  /**
   * Handle years change from contract inputs
   */
  onYearsChange(newYears: number): void {
    this.bidForm.update((form) => ({
      ...form,
      years: newYears,
    }));
    this.refreshTeamBids();
  }

  /**
   * Handle base salary change from contract inputs
   */
  onBaseSalaryChange(newSalary: number): void {
    this.bidForm.update((form) => ({
      ...form,
      baseSalary: newSalary,
    }));
    this.refreshTeamBids();
  }

  /**
   * Handle signing bonus change from contract inputs
   */
  onSigningBonusChange(newBonus: number): void {
    this.bidForm.update((form) => ({
      ...form,
      signingBonus: newBonus,
    }));
    this.refreshTeamBids();
  }
}
