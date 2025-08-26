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

  // Mock league data for now - this should come from the service
  mockLeague: League = {
    id: 'mock-league',
    name: 'My Dynasty League',
    description: 'A competitive dynasty fantasy football league',
    numberOfTeams: 12,
    phase: 'offseason' as LeaguePhase,
    status: 'active',
    currentYear: 2024,
    isPrivate: false,
    joinCode: 'ABC123',
    rules: {
      scoring: {
        ppr: 1,
        passingYards: 0.04,
        rushingYards: 0.1,
        receivingYards: 0.1,
        passingTouchdown: 4,
        rushingTouchdown: 6,
        receivingTouchdown: 6,
        interception: -2,
        fumble: -2,
        fieldGoal: 3,
        extraPoint: 1,
      },
      cap: {
        salaryCap: 200000000,
        minimumSpend: 180000000,
        deadMoneyRules: {
          preJune1: true,
          signingBonusAcceleration: true,
        },
      },
      contracts: {
        maxYears: 5,
        maxSigningBonus: 50000000,
        rookieScale: true,
      },
      draft: {
        mode: 'snake',
        rounds: 25,
        timeLimit: 90,
        snakeOrder: true,
        autodraftDelay: 30,
        rookieAutoContracts: true,
        veteranNegotiationWindow: 72,
      },
      roster: {
        minPlayers: 15,
        maxPlayers: 25,
        positionRequirements: {
          QB: 2,
          RB: 4,
          WR: 6,
          TE: 2,
          K: 1,
          DEF: 1,
        },
        allowIR: true,
        allowTaxi: true,
        maxIR: 3,
        maxTaxi: 4,
      },
      freeAgency: {
        bidRounds: 30,
        tieBreakers: ['guarantees', 'apy', 'length', 'random'],
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  openEditTeamModal(): void {
    this.editTeamModalVisible = true;
  }

  onEditTeamModalVisibleChange(visible: boolean): void {
    this.editTeamModalVisible = visible;
  }

  showSettings(): void {
    this.showSettingsView = true;
  }

  goToDraft(): void {
    // Navigate to the draft room for this league
    const currentLeagueId = this.leagueId();
    if (currentLeagueId) {
      this.router.navigate(['/draft', currentLeagueId]);
    }
  }
}
