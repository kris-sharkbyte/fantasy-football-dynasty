import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { LeagueHeaderComponent } from './components/league-header.component';
import { EditTeamModalComponent } from './edit-team-modal';
import { LeagueSettingsComponent } from '../league-settings';
import { League, LeaguePhase } from '@fantasy-football-dynasty/types';
import { LeagueMembershipService } from '../../services/league-membership.service';

import { LeagueService } from '../../services/league.service';

@Component({
  selector: 'app-league-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LeagueHeaderComponent,
    EditTeamModalComponent,
    LeagueSettingsComponent,
  ],
  templateUrl: './league-detail.component.html',
  styleUrls: ['./league-detail.component.scss'],
})
export class LeagueDetailComponent {
  private readonly router = inject(Router);
  private readonly leagueMembershipService = inject(LeagueMembershipService);
  private readonly leagueService = inject(LeagueService);

  editTeamModalVisible = false;
  showSettingsView = false;

  league = this.leagueService.selectedLeague;
  leagueId = this.leagueService.selectedLeagueId;

  // Use the reactive permissions from the service
  readonly canManageLeague = this.leagueMembershipService.canManageLeague;
  readonly canManageDraft = this.leagueMembershipService.canManageDraft;
  readonly canViewAllTeams = this.leagueMembershipService.canViewAllTeams;

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
   * Navigate to draft room
   */
  goToDraft(): void {
    if (this.league()) {
      this.router.navigate(['/draft', this.league()!.id]);
    }
  }

  /**
   * Navigate to user's roster for this league
   */
  goToMyRoster(): void {
    if (this.league()) {
      this.router.navigate(['/leagues', this.league()!.id, 'roster']);
    }
  }
}
