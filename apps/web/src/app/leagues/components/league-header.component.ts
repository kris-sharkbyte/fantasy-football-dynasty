import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  input,
  inject,
  OnInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { LeagueService } from '../../services/league.service';
import { Router, ActivatedRoute } from '@angular/router';

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

    <p-tabs [value]="activeTabIndex()" scrollable>
      <p-tablist>
        <p-tab value="0" (click)="navigateToTab('league-info')">
          League Info
        </p-tab>
        <p-tab value="1" (click)="navigateToTab('team')"> My Team </p-tab>
        <p-tab value="2" (click)="navigateToTab('players')"> Players </p-tab>
        <p-tab value="3" (click)="navigateToTab('draft')"> Draft Room </p-tab>
        <p-tab value="4" (click)="navigateToTab('free-agency')">
          Free Agents
        </p-tab>
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
export class LeagueHeaderComponent implements OnInit {
  private readonly leagueService = inject(LeagueService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  public league = this.leagueService.selectedLeague;
  public leagueId = this.leagueService.selectedLeagueId;
  @Output() openEditTeam = new EventEmitter<void>();

  // Computed active tab based on current route
  public activeTabIndex = computed(() => {
    const currentRoute = this.router.url;
    const leagueId = this.leagueId();

    if (!leagueId) return 0;

    if (currentRoute.includes(`/leagues/${leagueId}/team`)) return 1;
    if (currentRoute.includes(`/leagues/${leagueId}/players`)) return 2;
    if (currentRoute.includes(`/draft/${leagueId}`)) return 3;
    if (currentRoute.includes(`/leagues/${leagueId}/free-agency`)) return 4;

    // Default to league info (0) for league detail page
    return 0;
  });

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

  ngOnInit(): void {
    // Component is ready
  }

  toggleSettingsMenu(event: Event): void {
    // The menu will be shown by PrimeNG automatically
  }

  openEditTeamModal(): void {
    this.openEditTeam.emit();
  }

  navigateToTab(tabName: string): void {
    const leagueId = this.leagueId();
    if (!leagueId) return;

    switch (tabName) {
      case 'league-info':
        this.router.navigate(['/leagues', leagueId]);
        break;
      case 'team':
        this.router.navigate(['/leagues', leagueId, 'team']);
        break;
      case 'players':
        this.router.navigate(['/leagues', leagueId, 'players']);
        break;
      case 'draft':
        this.router.navigate(['/draft', leagueId]);
        break;
      case 'free-agency':
        this.router.navigate(['/leagues', leagueId, 'free-agency']);
        break;
    }
  }
}
