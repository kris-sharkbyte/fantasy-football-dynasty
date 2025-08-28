import {
  Component,
  inject,
  signal,
  computed,
  Output,
  EventEmitter,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FreeAgencyService } from '../../../../../services/free-agency.service';
import { EnhancedPlayerMinimumService } from '../../../../../services/enhanced-player-minimum.service';
import { LeagueService } from '../../../../../services/league.service';

@Component({
  selector: 'app-available-players',
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
    SelectModule,
  ],
  templateUrl: './available-players.component.html',
  styleUrls: ['./available-players.component.scss'],
})
export class AvailablePlayersComponent {
  private readonly freeAgencyService = inject(FreeAgencyService);
  private readonly enhancedPlayerMinimumService = inject(
    EnhancedPlayerMinimumService
  );
  private readonly leagueService = inject(LeagueService);

  // Outputs
  @Output() bidButtonClick = new EventEmitter<any>();

  // State signals
  public positionFilter = signal<string>('all');
  public searchQuery = signal<string>('');
  public isLoadingMore = signal<boolean>(false);
  public hasMorePlayers = signal<boolean>(true);
  public playerMinimums = signal<Record<string, number | null>>({});

  // Sorting state
  public sortField = signal<string>('name');
  public sortOrder = signal<number>(1); // 1 for ascending, -1 for descending

  // Computed values from services - now using cached data
  public availablePlayers = computed(() =>
    this.freeAgencyService.availablePlayers()
  );
  public activeBids = computed(() => this.freeAgencyService.activeBids());

  // Use cached league data
  public leagueTeams = computed(() => this.leagueService.leagueTeams());
  public currentUserTeam = computed(() => this.leagueService.currentUserTeam());
  public leagueData = computed(() => this.leagueService.selectedLeague());

  // Filtered and sorted players - using writable signal for better control
  public filteredPlayers = signal<any[]>([]);

  constructor() {
    // Effect: Load player minimums when available players change
    effect(() => {
      const players = this.availablePlayers();
      if (players.length > 0) {
        this.loadPlayerMinimums();
        this.filterPlayers(); // Initial filter
      }
    });

    // Effect: Re-filter when filters change
    effect(() => {
      this.filterPlayers();
    });
  }

  /**
   * Filter and sort players based on current filters
   */
  private filterPlayers(): void {
    let players = this.availablePlayers();
    const totalPlayers = players.length;

    // Apply position filter
    if (this.positionFilter() !== 'all') {
      players = players.filter(
        (player) => player.position === this.positionFilter()
      );
      console.log(
        `[AvailablePlayers] Position filter applied: ${this.positionFilter()}, players remaining: ${
          players.length
        }`
      );
    }

    // Apply search filter
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      const beforeSearch = players.length;
      players = players.filter(
        (player) =>
          player.name?.toLowerCase().includes(query) ||
          player.nflTeam?.toLowerCase().includes(query) ||
          player.position?.toLowerCase().includes(query)
      );
      console.log(
        `[AvailablePlayers] Search filter applied: "${query}", players before: ${beforeSearch}, after: ${players.length}`
      );
    }

    // Apply sorting
    players = [...players].sort((a, b) => {
      const aValue = this.getSortValue(a, this.sortField());
      const bValue = this.getSortValue(b, this.sortField());

      if (aValue < bValue) return -1 * this.sortOrder();
      if (aValue > bValue) return 1 * this.sortOrder();
      return 0;
    });

    console.log(
      `[AvailablePlayers] Filtering complete: ${totalPlayers} total → ${
        players.length
      } filtered, sorted by: ${this.sortField()}`
    );
    this.filteredPlayers.set(players);
  }

  /**
   * Get sort value for a player based on sort field
   */
  private getSortValue(player: any, field: string): any {
    switch (field) {
      case 'name':
        return player.name || '';
      case 'position':
        return player.position || '';
      case 'age':
        return this.getPlayerAge(player) || 0;
      case 'overall':
        return player.overall || 0;
      case 'nflTeam':
        return player.nflTeam || '';
      case 'estMin':
        return this.getPlayerMinimumForDisplay(player.id) || 0;
      case 'bids':
        return this.getPlayerBidCount(player.id);
      default:
        return '';
    }
  }

  /**
   * Handle column sorting
   */
  public onSort(field: string): void {
    if (this.sortField() === field) {
      // Toggle sort order if same field
      this.sortOrder.update((order) => order * -1);
    } else {
      // Set new field with ascending order
      this.sortField.set(field);
      this.sortOrder.set(1);
    }
    // Filtering will be triggered by the effect
  }

  /**
   * Get sort icon for a column
   */
  public getSortIcon(field: string): string {
    if (this.sortField() !== field) return 'pi pi-sort';
    return this.sortOrder() === 1 ? 'pi pi-sort-up' : 'pi pi-sort-down';
  }

  /**
   * Get bid count for a specific player
   */
  public getPlayerBidCount = (playerId: string): number => {
    return this.activeBids().filter((bid) => bid.playerId === playerId).length;
  };

  // Load player minimums for all available players
  public async loadPlayerMinimums(): Promise<void> {
    const players = this.availablePlayers();
    const minimums: Record<string, number | null> = {};

    // Load minimums in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);

      // Process batch in parallel
      const batchPromises = batch.map(async (player) => {
        try {
          const minimum =
            await this.enhancedPlayerMinimumService.calculatePlayerMinimum(
              player
            );
          return { playerId: player.id, minimum };
        } catch (error) {
          console.warn(
            'Failed to calculate minimum for player:',
            player.name,
            error
          );
          return { playerId: player.id, minimum: null };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Update minimums for this batch
      batchResults.forEach(({ playerId, minimum }) => {
        minimums[playerId] = minimum;
      });

      // Update the signal with current progress
      this.playerMinimums.set({ ...this.playerMinimums(), ...minimums });

      // Small delay between batches to prevent overwhelming
      if (i + batchSize < players.length) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }

  /**
   * Get player age, handling both Age property and BirthDate calculation
   */
  public getPlayerAge(player: any): number | null {
    // First try to use the Age property
    if (player.age !== undefined && player.age !== null) {
      return player.age;
    }

    // Fallback to calculating from BirthDate
    if (player.BirthDate) {
      return this.calculateAgeFromBirthDate(player.BirthDate);
    }

    return null;
  }

  /**
   * Calculate age from birth date string
   */
  private calculateAgeFromBirthDate(birthDate: string): number {
    if (!birthDate) return 25;

    try {
      const birth = new Date(birthDate);
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
      console.warn('Error calculating age from birth date:', birthDate, error);
      return 25;
    }
  }

  /**
   * Get position color class for styling
   */
  public getPositionColorClass(position: string): string {
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
   * Check if a team has already bid on a player
   */
  public hasTeamBid(playerId: string): boolean {
    const currentTeamId = this.currentUserTeam()?.teamId;
    if (!currentTeamId) return false;

    return this.activeBids().some(
      (bid) => bid.playerId === playerId && bid.teamId === currentTeamId
    );
  }

  /**
   * Get player minimum for display
   */
  public getPlayerMinimumForDisplay(playerId: string): number | null {
    return this.playerMinimums()[playerId] || null;
  }

  /**
   * Format currency for display
   */
  public formatCurrency(value: number): string {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toLocaleString()}`;
    }
  }

  /**
   * Handle bid button click
   */
  public onBidButtonClick(player: any): void {
    this.bidButtonClick.emit(player);
  }

  /**
   * Filter players by position
   */
  public filterPlayersByPosition(position: string): void {
    this.positionFilter.set(position);
    // Filtering will be triggered by the effect
  }

  /**
   * Update search query
   */
  public updateSearchQuery(query: string): void {
    this.searchQuery.set(query);
    // Filtering will be triggered by the effect
  }

  /**
   * Clear all filters
   */
  public clearFilters(): void {
    this.positionFilter.set('all');
    this.searchQuery.set('');
    // Filtering will be triggered by the effect
  }

  /**
   * Load more players (pagination)
   */
  public async loadMorePlayers(): Promise<void> {
    if (this.isLoadingMore() || !this.hasMorePlayers()) return;

    this.isLoadingMore.set(true);
    try {
      // Implement pagination logic here if needed
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate loading
    } finally {
      this.isLoadingMore.set(false);
    }
  }
}
