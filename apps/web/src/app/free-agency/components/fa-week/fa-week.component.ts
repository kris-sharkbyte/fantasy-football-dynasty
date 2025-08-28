import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import {
  FreeAgencyService,
  FAWeekPlayer,
} from '../../../services/free-agency.service';
import { LeagueService } from '../../../services/league.service';
import { TeamService } from '../../../services/team.service';
import { LeagueMembershipService } from '../../../services/league-membership.service';
import { EnhancedPlayerMinimumService } from '../../../services/enhanced-player-minimum.service';
import { FAWeekHeaderComponent } from './components/fa-week-header';
import { AvailablePlayersComponent } from './components/available-players';
import { TeamBidsComponent } from './components/team-bids';
import { SalaryCapComponent } from './components/salary-cap';
import { PlayerDecisionsComponent } from './components/player-decisions';
import { ContractInputsComponent } from '../../../teams/negotiation/components/contract-inputs/contract-inputs.component';
import { FABid } from '@fantasy-football-dynasty/types';

@Component({
  selector: 'app-fa-week',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    InputNumberModule,
    TagModule,
    TableModule,
    IconFieldModule,
    InputIconModule,
    FAWeekHeaderComponent,
    AvailablePlayersComponent,
    TeamBidsComponent,
    SalaryCapComponent,
    PlayerDecisionsComponent,
    ContractInputsComponent,
  ],
  templateUrl: './fa-week.component.html',
  styleUrls: ['./fa-week.component.scss'],
})
export class FAWeekComponent implements OnInit {
  private readonly freeAgencyService = inject(FreeAgencyService);
  private readonly leagueService = inject(LeagueService);
  private readonly teamService = inject(TeamService);
  private readonly leagueMembershipService = inject(LeagueMembershipService);
  private readonly enhancedPlayerMinimumService = inject(
    EnhancedPlayerMinimumService
  );

  // State signals
  public selectedPlayer = signal<FAWeekPlayer | null>(null);
  public showBidModal = signal<boolean>(false);
  public bidForm = signal({ years: 1, baseSalary: 0, signingBonus: 0 });
  public isSubmitting = signal<boolean>(false);
  public playerMinimum = signal<number | null>(null);
  public marketContextSummary = signal<any>(null);

  // Computed values from services
  public availablePlayers = computed(() =>
    this.freeAgencyService.availablePlayers()
  );
  public activeBids = computed(() => this.freeAgencyService.activeBids());
  public currentFAWeek = computed(() => this.freeAgencyService.currentFAWeek());

  // Years options for contract inputs
  public yearsOptions = computed(() => {
    const league = this.leagueService.selectedLeague();
    if (!league?.rules?.contracts?.maxYears) return [1, 2, 3, 4, 5];

    const maxYears = league.rules.contracts.maxYears;
    return Array.from({ length: maxYears }, (_, i) => i + 1);
  });

  // Bid summary calculations
  public totalBidValue = computed(() => {
    const form = this.bidForm();
    return form.baseSalary * form.years + form.signingBonus;
  });

  public averageAnnualValue = computed(() => {
    const form = this.bidForm();
    return Math.round(
      (form.baseSalary * form.years + form.signingBonus) / form.years
    );
  });

  ngOnInit(): void {
    this.loadInitialData();
  }

  /**
   * Load initial data for the component
   */
  private async loadInitialData(): Promise<void> {
    try {
      // Load market context summary
      const summary =
        await this.enhancedPlayerMinimumService.getMarketContextSummary();
      this.marketContextSummary.set(summary);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }

  /**
   * Open bid modal for a player
   */
  openBidModal(player: FAWeekPlayer): void {
    this.selectedPlayer.set(player);
    this.initializeBidForm(player);
    this.showBidModal.set(true);
  }

  /**
   * Close bid modal
   */
  closeBidModal(): void {
    this.showBidModal.set(false);
    this.selectedPlayer.set(null);
    this.bidForm.set({ years: 1, baseSalary: 0, signingBonus: 0 });
  }

  /**
   * Initialize bid form with player minimum
   */
  private async initializeBidForm(player: FAWeekPlayer): Promise<void> {
    try {
      const minimum = await this.freeAgencyService.getEnhancedPlayerMinimum(
        player.id
      );
      this.playerMinimum.set(minimum);

      this.bidForm.set({
        years: 1,
        baseSalary: minimum || 0,
        signingBonus: 0,
      });
    } catch (error) {
      console.error('Error getting player minimum:', error);
      this.bidForm.set({ years: 1, baseSalary: 0, signingBonus: 0 });
    }
  }

  /**
   * Handle contract input changes
   */
  onYearsChange(newYears: number): void {
    this.bidForm.update((form) => ({ ...form, years: newYears }));
  }

  onBaseSalaryChange(newSalary: number): void {
    this.bidForm.update((form) => ({ ...form, baseSalary: newSalary }));
  }

  onSigningBonusChange(newBonus: number): void {
    this.bidForm.update((form) => ({ ...form, signingBonus: newBonus }));
  }

  /**
   * Submit bid for selected player
   */
  async submitBid(): Promise<void> {
    const player = this.selectedPlayer();
    if (!player) return;

    try {
      this.isSubmitting.set(true);

      const currentLeague = this.leagueService.selectedLeague();
      if (!currentLeague) {
        throw new Error('No league selected');
      }

      // Get current user's team ID from cached signals
      const currentUserTeamId = this.leagueService.currentUserTeamId();
      if (!currentUserTeamId) {
        throw new Error('Team not found for current user');
      }

      // Create contract offer
      const contractOffer = {
        years: this.bidForm().years as 1 | 2 | 3,
        baseSalary: { [new Date().getFullYear()]: this.bidForm().baseSalary },
        signingBonus: this.bidForm().signingBonus,
        guarantees: [],
        contractType: 'standard' as const,
        totalValue:
          this.bidForm().baseSalary * this.bidForm().years +
          this.bidForm().signingBonus,
        apy: Math.round(
          (this.bidForm().baseSalary * this.bidForm().years +
            this.bidForm().signingBonus) /
            this.bidForm().years
        ),
      };

      // Submit bid
      const bid = await this.freeAgencyService.submitBid(
        player.id,
        currentUserTeamId,
        contractOffer
      );

      if (bid) {
        console.log('Bid submitted successfully:', bid);
        this.closeBidModal();
      } else {
        throw new Error('Failed to submit bid');
      }
    } catch (error) {
      console.error('Error submitting bid:', error);
      // Here you would typically show an error message to the user
    } finally {
      this.isSubmitting.set(false);
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
}
