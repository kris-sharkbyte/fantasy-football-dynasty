import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { LeagueHeaderComponent } from './league-header.component';
import { EditTeamModalComponent } from './edit-team-modal';

@Component({
  selector: 'app-league-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LeagueHeaderComponent,
    EditTeamModalComponent,
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
export class LeagueDetailComponent {
  editTeamModalVisible = false;
  leagueId: string = '';

  constructor(private route: ActivatedRoute, private router: Router) {
    this.leagueId = this.route.snapshot.params['id'];
  }

  openEditTeamModal(): void {
    this.editTeamModalVisible = true;
  }

  onEditTeamModalVisibleChange(visible: boolean): void {
    this.editTeamModalVisible = visible;
  }

  goToDraft(): void {
    // Navigate to the draft room for this league
    this.router.navigate(['/draft', this.leagueId]);
  }
}
