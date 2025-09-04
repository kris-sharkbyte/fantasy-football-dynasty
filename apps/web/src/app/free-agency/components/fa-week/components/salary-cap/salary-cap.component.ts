import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamService } from '../../../../../services/team.service';
import { LeagueService } from '../../../../../services/league.service';
import { FreeAgencyService } from '../../../../../services/free-agency.service';
import { NumberFormatService } from '../../../../../services/number-format.service';
import { computed } from '@angular/core';
import { Position } from '@fantasy-football-dynasty/types';

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

  // Roster spot tracking
  public rosterSpotTracking = computed(() => {
    const league = this.selectedLeague();
    const myTeam = this.currentUserTeam();
    const myBids = this.currentTeamBids();

    if (!league?.rules?.roster?.positionRequirements || !myTeam) {
      return [];
    }

    const positionRequirements = league.rules.roster.positionRequirements;
    const tracking: Array<{
      position: Position;
      required: number;
      currentBids: number;
      status: 'under-limit' | 'at-limit' | 'over-limit';
    }> = [];

    // Get all positions that have requirements
    Object.entries(positionRequirements).forEach(([position, required]) => {
      const pos = position as Position;
      const requiredCount = required as number;

      // Count non-rejected bids for this position
      const currentBids = myBids.filter(
        (bid) => bid.position === pos && bid.status !== 'rejected'
      ).length;

      // Determine status
      let status: 'under-limit' | 'at-limit' | 'over-limit' = 'under-limit';
      if (currentBids > requiredCount) {
        status = 'over-limit';
      } else if (currentBids === requiredCount) {
        status = 'at-limit';
      }

      tracking.push({
        position: pos,
        required: requiredCount,
        currentBids,
        status,
      });
    });

    // Sort by position for consistent display
    return tracking.sort((a, b) => a.position.localeCompare(b.position));
  });

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return this.numberFormatService.formatCurrency(amount);
  }
}
