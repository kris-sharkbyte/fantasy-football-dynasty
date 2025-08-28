import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeagueHeaderComponent } from '../components/league-header.component';
import { EditTeamModalComponent } from './edit-team-modal';
import { LeagueSettingsComponent } from '../league-settings';
import { LeagueMembershipService } from '../../services/league-membership.service';
import { LeagueService } from '../../services/league.service';
import { FreeAgencyService } from '../../services/free-agency.service';

@Component({
  selector: 'app-league-detail',
  standalone: true,
  imports: [
    CommonModule,
    LeagueHeaderComponent,
    EditTeamModalComponent,
    LeagueSettingsComponent,
  ],
  templateUrl: './league-detail.component.html',
  styleUrls: ['./league-detail.component.scss'],
})
export class LeagueDetailComponent {
  private readonly leagueMembershipService = inject(LeagueMembershipService);
  private readonly leagueService = inject(LeagueService);
  private readonly freeAgencyService = inject(FreeAgencyService);

  editTeamModalVisible = false;
  showSettingsView = false;

  league = this.leagueService.selectedLeague;
  leagueId = this.leagueService.selectedLeagueId;

  // Use the reactive permissions from the service
  readonly canManageLeague = this.leagueMembershipService.canManageLeague;
  readonly canManageDraft = this.leagueMembershipService.canManageDraft;
  readonly canViewAllTeams = this.leagueMembershipService.canViewAllTeams;

  // Free Agency status
  readonly currentFAWeek = this.freeAgencyService.currentFAWeek;
  readonly isFAWeekPhase = this.freeAgencyService.isFAWeekPhase;
  readonly isOpenFAPhase = this.freeAgencyService.isOpenFAPhase;
  readonly weekStatus = this.freeAgencyService.weekStatus;
  readonly readyTeamsCount = this.freeAgencyService.readyTeamsCount;
  readonly totalTeamsCount = this.freeAgencyService.totalTeamsCount;
  readonly isReadyToAdvance = this.freeAgencyService.isReadyToAdvance;

  openEditTeamModal(): void {
    this.editTeamModalVisible = true;
  }

  onEditTeamModalVisibleChange(visible: boolean): void {
    this.editTeamModalVisible = visible;
  }

  showSettings(): void {
    this.showSettingsView = true;
  }

  /**
   * Advance to next FA week (commissioner only)
   */
  async advanceFAWeek(): Promise<void> {
    try {
      const success = await this.freeAgencyService.advanceToNextWeek();
      if (success) {
        console.log('FA week advanced successfully');
      } else {
        console.error('Failed to advance FA week');
      }
    } catch (error) {
      console.error('Error advancing FA week:', error);
    }
  }
}
