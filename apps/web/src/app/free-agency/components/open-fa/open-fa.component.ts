import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FreeAgencyService,
  FAWeekPlayer,
} from '../../../services/free-agency.service';
import { TeamService } from '../../../services/team.service';
import { SportsDataService } from '../../../services/sports-data.service';
import { PlayersTableComponent } from '../../../shared/components/players-table/players-table.component';
import { LeagueService } from '../../../services/league.service';

@Component({
  selector: 'app-open-fa',
  standalone: true,
  imports: [CommonModule, FormsModule, PlayersTableComponent],
  templateUrl: './open-fa.component.html',
  styleUrls: ['./open-fa.component.scss'],
})
export class OpenFAComponent {
  private readonly freeAgencyService = inject(FreeAgencyService);
  private readonly teamService = inject(TeamService);
  private readonly sportsDataService = inject(SportsDataService);
  private readonly leagueService = inject(LeagueService);

  // Component state
  private _selectedPlayer = signal<FAWeekPlayer | null>(null);
  private _showSigningModal = signal<boolean>(false);
  private _searchQuery = signal<string>('');
  private _positionFilter = signal<string>('');

  // Public signals
  public selectedPlayer = this._selectedPlayer.asReadonly();
  public showSigningModal = this._showSigningModal.asReadonly();
  public searchQuery = this._searchQuery.asReadonly();
  public positionFilter = this._positionFilter.asReadonly();

  // Computed values
  public isOpenFAPhase = computed(() => this.freeAgencyService.isOpenFAPhase());
  public availablePlayers = computed(() =>
    this.freeAgencyService.availablePlayers()
  );
  public filteredPlayers = computed(() => this.getFilteredPlayers());

  // Filter options
  public positionOptions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

  // Form helpers
  public yearsOptions = [1, 2, 3];
  public currentYear = new Date().getFullYear();

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

  // Players table configuration for Open FA
  public playersTableConfig = computed(() => ({
    title: 'Available Players',
    subtitle: 'Sign players immediately to 1-year contracts',
    emptyMessage: 'No players available for signing',
    showFilters: true,
    showSearch: true,
    showPagination: true,
    pageSize: 20,
    mode: 'sign' as const,
    actions: [],
    leagueId: this.leagueService.selectedLeague()?.id,
    showBidCounts: false,
    showEstimatedMinimum: false,
    showMarketTrends: false,
    onSignClick: (player: any) => this.selectPlayer(player),
    onPlayerClick: (player: any) => this.selectPlayer(player),
  }));

  /**
   * Select a player for immediate signing
   */
  selectPlayer(player: FAWeekPlayer): void {
    this._selectedPlayer.set(player);
    this._showSigningModal.set(true);
  }

  /**
   * Update search query
   */
  updateSearchQuery(event: Event): void {
    const target = event.target as HTMLInputElement;
    this._searchQuery.set(target.value);
  }

  /**
   * Update position filter
   */
  updatePositionFilter(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this._positionFilter.set(target.value);
  }

  /**
   * Handle position filter change event
   */
  onPositionFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this._positionFilter.set(target.value);
  }

  /**
   * Get filtered players based on search and position
   */
  private getFilteredPlayers(): FAWeekPlayer[] {
    let players = this.availablePlayers();
    const query = this._searchQuery().toLowerCase();
    const position = this._positionFilter();

    // Filter by search query
    if (query) {
      players = players.filter(
        (player) =>
          player.name.toLowerCase().includes(query) ||
          player.nflTeam.toLowerCase().includes(query)
      );
    }

    // Filter by position
    if (position) {
      players = players.filter((player) => player.position === position);
    }

    // Only show available players
    players = players.filter((player) => player.status === 'available');

    return players;
  }

  /**
   * Process immediate signing for selected player
   */
  async processSigning(): Promise<void> {
    try {
      const player = this._selectedPlayer();
      if (!player) return;

      const signing = await this.freeAgencyService.processOpenFASigning(
        player.id,
        this.getCurrentTeamId()
      );

      if (signing) {
        console.log('Player signed successfully:', signing);
        this.closeSigningModal();
        // TODO: Show success message
      } else {
        throw new Error('Failed to sign player');
      }
    } catch (error) {
      console.error('Error signing player:', error);
      // TODO: Show error message
    }
  }

  /**
   * Close signing modal
   */
  closeSigningModal(): void {
    this._showSigningModal.set(false);
    this._selectedPlayer.set(null);
  }

  /**
   * Get current team ID
   */
  private getCurrentTeamId(): string {
    // TODO: Get from team service or auth
    return 'team1'; // Mock for now
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
   * Clear all filters
   */
  clearFilters(): void {
    this._searchQuery.set('');
    this._positionFilter.set('');
  }

  /**
   * Get estimated market price for player
   */
  getEstimatedMarketPrice(player: FAWeekPlayer): number {
    // Simple estimation based on overall rating
    // In production, this would use the domain logic
    const basePrice = player.overall * 100000; // $100k per overall point

    // Apply position multipliers
    let multiplier = 1.0;
    switch (player.position) {
      case 'QB':
        multiplier = 1.2;
        break;
      case 'RB':
        multiplier = 0.9;
        break;
      case 'WR':
        multiplier = 1.0;
        break;
      case 'TE':
        multiplier = 0.8;
        break;
      case 'K':
        multiplier = 0.3;
        break;
      case 'DEF':
        multiplier = 0.6;
        break;
    }

    return Math.round(basePrice * multiplier);
  }

  /**
   * Get discounted price for open FA
   */
  getDiscountedPrice(player: FAWeekPlayer): number {
    const marketPrice = this.getEstimatedMarketPrice(player);
    const discount = 0.2; // 20% discount
    return Math.round(marketPrice * (1 - discount));
  }
}
