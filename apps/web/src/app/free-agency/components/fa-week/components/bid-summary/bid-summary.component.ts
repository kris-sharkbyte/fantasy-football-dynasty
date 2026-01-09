import { Component, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { FreeAgencyService } from '../../../../../services/free-agency.service';
import { LeagueService } from '../../../../../services/league.service';
import { SportsDataService } from '../../../../../services/sports-data.service';
import { FABid } from '@fantasy-football-dynasty/types';

interface BidSummaryItem {
  playerId: string;
  playerName: string;
  bidId: string;
  status: 'accepted' | 'shortlisted' | 'rejected' | 'considering' | 'pending';
  apy: number;
  years: number;
  signingBonus: number;
  guarantees: number;
  feedback?: string;
  decisionReason?: string;
}

@Component({
  selector: 'app-bid-summary',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    CardModule,
    TagModule,
    TableModule,
    ButtonModule,
    TabsModule,
  ],
  templateUrl: './bid-summary.component.html',
  styleUrls: ['./bid-summary.component.scss'],
})
export class BidSummaryComponent {
  private readonly freeAgencyService = inject(FreeAgencyService);
  private readonly leagueService = inject(LeagueService);
  private readonly sportsDataService = inject(SportsDataService);

  // Modal visibility - two-way binding
  showDialog = false;

  // Computed values
  evaluationResult = computed(() =>
    this.freeAgencyService.lastWeekEvaluationResult()
  );
  currentUserTeamId = computed(() => this.leagueService.currentUserTeamId());
  activeBids = computed(() => this.freeAgencyService.activeBids());
  currentWeek = computed(() => this.freeAgencyService.currentFAWeek());

  constructor() {
    // Watch for showBidSummary signal changes and update showDialog
    effect(() => {
      this.showDialog = this.freeAgencyService.showBidSummary();
    });
  }

  // Get all team bids (same approach as team-bids component - show ALL bids including accepted)
  allTeamBids = computed(() => {
    const myTeamId = this.currentUserTeamId();
    if (!myTeamId) {
      return [];
    }

    // Use the same method as team-bids component - get ALL bids for the team
    const allBids = this.freeAgencyService.getAllTeamBids(myTeamId);
    
    // Filter by teamId only (no weekNumber filter - show all bids like team-bids does)
    const filtered = allBids.filter(
      (bid) => bid.teamId === myTeamId
    );

    return filtered;
  });

  // Summary data - filtered by current user's team from actual bids
  acceptedBids = computed(() => {
    return this.allTeamBids()
      .filter((bid) => bid.status === 'accepted')
      .map((bid) => this.mapBidToSummaryItem(bid, 'accepted'));
  });

  shortlistedBids = computed(() => {
    return this.allTeamBids()
      .filter((bid) => bid.status === 'shortlisted')
      .map((bid) => this.mapBidToSummaryItem(bid, 'shortlisted'));
  });

  rejectedBids = computed(() => {
    return this.allTeamBids()
      .filter((bid) => bid.status === 'rejected')
      .map((bid) => this.mapBidToSummaryItem(bid, 'rejected'));
  });

  consideringBids = computed(() => {
    return this.allTeamBids()
      .filter((bid) => bid.status === 'considering')
      .map((bid) => this.mapBidToSummaryItem(bid, 'considering'));
  });

  pendingBids = computed(() => {
    return this.allTeamBids()
      .filter((bid) => bid.status === 'pending')
      .map((bid) => this.mapBidToSummaryItem(bid, 'pending'));
  });

  // Helper method to map FABid to BidSummaryItem
  private mapBidToSummaryItem(
    bid: FABid,
    status: 'accepted' | 'shortlisted' | 'rejected' | 'considering' | 'pending'
  ): BidSummaryItem {
    // Get player name from sports data service
    const player = this.sportsDataService.getPlayerById(bid.playerId);
    const playerName = player
      ? `${player.FirstName} ${player.LastName}`.trim()
      : 'Unknown Player';

    // Calculate total guarantees (sum of guarantee amounts)
    const totalGuarantees = Array.isArray(bid.offer?.guarantees)
      ? bid.offer.guarantees.reduce(
          (sum: number, g: any) => sum + (g.amount || 0),
          0
        )
      : 0;

    return {
      playerId: String(bid.playerId),
      playerName,
      bidId: bid.id,
      status,
      apy: bid.offer?.apy || 0,
      years: bid.offer?.years || 0,
      signingBonus: bid.offer?.signingBonus || 0,
      guarantees: totalGuarantees,
      feedback: bid.feedback,
      decisionReason: bid.teamMessage,
    };
  }

  // Financial summary for accepted bids
  financialSummary = computed(() => {
    const accepted = this.acceptedBids();
    
    const totalContractValue = accepted.reduce((sum, bid) => {
      return sum + (bid.apy * bid.years) + bid.signingBonus;
    }, 0);

    const totalSigningBonuses = accepted.reduce((sum, bid) => sum + bid.signingBonus, 0);
    const totalGuarantees = accepted.reduce((sum, bid) => sum + bid.guarantees, 0);
    const totalYears = accepted.reduce((sum, bid) => sum + bid.years, 0);
    const averageAPY = accepted.length > 0 
      ? accepted.reduce((sum, bid) => sum + bid.apy, 0) / accepted.length 
      : 0;

    return {
      totalContractValue,
      totalSigningBonuses,
      totalGuarantees,
      totalYears,
      averageAPY,
      acceptedCount: accepted.length,
    };
  });

  onDialogVisibleChange(visible: boolean): void {
    this.showDialog = visible;
    if (!visible) {
      this.freeAgencyService.showBidSummary.set(false);
    }
  }

  formatCurrency(amount: number): string {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'shortlisted':
        return 'info';
      case 'considering':
        return 'warning';
      case 'pending':
        return 'info';
      case 'rejected':
        return 'danger';
      default:
        return 'info';
    }
  }
}
