import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-league-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="league-detail-container">
      <div class="league-header">
        <h1>League Detail</h1>
        <p>Individual league view will go here...</p>
      </div>

      <div class="league-content">
        <div class="info-section">
          <h2>League Information</h2>
          <p>League details and management will go here...</p>
        </div>

        <div class="actions">
          <button class="btn-secondary" routerLink="/leagues">
            Back to Leagues
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .league-detail-container {
        padding: 2rem;
        max-width: 800px;
        margin: 0 auto;
      }

      .league-header {
        text-align: center;
        margin-bottom: 3rem;
      }

      .league-header h1 {
        font-size: 2.5rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 0.5rem 0;
      }

      .league-header p {
        color: var(--text-secondary);
        font-size: 1.125rem;
        margin: 0;
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

      .btn-secondary:hover {
        background: var(--bg-primary);
        color: var(--text-primary);
      }
    `,
  ],
})
export class LeagueDetailComponent {
  // TODO: Implement league detail view
}

