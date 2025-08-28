import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { FreeAgencyService } from '../../../../../services/free-agency.service';
import { LeagueService } from '../../../../../services/league.service';

@Component({
  selector: 'app-team-bids',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule],
  templateUrl: './team-bids.component.html',
  styleUrls: ['./team-bids.component.scss'],
})
export class TeamBidsComponent {
  private readonly freeAgencyService = inject(FreeAgencyService);
  private readonly leagueService = inject(LeagueService);

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
}
