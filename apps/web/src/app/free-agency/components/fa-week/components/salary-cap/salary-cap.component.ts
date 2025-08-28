import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamService } from '../../../../../services/team.service';
import { LeagueService } from '../../../../../services/league.service';
import { FreeAgencyService } from '../../../../../services/free-agency.service';
import { NumberFormatService } from '../../../../../services/number-format.service';
import { computed } from '@angular/core';

@Component({
  selector: 'app-salary-cap',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './salary-cap.component.html',
  styleUrls: ['./salary-cap.component.scss'],
})
export class SalaryCapComponent {
  private readonly teamService = inject(TeamService);
  private readonly leagueService = inject(LeagueService);
  private readonly freeAgencyService = inject(FreeAgencyService);
  private readonly numberFormatService = inject(NumberFormatService);

  // Computed values from services - now using cached data
  public activeBids = computed(() => this.freeAgencyService.activeBids());

  // Use cached league data
  public currentUserTeam = computed(() => this.leagueService.currentUserTeam());
  public leagueTeams = computed(() => this.leagueService.leagueTeams());
  public selectedLeague = computed(() => this.leagueService.selectedLeague());

  // Team cap information from cached data
  public currentTeamCap = computed(() => {
    const myTeam = this.currentUserTeam();
    if (!myTeam) return 0;

    // Get actual team cap space from cached data
    return myTeam.capSpace || 200000000; // Use actual cap space or default
  });

  // Team bids filtered for current user
  public currentTeamBids = computed(() => {
    const myTeam = this.currentUserTeam();
    if (!myTeam?.teamId) return [];

    return this.activeBids().filter((bid: any) => bid.teamId === myTeam.teamId);
  });

  // Salary cap calculations
  public totalBidsValue = computed(() => {
    return this.currentTeamBids()
      .filter((bid) => bid.status === 'pending')
      .reduce((sum, bid) => sum + (bid.offer.totalValue || 0), 0);
  });

  public remainingCapSpace = computed(() => {
    const totalCap = this.currentTeamCap();
    const totalBidsValue = this.totalBidsValue();
    return totalCap - totalBidsValue;
  });

  // Additional computed values for display
  public totalTeams = computed(() => this.leagueTeams().length);
  public teamsWithBids = computed(() => {
    const teamIdsWithBids = new Set(
      this.activeBids().map((bid: any) => bid.teamId)
    );
    return teamIdsWithBids.size;
  });

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return this.numberFormatService.formatCurrency(amount);
  }
}
