import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { LeagueHeaderComponent } from './league-header.component';
import { EditTeamModalComponent } from './edit-team-modal';
import { LeagueSettingsComponent } from '../league-settings';
import { League, LeaguePhase } from '@fantasy-football-dynasty/types';
import { LeagueMembershipService } from '../../services/league-membership.service';
import { AuthService } from '../../services/auth.service';

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
  template: `
    <div class="league-detail-container">
      <app-league-header
        [leagueName]="'My Dynasty League'"
        [leagueSubtitle]="'12 Teams • Dynasty • PPR Scoring'"
        (openEditTeam)="openEditTeamModal()"
      ></app-league-header>

      <div class="league-content">
        <div class="info-section">
          <h2>League Information</h2>
          <p>League details and management will go here...</p>
        </div>

        <div class="actions">
          <button class="btn-primary" (click)="goToDraft()">
            🏈 Enter Draft Room
          </button>
          @if (canManageLeague()) {
            <button class="btn-secondary" (click)="showSettings()">
              ⚙️ League Settings
            </button>
          }
          <button class="btn-secondary" routerLink="/leagues">
            Back to Leagues
          </button>
        </div>
      </div>
    </div>

    <app-edit-team-modal
      [visible]="editTeamModalVisible"
      (visibleChange)="onEditTeamModalVisibleChange($event)"
    ></app-edit-team-modal>

    <app-league-settings
      [league]="mockLeague"
      *ngIf="showSettingsView"
    ></app-league-settings>
  `,
  styles: [
    `
      .league-detail-container {
        padding: 2rem;
        max-width: 800px;
        margin: 0 auto;
      }

      .league-content {
        background: var(--bg-secondary);
        border-radius: 1rem;
        padding: 2rem;
        border: 1px solid var(--border-primary);
      }

      .info-section {
        margin-bottom: 2rem;
      }

      .info-section h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 1rem 0;
      }

      .info-section p {
        color: var(--text-secondary);
        margin: 0;
      }

      .actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-start;
        flex-wrap: wrap;
      }

      .btn-secondary {
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid var(--border-primary);
        background: var(--bg-tertiary);
        color: var(--text-secondary);
        font-size: 1rem;
      }

      .btn-primary {
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        background: #3b82f6;
        color: white;
        font-size: 1rem;
      }

      .btn-primary:hover {
        background: #2563eb;
      }

      .btn-secondary:hover {
        background: var(--bg-primary);
        color: var(--text-primary);
      }
    `,
  ],
})
export class LeagueDetailComponent implements OnInit {
  editTeamModalVisible = false;
  showSettingsView = false;
  leagueId: string = '';

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
      freeAgency: {
        bidRounds: 30,
        tieBreakers: ['guarantees', 'apy', 'length', 'random'],
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private leagueMembershipService: LeagueMembershipService,
    private authService: AuthService,
  ) {
    this.leagueId = this.route.snapshot.params['id'];
  }

  async ngOnInit(): Promise<void> {
    try {
      const canManage = await this.leagueMembershipService.canManageLeague(this.leagueId);
      this.canManageLeagueSignal.set(canManage);
    } catch (err) {
      console.error('Error checking league management permissions:', err);
    }
  }

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
    this.router.navigate(['/draft', this.leagueId]);
  }

  canManageLeagueSignal = signal(false);
  canManageLeague() {
    return this.canManageLeagueSignal();
  }
}
