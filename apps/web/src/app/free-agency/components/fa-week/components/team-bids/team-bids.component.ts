import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { FreeAgencyService } from '../../../../../services/free-agency.service';
import { LeagueService } from '../../../../../services/league.service';
import { SportsDataService } from '../../../../../services/sports-data.service';

@Component({
  selector: 'app-team-bids',
  standalone: true,
  imports: [CommonModule, ButtonModule, BadgeModule],
  templateUrl: './team-bids.component.html',
})
export class TeamBidsComponent {
  private readonly freeAgencyService = inject(FreeAgencyService);
  private readonly leagueService = inject(LeagueService);
  private readonly sportsDataService = inject(SportsDataService);

  // Computed values from services
  public activeBids = this.freeAgencyService.activeBids;
  public availablePlayers = computed(() =>
    this.freeAgencyService.availablePlayers()
  );

  // Team bids filtered for current user - now using cached signals
  public teamBids = computed(() => {
    const currentUserTeamId = this.leagueService.currentUserTeamId();
    if (!currentUserTeamId) return [];

    return this.activeBids().filter((bid) => bid.teamId === currentUserTeamId);
  });

  /**
   * Cancel a pending bid
   */
  async cancelBid(bidId: string): Promise<void> {
    try {
      const success = await this.freeAgencyService.cancelBid(bidId);
      if (success) {
        console.log('Bid cancelled successfully');
      } else {
        throw new Error('Failed to cancel bid');
      }
    } catch (error) {
      console.error('Error cancelling bid:', error);
    }
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
   * Get PrimeNG severity level for bid status
   */
  getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'shortlisted':
        return 'warn';
      case 'rejected':
        return 'danger';
      case 'pending':
      default:
        return 'info';
    }
  }

  /**
   * Get player photo URL from sports data
   */
  getPlayerPhotoUrl(playerId: string): string | null {
    const player = this.sportsDataService.getPlayerById(parseInt(playerId));
    return player?.PhotoUrl || null;
  }

  /**
   * Get player initials for fallback when no photo
   */
  getPlayerInitials(playerId: string): string {
    const player = this.availablePlayers().find((p) => p.id === playerId);
    if (!player?.name) return '?';

    const names = player.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return player.name.substring(0, 2).toUpperCase();
  }

  /**
   * Handle image loading errors
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    // The fallback div will show automatically
  }

  /**
   * Navigate to roster view
   */
  viewRoster(): void {
    // TODO: Implement navigation to roster view
    console.log('Navigate to roster view');
  }
}
