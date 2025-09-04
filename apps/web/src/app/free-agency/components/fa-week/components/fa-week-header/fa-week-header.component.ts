import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
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
  imports: [CommonModule, ButtonModule],
  templateUrl: './fa-week-header.component.html',
})
export class FAWeekHeaderComponent implements OnInit {
  private readonly freeAgencyService = inject(FreeAgencyService);
  private readonly leagueService = inject(LeagueService);

  ngOnInit(): void {
    // Component initialized
  }

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
  readyTeamsCount = computed(() => {
    const count = this.freeAgencyService.readyTeamsCount();
    console.log('[FA Week Header] Ready teams count computed:', count);
    return count;
  });
  totalTeamsCount = computed(() => {
    const count = this.leagueTeams().length;
    console.log('[FA Week Header] Total teams count computed:', count);
    return count;
  });
  isReadyToAdvance = computed(() => {
    const ready = this.freeAgencyService.isReadyToAdvance();
    console.log('[FA Week Header] Is ready to advance computed:', ready);
    return ready;
  });

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

      // Debug after marking ready
      setTimeout(() => {
        // this.debugAdvanceButtonLogic(); // Removed debug method
      }, 1000);
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
}
