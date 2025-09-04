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
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  FreeAgencyService,
  FAWeekPlayer,
} from '../../../services/free-agency.service';
import { LeagueService } from '../../../services/league.service';
import { EnhancedPlayerMinimumService } from '../../../services/enhanced-player-minimum.service';
import { SportsDataService } from '../../../services/sports-data.service';
import { FAWeekHeaderComponent } from './components/fa-week-header';
import { TeamBidsComponent } from './components/team-bids';
import { SalaryCapComponent } from './components/salary-cap';
import { PlayerDecisionsComponent } from './components/player-decisions';
import { ContractInputsComponent } from '../../../teams/negotiation/components/contract-inputs/contract-inputs.component';
import { PlayersTableComponent } from '../../../shared/components/players-table/players-table.component';
import {
  PlayerCardComponent,
  PlayerCardData,
  PlayerCardConfig,
} from '../../../shared/components/player-card';
import { SportsPlayer } from 'libs/types/src/lib/types';

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
    MessageModule,
    ToastModule,
    FAWeekHeaderComponent,
    TeamBidsComponent,
    SalaryCapComponent,
    PlayerDecisionsComponent,
    ContractInputsComponent,
    PlayersTableComponent,
    PlayerCardComponent,
  ],
  providers: [MessageService],
  templateUrl: './fa-week.component.html',
  styleUrls: ['./fa-week.component.scss'],
})
export class FAWeekComponent implements OnInit {
  private readonly freeAgencyService = inject(FreeAgencyService);
  private readonly leagueService = inject(LeagueService);
  private readonly enhancedPlayerMinimumService = inject(
    EnhancedPlayerMinimumService
  );
  private readonly sportsDataService = inject(SportsDataService);
  private readonly messageService = inject(MessageService);

  // State signals
  public selectedPlayer = signal<SportsPlayer | null>(null);
  public showBidModal = signal<boolean>(false);
  public bidForm = signal({ years: 1, baseSalary: 0, signingBonus: 0 });
  public isSubmitting = signal<boolean>(false);
  public playerMinimum = signal<number | null>(null);
  public marketContextSummary = signal<any>(null);
  public isEditingBid = signal<boolean>(false);
  public existingBidId = signal<string | null>(null);

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

  // Players table configuration for FA Week
  public playersTableConfig = computed(() => ({
    title: 'Available Players',
    subtitle: 'Submit bids for free agents',
    emptyMessage: 'No players available for bidding',
    showFilters: true,
    showSearch: true,
    showPagination: true,
    pageSize: 20,
    mode: 'bid' as const,
    actions: [],
    leagueId: this.leagueService.selectedLeague()?.id,
    showBidCounts: true,
    showEstimatedMinimum: true,
    showMarketTrends: false,
    onBidClick: (player: any) => this.openBidModal(player),
    onPlayerClick: (player: any) => this.openBidModal(player),
  }));

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
  openBidModal(player: SportsPlayer): void {
    console.log('[FA Week] Opening bid modal for player:', {
      playerId: player.PlayerID,
      name: `${player.FirstName} ${player.LastName}`,
      position: player.Position,
    });
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
    this.isEditingBid.set(false);
    this.existingBidId.set(null);
  }

  /**
   * Initialize bid form with player minimum and existing bid if available
   */
  private async initializeBidForm(player: SportsPlayer): Promise<void> {
    try {
      const minimum = await this.freeAgencyService.getEnhancedPlayerMinimum(
        player.PlayerID
      );
      this.playerMinimum.set(minimum);

      // Check if current team has an existing bid on this player
      const currentTeamId = this.leagueService.currentUserTeamId();
      const existingBid = this.getExistingBidForPlayer(
        player.PlayerID,
        currentTeamId
      );

      if (existingBid) {
        // Pre-populate with existing bid data
        const baseSalary =
          existingBid.offer.baseSalary[new Date().getFullYear()] || 0;
        this.bidForm.set({
          years: existingBid.offer.years,
          baseSalary: baseSalary,
          signingBonus: existingBid.offer.signingBonus || 0,
        });

        // Set editing state
        this.isEditingBid.set(true);
        this.existingBidId.set(existingBid.id);
      } else {
        // Initialize with minimum or default values
        this.bidForm.set({
          years: 1,
          baseSalary: minimum || 0,
          signingBonus: 0,
        });

        // Set new bid state
        this.isEditingBid.set(false);
        this.existingBidId.set(null);
      }
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

      // Check if we have an existing bid for this player
      const existingBid = this.getExistingBidForPlayer(
        player.PlayerID,
        currentUserTeamId
      );

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

      // Check if bid is below minimum and show warning
      const playerMinimum = this.playerMinimum();
      if (playerMinimum && contractOffer.apy < playerMinimum) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Low Bid Warning',
          detail: `Your bid of $${contractOffer.apy.toLocaleString()} is below the estimated minimum of $${playerMinimum.toLocaleString()}. The player may not accept this offer.`,
          life: 5000,
        });
      }

      // Submit or update bid
      let bid;
      if (existingBid) {
        bid = await this.freeAgencyService.updateBid(
          existingBid.id,
          contractOffer
        );
      } else {
        bid = await this.freeAgencyService.submitBid(
          player.PlayerID,
          currentUserTeamId,
          contractOffer
        );
      }

      if (bid) {
        const action = existingBid ? 'updated' : 'submitted';
        this.messageService.add({
          severity: 'success',
          summary: `Bid ${action.charAt(0).toUpperCase() + action.slice(1)}`,
          detail: `Bid ${action} successfully for ${player.FirstName} ${player.LastName}`,
          life: 3000,
        });
        this.closeBidModal();
      } else {
        throw new Error(`Failed to ${existingBid ? 'update' : 'submit'} bid`);
      }
    } catch (error) {
      console.error('Error submitting bid:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Bid Submission Failed',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to submit bid. Please try again.',
        life: 5000,
      });
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

  /**
   * Get player card data for the selected player
   */
  getPlayerCardData(): PlayerCardData {
    const player = this.selectedPlayer();
    console.log('player', player);
    if (!player) {
      return {
        playerId: 0,
        firstName: '',
        lastName: '',
        position: '',
        team: '',
        overall: 0,
        age: 0,
        experience: 0,
        status: 'available',
      };
    }

    // Get enhanced player data from sports data service
    const enhancedPlayer = this.sportsDataService.getPlayerById(
      player.PlayerID
    );
    console.log(enhancedPlayer);
    const team = this.sportsDataService.getTeamById(
      enhancedPlayer?.TeamID || 0
    );
    console.log(team);
    return {
      playerId: player.PlayerID,
      firstName: player.FirstName,
      lastName: player.LastName,
      position: player.Position,
      team: player.Team || '',
      overall: player.overall,
      age: player.Age,
      experience: enhancedPlayer?.Experience || 0,
      status: player.Status,
      photoUrl: enhancedPlayer?.PhotoUrl || '',
      teamLogoUrl: team?.WikipediaLogoUrl || '',
    };
  }

  /**
   * Get player card configuration for the bid modal
   */
  getPlayerCardConfig(): PlayerCardConfig {
    return {
      showOverall: true,
      showAge: true,
      showExperience: true,
      showStatus: false,
      showTeamLogo: true,
      showPlayerPhoto: true,
      size: 'large',
      layout: 'horizontal',
      theme: 'dark',
    };
  }

  /**
   * Get player photo URL (placeholder implementation)
   */
  private getPlayerPhotoUrl(playerId: string): string | undefined {
    // This would typically come from a player photo service
    // For now, return undefined to show initials
    return undefined;
  }

  /**
   * Get team logo URL (placeholder implementation)
   */
  private getTeamLogoUrl(playerId: string): string | undefined {
    // This would typically come from a team logo service
    // For now, return undefined to show team initials
    return undefined;
  }

  /**
   * Get existing bid for a player from current team
   */
  private getExistingBidForPlayer(
    playerId: number,
    teamId: string | null
  ): any | null {
    if (!teamId) return null;

    const activeBids = this.activeBids();
    const existingBid = activeBids.find(
      (bid) => bid.playerId === playerId && bid.teamId === teamId
    );

    return existingBid || null;
  }

  /**
   * Remove an existing bid
   */
  async removeBid(): Promise<void> {
    const bidId = this.existingBidId();
    if (!bidId) return;

    try {
      this.isSubmitting.set(true);

      const success = await this.freeAgencyService.removeBid(bidId);

      if (success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Bid Removed',
          detail: 'Your bid has been removed successfully',
          life: 3000,
        });
        this.closeBidModal();
      } else {
        throw new Error('Failed to remove bid');
      }
    } catch (error) {
      console.error('Error removing bid:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Bid Removal Failed',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to remove bid. Please try again.',
        life: 5000,
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
