import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FreeAgencyService,
  FAWeekPlayer,
  FAWeekBid,
} from '../../../services/free-agency.service';
import { TeamService } from '../../../services/team.service';
import { PlayerDataService } from '../../../services/player-data.service';
import { ContractOffer } from '@fantasy-football-dynasty/types';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  selector: 'app-fa-week',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconFieldModule,
    InputTextModule,
    InputIconModule,
  ],
  templateUrl: './fa-week.component.html',
  styleUrls: ['./fa-week.component.scss'],
})
export class FAWeekComponent {
  private readonly freeAgencyService = inject(FreeAgencyService);
  private readonly teamService = inject(TeamService);
  private readonly playerDataService = inject(PlayerDataService);

  // Component state
  private _selectedPlayer = signal<FAWeekPlayer | null>(null);
  private _showBidModal = signal<boolean>(false);
  private _bidForm = signal<Partial<ContractOffer>>({
    years: 1,
    baseSalary: {},
    signingBonus: 0,
    guarantees: [],
  });

  // Public signals
  public selectedPlayer = this._selectedPlayer.asReadonly();
  public showBidModal = this._showBidModal.asReadonly();
  public bidForm = this._bidForm.asReadonly();

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
   * Select a player to bid on
   */
  selectPlayer(player: FAWeekPlayer): void {
    this._selectedPlayer.set(player);
    this.initializeBidForm(player);
    this._showBidModal.set(true);
  }

  /**
   * Initialize bid form with player-specific defaults
   */
  private initializeBidForm(player: FAWeekPlayer): void {
    const baseSalary: Record<number, number> = {};
    const currentYear = new Date().getFullYear();

    // Set base salary for each year
    for (let i = 0; i < 3; i++) {
      const year = currentYear + i;
      baseSalary[year] = 0;
    }

    this._bidForm.set({
      years: 1,
      baseSalary,
      signingBonus: 0,
      guarantees: [],
    });
  }

  /**
   * Update base salary for a specific year
   */
  updateBaseSalary(year: number, value: number): void {
    const currentForm = this._bidForm();
    const updatedBaseSalary = { ...currentForm.baseSalary, [year]: value };
    this._bidForm.set({ ...currentForm, baseSalary: updatedBaseSalary });
  }

  updateSigningBonus(value: number): void {
    const currentForm = this._bidForm();
    this._bidForm.set({ ...currentForm, signingBonus: value });
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
   * Handle search input changes
   */
  onSearchInputChange(event: Event): void {
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
   * Update contract years and adjust base salary accordingly
   */
  updateYears(years: number): void {
    // Validate that years is one of the allowed values
    if (years === 1 || years === 2 || years === 3) {
      const currentForm = this._bidForm();
      this._bidForm.set({ ...currentForm, years: years as 1 | 2 | 3 });
    }
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
   * Calculate average annual value
   */
  calculateAAV(): number {
    const totalValue = this.calculateTotalValue();
    const years = this._bidForm()?.years || 1;
    return years > 0 ? Math.round(totalValue / years) : 0;
  }

  /**
   * Submit bid for selected player
   */
  async submitBid(): Promise<void> {
    try {
      const player = this._selectedPlayer();
      const form = this._bidForm();

      if (!player || !form.years || !form.baseSalary) {
        throw new Error('Invalid bid form');
      }

      // Create contract offer
      const contractOffer: ContractOffer = {
        years: form.years as 1 | 2 | 3,
        baseSalary: form.baseSalary,
        signingBonus: form.signingBonus || 0,
        guarantees: form.guarantees || [],
        contractType: 'standard',
        totalValue: this.calculateTotalValue(),
        apy: this.calculateAAV(),
      };

      // Submit bid
      const bid = await this.freeAgencyService.submitBid(
        player.id,
        this.getCurrentTeamId(),
        contractOffer
      );

      if (bid) {
        console.log('Bid submitted successfully:', bid);
        this.closeBidModal();
        // TODO: Show success message
      } else {
        throw new Error('Failed to submit bid');
      }
    } catch (error) {
      console.error('Error submitting bid:', error);
      // TODO: Show error message
    }
  }

  /**
   * Cancel bid modal
   */
  closeBidModal(): void {
    this._showBidModal.set(false);
    this._selectedPlayer.set(null);
    this._bidForm.set({});
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
   * Get current team ID
   */
  private getCurrentTeamId(): string {
    // TODO: Get from team service or auth
    return 'team1'; // Mock for now
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
   * Get salary years based on selected contract length
   */
  getSalaryYears(): number[] {
    const years = this._bidForm()?.years || 1;
    const currentYear = new Date().getFullYear();
    const salaryYears: number[] = [];

    for (let i = 0; i < years; i++) {
      salaryYears.push(currentYear + i);
    }

    return salaryYears;
  }

  /**
   * Get base salary for a specific year
   */
  getBaseSalary(year: number): number {
    return this._bidForm()?.baseSalary?.[year] || 0;
  }

  /**
   * Check if bid form is valid
   */
  isValidBid(): boolean {
    const form = this._bidForm();
    if (!form.years || !form.baseSalary) return false;

    // Check if all years have salary values
    const salaryYears = this.getSalaryYears();
    const hasAllSalaries = salaryYears.every(
      (year) => form.baseSalary?.[year] && form.baseSalary[year] > 0
    );

    return hasAllSalaries;
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
}
