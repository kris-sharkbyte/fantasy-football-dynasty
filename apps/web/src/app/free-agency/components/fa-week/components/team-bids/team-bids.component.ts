import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { FreeAgencyService } from '../../../../../services/free-agency.service';
import { LeagueService } from '../../../../../services/league.service';
import { SportsDataService } from '../../../../../services/sports-data.service';
import {
  PlayerCardComponent,
  PlayerCardData,
  PlayerCardConfig,
} from '../../../../../shared/components/player-card';

@Component({
  selector: 'app-team-bids',
  standalone: true,
  imports: [CommonModule, ButtonModule, BadgeModule, PlayerCardComponent],
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

  // Check if sports data is ready
  public sportsDataReady = this.sportsDataService.dataReady;

  // Team bids filtered for current user - show ALL bids including accepted ones
  public teamBids = computed(() => {
    const currentUserTeamId = this.leagueService.currentUserTeamId();
    if (!currentUserTeamId) return [];

    // Get all bids from the service (including accepted ones)
    const allBids = this.freeAgencyService.getAllTeamBids(currentUserTeamId);
    return allBids.filter((bid) => bid.teamId === currentUserTeamId);
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
   * Get player initials for fallback when no photo
   */
  getPlayerInitials(playerId: string): string {
    if (!this.sportsDataReady()) return '?';
    const playerIdNum = parseInt(playerId);
    if (isNaN(playerIdNum)) return '?';
    const player = this.sportsDataService.getPlayerById(playerIdNum);
    if (!player?.FirstName || !player?.LastName) return '?';

    return (player.FirstName[0] + player.LastName[0]).toUpperCase();
  }

  /**
   * Get player photo URL from sports data
   */
  getPlayerPhotoUrl(playerId: string): string | null {
    if (!this.sportsDataReady()) return null;
    const playerIdNum = parseInt(playerId);
    if (isNaN(playerIdNum)) return null;
    const player = this.sportsDataService.getPlayerById(playerIdNum);
    return player?.PhotoUrl || null;
  }

  /**
   * Get team logo URL for a player
   */
  getTeamLogoUrl(playerId: string): string | null {
    if (!this.sportsDataReady()) return null;
    const playerIdNum = parseInt(playerId);
    if (isNaN(playerIdNum)) return null;
    const player = this.sportsDataService.getPlayerById(playerIdNum);
    return player?.teamInfo?.WikipediaLogoUrl || null;
  }

  /**
   * Get player first name
   */
  getPlayerFirstName(playerId: string): string {
    if (!this.sportsDataReady()) return 'Unknown';
    const playerIdNum = parseInt(playerId);
    if (isNaN(playerIdNum)) return 'Unknown';
    const player = this.sportsDataService.getPlayerById(playerIdNum);
    return player?.FirstName || 'Unknown';
  }

  /**
   * Get player last name
   */
  getPlayerLastName(playerId: string): string {
    if (!this.sportsDataReady()) return 'Player';
    const playerIdNum = parseInt(playerId);
    if (isNaN(playerIdNum)) return 'Player';
    const player = this.sportsDataService.getPlayerById(playerIdNum);
    return player?.LastName || 'Player';
  }

  /**
   * Get player jersey number
   */
  getPlayerNumber(playerId: string): string {
    if (!this.sportsDataReady()) return '';
    const playerIdNum = parseInt(playerId);
    if (isNaN(playerIdNum)) return '';
    const player = this.sportsDataService.getPlayerById(playerIdNum);
    return player?.Number ? `#${player.Number}` : '';
  }

  /**
   * Get player position
   */
  getPlayerPosition(playerId: string): string {
    if (!this.sportsDataReady()) return 'Unknown';
    const playerIdNum = parseInt(playerId);
    if (isNaN(playerIdNum)) return 'Unknown';
    const player = this.sportsDataService.getPlayerById(playerIdNum);
    return player?.Position || 'Unknown';
  }

  /**
   * Get team name for a player
   */
  getTeamName(playerId: string): string {
    if (!this.sportsDataReady()) return 'Unknown Team';
    const playerIdNum = parseInt(playerId);
    if (isNaN(playerIdNum)) return 'Unknown Team';
    const player = this.sportsDataService.getPlayerById(playerIdNum);
    return player?.teamInfo?.FullName || 'Unknown Team';
  }

  /**
   * Get team initials for fallback display
   */
  getTeamInitials(playerId: string): string {
    const teamName = this.getTeamName(playerId);
    if (teamName === 'Unknown Team') return '?';

    return teamName
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase();
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
      case 'considering':
        return 'warn';
      case 'rejected':
        return 'danger';
      case 'pending':
      default:
        return 'info';
    }
  }

  /**
   * Get display text for bid status
   */
  getStatusDisplayText(status: string): string {
    switch (status) {
      case 'accepted':
        return 'Accepted';
      case 'shortlisted':
      case 'considering':
        return 'Considering';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
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

  /**
   * Get player card data for a specific bid
   */
  getPlayerCardData(bid: any): PlayerCardData {
    const playerId = bid.playerId;
    const player = this.sportsDataService.getPlayerById(parseInt(playerId));

    if (!player) {
      return {
        playerId: playerId,
        firstName: 'Unknown',
        lastName: 'Player',
        position: 'Unknown',
        team: 'Unknown Team',
        overall: 0,
        age: 0,
        experience: 0,
        status: 'unknown',
      };
    }

    return {
      playerId: playerId,
      firstName: player.FirstName || 'Unknown',
      lastName: player.LastName || 'Player',
      position: player.Position || 'Unknown',
      team: player.teamInfo?.FullName || 'Unknown Team',
      overall: player.overall || 0,
      age: player.Age || 0,
      experience: player.Experience || 0,
      status: bid.status || 'unknown',
      photoUrl: this.getPlayerPhotoUrl(playerId) || undefined,
      teamLogoUrl: this.getTeamLogoUrl(playerId) || undefined,
    };
  }

  /**
   * Get player card configuration for team bids
   */
  getPlayerCardConfig(): PlayerCardConfig {
    return {
      showOverall: true,
      showAge: true,
      showExperience: true,
      showStatus: true,
      showTeamLogo: true,
      showPlayerPhoto: true,
      size: 'medium',
      layout: 'horizontal',
      theme: 'dark',
    };
  }
}
