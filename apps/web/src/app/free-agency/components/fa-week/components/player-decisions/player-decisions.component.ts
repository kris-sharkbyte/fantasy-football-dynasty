import { Component, inject, signal, computed, OnInit } from '@angular/core';
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

  // Computed values
  public playerDecisions = computed(() =>
    this.freeAgencyService.playerDecisions()
  );
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

  // Decision summaries
  public acceptedContracts = computed(() =>
    this.freeAgencyService.getAcceptedContracts()
  );
  public shortlistedBids = computed(() =>
    this.freeAgencyService.getShortlistedBids()
  );
  public rejectedBids = computed(() =>
    this.freeAgencyService.getRejectedBids()
  );

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
    this.loadPlayerDecisions();
  }

  /**
   * Load player decisions for the current week
   */
  async loadPlayerDecisions(): Promise<void> {
    await this.freeAgencyService.getPlayerDecisions();
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

    if (success) {
      // Reload decisions for the new week
      await this.loadPlayerDecisions();
    }
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
}
