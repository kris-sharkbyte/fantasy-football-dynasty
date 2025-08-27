import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  input,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { LeagueService } from '../../services/league.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-league-header',
  standalone: true,
  imports: [CommonModule, ButtonModule, MenuModule, TabsModule],
  template: `
    <div class="league-header">
      <div class="league-info">
        <h1 class="league-name">{{ league()?.name }}</h1>
        <p class="league-subtitle">{{ league()?.description }}</p>
      </div>

      <div class="league-actions">
        <button
          pButton
          type="button"
          icon="pi pi-cog"
          class="p-button-rounded p-button-text p-button-lg"
          (click)="toggleSettingsMenu($event)"
          aria-label="League Settings"
        ></button>

        <p-menu
          #settingsMenu
          [popup]="true"
          [model]="settingsMenuItems"
          appendTo="body"
        ></p-menu>
      </div>
    </div>

    <p-tabs value="0" scrollable>
      <p-tablist>
        <p-tab value="0"> League Info </p-tab>
        <p-tab value="1" (click)="goToMyRoster()"> My Roster </p-tab>

        <p-tab value="2"> Draft Room </p-tab>

        <p-tab value="3"> Free Agents </p-tab>
      </p-tablist>
    </p-tabs>
  `,
  styles: [
    `
      .league-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2rem;
        padding: 1.5rem 0;
        border-bottom: 1px solid var(--border-primary);
      }

      .league-info {
        flex: 1;
      }

      .league-name {
        font-size: 2.5rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 0.5rem 0;
        line-height: 1.2;
      }

      .league-subtitle {
        color: var(--text-secondary);
        font-size: 1.125rem;
        margin: 0;
        font-weight: 500;
      }

      .league-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .p-button-rounded {
        width: 3rem;
        height: 3rem;
        border: 2px solid var(--border-primary);
        transition: all 0.2s ease;
      }

      .p-button-rounded:hover {
        background: var(--primary-color);
        border-color: var(--primary-color);
        color: white;
        transform: scale(1.05);
      }

      @media (max-width: 768px) {
        .league-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .league-name {
          font-size: 2rem;
        }

        .league-actions {
          align-self: flex-end;
        }
      }
    `,
  ],
})
export class LeagueHeaderComponent {
  private readonly leagueService = inject(LeagueService);
  private readonly router = inject(Router);
  public league = this.leagueService.selectedLeague;
  public leagueId = this.leagueService.selectedLeagueId;
  @Output() openEditTeam = new EventEmitter<void>();

  settingsMenuItems: MenuItem[] = [
    {
      label: 'Edit Team',
      icon: 'pi pi-pencil',
      command: () => this.openEditTeamModal(),
    },
    {
      label: 'League Settings',
      icon: 'pi pi-cog',
      disabled: true, // TODO: Implement league settings
    },
    {
      label: 'Manage Members',
      icon: 'pi pi-users',
      disabled: true, // TODO: Implement member management
    },
    {
      label: 'League Rules',
      icon: 'pi pi-file-edit',
      disabled: true, // TODO: Implement rules editor
    },
    {
      separator: true,
    },
    {
      label: 'Export Data',
      icon: 'pi pi-download',
      disabled: true, // TODO: Implement data export
    },
    {
      label: 'League History',
      icon: 'pi pi-history',
      disabled: true, // TODO: Implement history view
    },
  ];

  toggleSettingsMenu(event: Event): void {
    // The menu will be shown by PrimeNG automatically
  }

  openEditTeamModal(): void {
    this.openEditTeam.emit();
  }

  goToMyRoster(): void {
    if (this.league()) {
      this.router.navigate(['/leagues', this.league()!.id, 'roster']);
    }
  }
}
