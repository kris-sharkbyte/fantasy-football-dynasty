import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FreeAgencyService } from '../../../../../services/free-agency.service';
import { LeagueService } from '../../../../../services/league.service';
import {
  FABid,
  FAEvaluationResult,
  PlayerDecision,
} from '@fantasy-football-dynasty/types';

@Component({
  selector: 'app-player-decisions',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TagModule,
    TableModule,
    DialogModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './player-decisions.component.html',
  styleUrls: ['./player-decisions.component.scss'],
})
export class PlayerDecisionsComponent implements OnInit {
  private readonly freeAgencyService = inject(FreeAgencyService);
  private readonly leagueService = inject(LeagueService);

  // State signals
  public showDecisionModal = signal<boolean>(false);
  public selectedDecision = signal<FAEvaluationResult | null>(null);
  public isAdvancingWeek = signal<boolean>(false);

  // Computed values - derive from active bids instead of separate signal
  public playerDecisions = computed(() => {
    const activeBids = this.freeAgencyService.activeBids();
    const currentWeek = this.currentFAWeek();

    if (!currentWeek || activeBids.length === 0) return [];

    // Group bids by player and create decision objects
    const playerBidMap = new Map<string, any[]>();

    activeBids.forEach((bid) => {
      if (bid.weekNumber === currentWeek.weekNumber) {
        const playerId = bid.playerId.toString();
        if (!playerBidMap.has(playerId)) {
          playerBidMap.set(playerId, []);
        }
        playerBidMap.get(playerId)!.push(bid);
      }
    });

    // Convert to decision format
    const decisions: any[] = [];
    playerBidMap.forEach((bids, playerId) => {
      // Create a decision object based on bid statuses
      const hasAccepted = bids.some((bid) => bid.status === 'accepted');
      const hasShortlisted = bids.some((bid) => bid.status === 'shortlisted');
      const hasRejected = bids.some((bid) => bid.status === 'rejected');

      let decisionReason = 'waiting';
      if (hasAccepted) decisionReason = 'accepted';
      else if (hasShortlisted) decisionReason = 'shortlisted';
      else if (hasRejected) decisionReason = 'rejected';

      decisions.push({
        playerId,
        decisions: [
          {
            decisionReason,
            feedback:
              bids.find((bid) => bid.feedback)?.feedback ||
              'No feedback available',
            marketFactors: {
              competingOffers: bids.length,
              positionalDemand: 0.5, // Default value
              marketPressure: 0.5, // Default value
              recentComparables: [],
            },
            startingPositionProspects: {
              isStarter: true, // Default value
              confidence: 0.7, // Default value
              competingPlayers: bids.length - 1,
              teamDepth: 'moderate',
              reasoning: 'Based on current market conditions',
            },
            contractAnalysis: {
              aavScore: 0.7, // Default value
              signingBonusScore: 0.6, // Default value
              guaranteeScore: 0.8, // Default value
              lengthScore: 0.5, // Default value
              teamScore: 0.6, // Default value
              totalScore: 0.65, // Default value
              threshold: 0.6, // Default value
            },
            trustImpact: {}, // Empty for now
            playerNotes: `Player has ${bids.length} active bids`,
            agentNotes: `Agent is evaluating ${bids.length} offers`,
          },
        ],
      });
    });

    return decisions;
  });
  public currentFAWeek = computed(() => this.freeAgencyService.currentFAWeek());
  public isReadyToAdvance = computed(() =>
    this.freeAgencyService.isReadyToAdvance()
  );
  public weekAdvancementProgress = computed(() =>
    this.freeAgencyService.weekAdvancementProgress()
  );
  public isCommissioner = computed(() => {
    const role = this.leagueService.currentUserRole();
    return role === 'commissioner' || role === 'owner';
  });
  public totalTeamsCount = computed(() =>
    this.freeAgencyService.totalTeamsCount()
  );

  // Decision summaries - derive from active bids
  public acceptedContracts = computed(() => {
    const activeBids = this.freeAgencyService.activeBids();
    const currentWeek = this.currentFAWeek();

    if (!currentWeek) return [];

    return activeBids.filter(
      (bid) =>
        bid.status === 'accepted' && bid.weekNumber === currentWeek.weekNumber
    );
  });

  public shortlistedBids = computed(() => {
    const activeBids = this.freeAgencyService.activeBids();
    const currentWeek = this.currentFAWeek();

    if (!currentWeek) return [];

    return activeBids.filter(
      (bid) =>
        bid.status === 'shortlisted' &&
        bid.weekNumber === currentWeek.weekNumber
    );
  });

  public rejectedBids = computed(() => {
    const activeBids = this.freeAgencyService.activeBids();
    const currentWeek = this.currentFAWeek();

    if (!currentWeek) return [];

    return activeBids.filter(
      (bid) =>
        bid.status === 'rejected' && bid.weekNumber === currentWeek.weekNumber
    );
  });

  // Week progression and historical data
  public weekProgression = computed(() => {
    const currentWeek = this.currentFAWeek();
    if (!currentWeek) return [];

    // Generate week progression data
    const weeks = [];
    for (let i = 1; i <= currentWeek.weekNumber; i++) {
      weeks.push({
        weekNumber: i,
        isCurrentWeek: i === currentWeek.weekNumber,
        isCompleted: i < currentWeek.weekNumber,
        phase: i === currentWeek.weekNumber ? currentWeek.phase : 'completed',
      });
    }
    return weeks;
  });

  // Market context and trends
  public marketTrends = computed(() => {
    const decisions = this.playerDecisions();
    if (decisions.length === 0) return null;

    const trends = {
      totalDecisions: decisions.length,
      acceptedCount: decisions.filter((d: any) =>
        d.decisions.some((dec: any) => dec.decisionReason === 'accepted')
      ).length,
      shortlistedCount: decisions.filter((d: any) =>
        d.decisions.some((dec: any) => dec.decisionReason === 'shortlisted')
      ).length,
      rejectedCount: decisions.filter((d: any) =>
        d.decisions.some((dec: any) => dec.decisionReason === 'rejected')
      ).length,
      averageContractScore: 0,
      marketPressure: 0,
    };

    // Calculate average contract scores
    const allScores = decisions
      .flatMap((d: any) =>
        d.decisions.map((dec: any) => dec.contractAnalysis?.totalScore || 0)
      )
      .filter((score: number) => score > 0);

    if (allScores.length > 0) {
      trends.averageContractScore =
        allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    }

    // Calculate market pressure
    const allMarketFactors = decisions
      .flatMap((d: any) =>
        d.decisions.map((dec: any) => dec.marketFactors?.marketPressure || 0)
      )
      .filter((pressure: number) => pressure > 0);

    if (allMarketFactors.length > 0) {
      trends.marketPressure =
        allMarketFactors.reduce((sum, pressure) => sum + pressure, 0) /
        allMarketFactors.length;
    }

    return trends;
  });

  // Computed totals for display
  public acceptedContractsTotal = computed(() =>
    this.acceptedContracts().reduce((sum, bid) => sum + bid.offer.totalValue, 0)
  );
  public shortlistedBidsTotal = computed(() =>
    this.shortlistedBids().reduce((sum, bid) => sum + bid.offer.totalValue, 0)
  );
  public rejectedBidsTotal = computed(() =>
    this.rejectedBids().reduce((sum, bid) => sum + bid.offer.totalValue, 0)
  );

  // Safe access to selected decision data
  public selectedDecisionData = computed(() => {
    const decision = this.selectedDecision();
    if (!decision?.decisions || decision.decisions.length === 0) return null;
    return decision.decisions[0];
  });

  public selectedDecisionStartingProspects = computed(
    () => this.selectedDecisionData()?.startingPositionProspects || null
  );

  public selectedDecisionContractAnalysis = computed(
    () => this.selectedDecisionData()?.contractAnalysis || null
  );

  ngOnInit(): void {
    // No need to call loadPlayerDecisions() - the signals are already reactive
    // The computed values will automatically update when the underlying signals change
  }

  /**
   * Open decision modal for detailed view
   */
  openDecisionModal(decision: FAEvaluationResult): void {
    this.selectedDecision.set(decision);
    this.showDecisionModal.set(true);
  }

  /**
   * Close decision modal
   */
  closeDecisionModal(): void {
    this.showDecisionModal.set(false);
    this.selectedDecision.set(null);
  }

  /**
   * Advance to next week (commissioner only)
   */
  async advanceWeek(): Promise<void> {
    if (!this.isCommissioner()) return;

    this.isAdvancingWeek.set(true);
    const success = await this.freeAgencyService.advanceToNextWeek();

    this.isAdvancingWeek.set(false);

    // No need to manually refresh - the computed values will automatically update
    // when the underlying signals (activeBids, currentFAWeek) change
  }

  /**
   * Get decision status tag severity
   */
  getDecisionStatusSeverity(decision: PlayerDecision): string {
    switch (decision.decisionReason) {
      case 'accepted':
        return 'success';
      case 'shortlisted':
        return 'warning';
      case 'rejected':
        return 'danger';
      default:
        return 'info';
    }
  }

  /**
   * Get decision status label
   */
  getDecisionStatusLabel(decision: PlayerDecision): string {
    switch (decision.decisionReason) {
      case 'accepted':
        return 'Accepted';
      case 'shortlisted':
        return 'Shortlisted';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Waiting';
    }
  }

  /**
   * Format currency utility
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
   * Get starting position confidence color
   */
  getStartingPositionColor(confidence: number): string {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'danger';
  }

  /**
   * Get team depth color
   */
  getTeamDepthColor(depth: string): string {
    switch (depth) {
      case 'shallow':
        return 'success';
      case 'moderate':
        return 'warning';
      case 'deep':
        return 'danger';
      default:
        return 'info';
    }
  }

  /**
   * Get market pressure color
   */
  getMarketPressureColor(pressure: number): string {
    if (pressure >= 0.8) return 'danger';
    if (pressure >= 0.5) return 'warning';
    return 'success';
  }

  /**
   * Get market pressure label
   */
  getMarketPressureLabel(pressure: number): string {
    if (pressure >= 0.8) return 'High Pressure';
    if (pressure >= 0.5) return 'Moderate Pressure';
    return 'Low Pressure';
  }

  /**
   * Get trust impact color
   */
  getTrustImpactColor(impact: number): string {
    if (impact > 0.1) return 'success';
    if (impact < -0.1) return 'danger';
    return 'info';
  }

  /**
   * Format trust impact
   */
  formatTrustImpact(impact: number): string {
    const sign = impact > 0 ? '+' : '';
    return `${sign}${(impact * 100).toFixed(1)}%`;
  }

  /**
   * Get decision timeline status
   */
  getDecisionTimelineStatus(decision: PlayerDecision): string {
    switch (decision.decisionReason) {
      case 'accepted':
        return 'Contract Signed';
      case 'shortlisted':
        return 'Under Consideration';
      case 'rejected':
        return 'Offer Rejected';
      case 'rejected_lowball':
        return 'Insulting Offer';
      case 'waiting':
        return 'Awaiting Decision';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get competing offers count
   */
  getCompetingOffersCount(decision: PlayerDecision): number {
    return decision.marketFactors?.competingOffers || 0;
  }

  /**
   * Get positional demand level
   */
  getPositionalDemandLevel(decision: PlayerDecision): string {
    const demand = decision.marketFactors?.positionalDemand || 0;
    if (demand >= 0.8) return 'High Demand';
    if (demand >= 0.5) return 'Moderate Demand';
    return 'Low Demand';
  }

  /**
   * Get positional demand color
   */
  getPositionalDemandColor(decision: PlayerDecision): string {
    const demand = decision.marketFactors?.positionalDemand || 0;
    if (demand >= 0.8) return 'success';
    if (demand >= 0.5) return 'warning';
    return 'info';
  }

  /**
   * Get trust impact team IDs
   */
  getTrustImpactTeamIds(decision: PlayerDecision): string[] {
    if (!decision.trustImpact) return [];
    return Object.keys(decision.trustImpact);
  }
}
