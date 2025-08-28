import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FreeAgencyService } from '../../../../../services/free-agency.service';
import { LeagueService } from '../../../../../services/league.service';
import { computed } from '@angular/core';

interface MarketContextSummary {
  leagueHealth: string;
  averageCapSpace: number;
  recentSigningsCount: number;
}

@Component({
  selector: 'app-fa-week-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fa-week-header.component.html',
  styleUrl: './fa-week-header.component.scss',
})
export class FAWeekHeaderComponent {
  private readonly freeAgencyService = inject(FreeAgencyService);
  private readonly leagueService = inject(LeagueService);

  // Computed values from services - now using cached data
  currentWeek = computed(
    () => this.freeAgencyService.currentFAWeek()?.weekNumber || 0
  );
  isFAWeekPhase = computed(
    () => this.leagueService.selectedLeague()?.phase === 'free-agency'
  );
  weekStatus = computed(
    () => this.freeAgencyService.currentFAWeek()?.status || 'unknown'
  );
  readyTeamsCount = computed(() => this.freeAgencyService.readyTeamsCount());
  totalTeamsCount = computed(() => this.leagueTeams().length); // Use cached league teams
  isReadyToAdvance = computed(() => this.freeAgencyService.isReadyToAdvance());

  // Use cached league data
  currentUserTeam = computed(() => this.leagueService.currentUserTeam());
  leagueTeams = computed(() => this.leagueService.leagueTeams());
  hasSelectedLeague = computed(() => this.leagueService.hasSelectedLeague());

  // Check if current user's team is ready
  isTeamReady = computed(() => {
    const myTeam = this.currentUserTeam();
    if (!myTeam?.teamId) return false;

    // Check if team is in the ready teams list
    const currentWeek = this.freeAgencyService.currentFAWeek();
    if (!currentWeek?.readyTeams) return false;

    return currentWeek.readyTeams.includes(myTeam.teamId);
  });

  // TODO: Implement when service has this property
  marketContextSummary = computed<MarketContextSummary | null>(() => null);

  /**
   * Mark team as ready to advance
   */
  async markReady(): Promise<void> {
    try {
      const currentLeague = this.leagueService.selectedLeague();
      if (!currentLeague) {
        console.error('No league selected');
        return;
      }

      // Get current user's team from cached data
      const myTeam = this.currentUserTeam();
      if (!myTeam?.teamId) {
        console.error(
          'Team not found for current user in league:',
          currentLeague.id
        );
        return;
      }

      await this.freeAgencyService.markTeamReady(myTeam.teamId);
      console.log('Team marked as ready successfully');
    } catch (error) {
      console.error('Error marking team ready:', error);
    }
  }

  /**
   * Advance to next week (commissioner only)
   */
  async advanceWeek(): Promise<void> {
    try {
      const success = await this.freeAgencyService.advanceToNextWeek();
      if (success) {
        console.log('Week advanced successfully');
      } else {
        throw new Error('Failed to advance week');
      }
    } catch (error) {
      console.error('Error advancing week:', error);
    }
  }

  /**
   * Trigger weekly player evaluation manually (for testing)
   */
  async triggerWeeklyEvaluation(): Promise<void> {
    try {
      await this.freeAgencyService.triggerWeeklyEvaluation();
      console.log('Weekly evaluation triggered successfully');
    } catch (error) {
      console.error('Error triggering weekly evaluation:', error);
    }
  }
}
