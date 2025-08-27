import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FreeAgencyService,
  FAWeekPlayer,
  FAWeekBid,
} from '../../../services/free-agency.service';
import { TeamService } from '../../../services/team.service';
import { ContractOffer } from '@fantasy-football-dynasty/types';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import {
  ContractInputsComponent,
  ContractFormData,
} from '../../../teams/negotiation/components/contract-inputs/contract-inputs.component';
import { SelectModule } from 'primeng/select';

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

  // Private state signals
  private _selectedPlayer = signal<FAWeekPlayer | null>(null);
  private _showBidModal = signal<boolean>(false);
  private _bidForm = signal<ContractFormData>({
    years: 1,
    baseSalary: { 1: 0 },
    signingBonus: 0,
  });
  private _isSubmitting = signal<boolean>(false);
  private _playerMinimum = signal<number | null>(null);
  private _marketContextSummary = signal<any>(null);
  private _isLoadingMore = signal<boolean>(false);
  private _hasMorePlayers = signal<boolean>(true);

  // Public signals
  public selectedPlayer = this._selectedPlayer.asReadonly();
  public showBidModal = this._showBidModal.asReadonly();
  public bidForm = this._bidForm.asReadonly();
  public isSubmitting = this._isSubmitting.asReadonly();
  public playerMinimum = this._playerMinimum.asReadonly();
  public marketContextSummary = this._marketContextSummary.asReadonly();
  public isLoadingMore = this._isLoadingMore.asReadonly();
  public hasMorePlayers = this._hasMorePlayers.asReadonly();

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
  public teamBids = computed(() =>
    this.freeAgencyService.getTeamBids(this.getCurrentTeamId())
  );

  // Form helpers
  public yearsOptions = [1, 2, 3];
  public currentYear = new Date().getFullYear();

  // Position filtering
  public positionFilter = signal<string>('all');
  public searchQuery = signal<string>('');
  public availablePositions = computed(() => {
    const positions = [
      ...new Set(this.availablePlayers().map((p) => p.position)),
    ];
    return ['all', ...positions.sort()];
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
    this._selectedPlayer.set(player);
    this.openBidModal();
  }

  /**
   * Open bid modal for selected player
   */
  openBidModal(): void {
    if (!this._selectedPlayer()) return;

    // Load player minimum and market context when opening modal
    this.loadPlayerData();

    this._showBidModal.set(true);
  }

  /**
   * Load player data for the bid modal
   */
  private async loadPlayerData(): Promise<void> {
    const player = this._selectedPlayer();
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
    // Start with 1 year and 0 values
    this._bidForm.set({
      years: 1,
      baseSalary: { 1: 0 },
      signingBonus: 0,
    });
  }

  /**
   * Update contract years and automatically split salary across years
   */
  updateYears(years: number): void {
    const currentForm = this._bidForm();
    const currentTotalSalary = currentForm.baseSalary[1] || 0;

    // Create new base salary object with salary split across years
    const newBaseSalary: Record<number, number> = {};
    for (let i = 1; i <= years; i++) {
      newBaseSalary[i] = Math.round(currentTotalSalary / years);
    }

    this._bidForm.set({
      ...currentForm,
      years,
      baseSalary: newBaseSalary,
    });
  }

  /**
   * Update total salary and automatically split across years
   */
  updateSalary(totalSalary: number): void {
    const currentForm = this._bidForm();
    const years = currentForm.years;

    // Split salary evenly across all years
    const newBaseSalary: Record<number, number> = {};
    for (let i = 1; i <= years; i++) {
      newBaseSalary[i] = Math.round(totalSalary / years);
    }

    this._bidForm.set({
      ...currentForm,
      baseSalary: newBaseSalary,
    });
  }

  /**
   * Update signing bonus
   */
  updateSigningBonus(bonus: number): void {
    const currentForm = this._bidForm();
    this._bidForm.set({
      ...currentForm,
      signingBonus: bonus,
    });
  }

  /**
   * Update position filter
   */
  updatePositionFilter(position: string): void {
    this.positionFilter.set(position);
  }

  /**
   * Handle position filter change event
   */
  onPositionFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.updatePositionFilter(target.value);
  }

  /**
   * Load additional players for pagination
   */
  async loadMorePlayers(): Promise<void> {
    if (this._isLoadingMore() || !this._hasMorePlayers()) return;

    try {
      this._isLoadingMore.set(true);

      const currentCount = this.availablePlayers().length;
      const additionalPlayers =
        await this.freeAgencyService.loadAdditionalPlayers(currentCount, 100);

      if (additionalPlayers.length === 0) {
        this._hasMorePlayers.set(false);
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
      this._isLoadingMore.set(false);
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
    const form = this._bidForm();
    if (!form.baseSalary) return 0;

    const totalSalary = Object.values(form.baseSalary).reduce(
      (sum, salary) => sum + salary,
      0
    );
    return totalSalary + (form.signingBonus || 0);
  }

  /**
   * Calculate total bid value (base salary + signing bonus)
   */
  private calculateTotalBidValue(): number {
    const form = this._bidForm();
    const totalBaseSalary = Object.values(form.baseSalary).reduce((sum, salary) => sum + salary, 0);
    return totalBaseSalary + form.signingBonus;
  }

  /**
   * Calculate Average Annual Value (AAV) of the bid
   */
  public calculateAAV(): number {
    const totalValue = this.calculateTotalBidValue();
    return Math.round(totalValue / this._bidForm().years);
  }

  /**
   * Submit bid for selected player
   */
  async submitBid(): Promise<void> {
    if (this._isSubmitting()) return;

    const player = this.selectedPlayer();
    if (!player) return;

    try {
      this._isSubmitting.set(true);

      // Calculate total bid value
      const totalBidValue = this.calculateTotalBidValue();
      
      // Check if bid is below player's minimum
      const playerMinimum = this._playerMinimum();
      if (playerMinimum && totalBidValue < playerMinimum) {
        const shouldProceed = await this.showLowBidWarning(totalBidValue, playerMinimum);
        if (!shouldProceed) {
          return; // User cancelled the bid
        }
      }

      // Submit the bid
      const contractOffer: ContractOffer = {
        years: this._bidForm().years as 1 | 2 | 3,
        baseSalary: this._bidForm().baseSalary,
        signingBonus: this._bidForm().signingBonus || 0,
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
      this._showBidModal.set(false);
      this._selectedPlayer.set(null);
      this._bidForm.set({
        years: 1,
        baseSalary: { 1: 0 },
        signingBonus: 0,
      });

      console.log('Bid submitted successfully');
    } catch (error) {
      console.error('Error submitting bid:', error);
    } finally {
      this._isSubmitting.set(false);
    }
  }

  /**
   * Show warning when bid is below player's minimum
   */
  private async showLowBidWarning(bidAmount: number, playerMinimum: number): Promise<boolean> {
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
    this._showBidModal.set(false);
    this._selectedPlayer.set(null);
    this._bidForm.set({
      years: 1,
      baseSalary: { 1: 0 },
      signingBonus: 0,
    });
  }

  /**
   * Mark team as ready to advance
   */
  async markReady(): Promise<void> {
    try {
      await this.freeAgencyService.markTeamReady(this.getCurrentTeamId());
      // TODO: Show success message
    } catch (error) {
      console.error('Error marking team ready:', error);
      // TODO: Show error message
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
   * Get current team ID (placeholder - should be injected from team service)
   */
  private getCurrentTeamId(): string {
    // TODO: This should come from a team service or user context
    // For now, returning a placeholder - you'll need to implement this
    return 'team_placeholder_id';
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
    const teamBids = this.teamBids();
    return teamBids.some((bid) => bid.playerId === playerId);
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
   * Get enhanced player minimum
   */
  async getPlayerMinimum(playerId: string): Promise<number | null> {
    try {
      const minimum = await this.freeAgencyService.getEnhancedPlayerMinimum(
        playerId
      );
      this._playerMinimum.set(minimum);
      return minimum;
    } catch (error) {
      console.error('Error getting player minimum:', error);
      this._playerMinimum.set(null);
      return null;
    }
  }

  /**
   * Get market context summary
   */
  async getMarketContextSummary(): Promise<any> {
    try {
      const summary = await this.freeAgencyService.getMarketContextSummary();
      this._marketContextSummary.set(summary);
      return summary;
    } catch (error) {
      console.error('Error getting market context summary:', error);
      this._marketContextSummary.set(null);
      return null;
    }
  }

  /**
   * Get total salary for display (sum of all years)
   */
  getTotalSalary(): number {
    const form = this._bidForm();
    if (!form.baseSalary) return 0;
    return Object.values(form.baseSalary).reduce(
      (sum, salary) => sum + salary,
      0
    );
  }

  /**
   * Check if the bid is valid
   */
  public isValidBid(): boolean {
    const form = this._bidForm();
    const totalValue = this.calculateTotalBidValue();
    
    // Basic validation
    if (!form.years || !form.baseSalary || totalValue <= 0) {
      return false;
    }

    // Check if bid is below player's minimum (but still allow it with warning)
    const playerMinimum = this._playerMinimum();
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
    const playerMinimum = this._playerMinimum();
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

  ngOnInit(): void {
    // Load initial data
    this.loadInitialData();

    // Debug: Check if players are loaded
    console.log('FA Week Component initialized');
    console.log('Available players count:', this.availablePlayers().length);
    console.log('Available players:', this.availablePlayers());

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
      }, 1000);
    }
  }

  /**
   * Load initial data for the component
   */
  private async loadInitialData(): Promise<void> {
    try {
      // Load market context summary
      await this.getMarketContextSummary();
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }
}
