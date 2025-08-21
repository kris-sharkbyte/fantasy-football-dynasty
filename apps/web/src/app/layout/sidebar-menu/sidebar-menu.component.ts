import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  routerLink?: string[];
  action?: () => void;
  badge?: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-sidebar-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sidebar-menu">
      <!-- Logo Section -->
      <div class="logo-section">
        <div class="logo">
          <span class="logo-icon">🏈</span>
          <span class="logo-text">Dynasty Fantasy</span>
        </div>
      </div>

      <!-- Core Navigation -->
      <nav class="nav-section">
        <div class="nav-item" (click)="navigateToDirectMessages()">
          <span class="nav-icon">💬</span>
          <span class="nav-label">Direct Messages</span>
        </div>

        <div class="nav-item" (click)="navigateToInbox()">
          <span class="nav-icon">📧</span>
          <span class="nav-label">Inbox</span>
        </div>
      </nav>

      <!-- Leagues Section -->
      <div class="leagues-section">
        <div class="section-header">
          <h3 class="section-title">LEAGUES</h3>
          <button
            class="add-league-btn"
            (click)="createNewLeague()"
            title="Create New League"
          >
            <span class="add-icon">+</span>
          </button>
        </div>

        <div class="leagues-list">
          <div
            *ngFor="let league of userLeagues()"
            class="league-item"
            [class.active]="league.isActive"
            (click)="selectLeague(league)"
          >
            <div class="league-avatar">
              <span class="league-icon">🏆</span>
            </div>
            <div class="league-info">
              <div class="league-name">{{ league.name }}</div>
              <div class="league-details">
                {{ league.type }} • {{ league.teams }} teams
              </div>
              <div class="league-status" [class]="league.status">
                {{ league.status }}
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="userLeagues().length === 0" class="empty-leagues">
            <div class="empty-icon">🏈</div>
            <p class="empty-text">No leagues yet</p>
            <button class="create-first-league-btn" (click)="createNewLeague()">
              Create Your First League
            </button>
          </div>
        </div>
      </div>

      <!-- Channels Section (Future Feature) -->
      <div class="channels-section">
        <h3 class="section-title">CHANNELS</h3>
        <div class="empty-channels">
          <p class="empty-text">No channels yet</p>
        </div>
      </div>

      <!-- User Profile Section -->
      <div class="user-section">
        <div class="user-profile" (click)="openUserMenu()">
          <div class="user-avatar">
            <span class="user-icon">👤</span>
          </div>
          <div class="user-info">
            <div class="username">
              {{ currentUser()?.displayName || currentUser()?.email }}
            </div>
            <div class="user-status">Online</div>
          </div>
          <button class="user-menu-btn" title="User Menu">
            <span class="menu-icon">⚙️</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .sidebar-menu {
        display: flex;
        flex-direction: column;
        height: 100%;
        background-color: var(--bg-secondary);
        color: var(--text-primary);
      }

      /* Logo Section */
      .logo-section {
        padding: 1.5rem 1rem;
        border-bottom: 1px solid var(--border-primary);
      }

      .logo {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .logo-icon {
        font-size: 2rem;
        color: var(--primary-500);
      }

      .logo-text {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
      }

      /* Navigation Section */
      .nav-section {
        padding: 1rem 0;
        border-bottom: 1px solid var(--border-primary);
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
        color: var(--text-secondary);
      }

      .nav-item:hover {
        background-color: var(--bg-tertiary);
        color: var(--text-primary);
      }

      .nav-icon {
        font-size: 1.25rem;
        width: 1.5rem;
        text-align: center;
      }

      .nav-label {
        font-weight: 500;
      }

      /* Leagues Section */
      .leagues-section {
        flex: 1;
        padding: 1rem 0;
        border-bottom: 1px solid var(--border-primary);
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 1rem 0.75rem;
      }

      .section-title {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--text-tertiary);
        margin: 0;
        letter-spacing: 0.05em;
      }

      .add-league-btn {
        background: none;
        border: none;
        color: var(--text-tertiary);
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 50%;
        width: 1.5rem;
        height: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .add-league-btn:hover {
        background-color: var(--bg-tertiary);
        color: var(--text-primary);
      }

      .add-icon {
        font-size: 1rem;
        font-weight: 600;
      }

      .leagues-list {
        padding: 0 0.5rem;
      }

      .league-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        margin: 0.25rem 0;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .league-item:hover {
        background-color: var(--bg-tertiary);
      }

      .league-item.active {
        background-color: var(--primary-100);
        border: 1px solid var(--primary-300);
      }

      .league-avatar {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        background-color: var(--primary-100);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .league-icon {
        font-size: 1.25rem;
      }

      .league-info {
        flex: 1;
        min-width: 0;
      }

      .league-name {
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .league-details {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-bottom: 0.25rem;
      }

      .league-status {
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.125rem 0.5rem;
        border-radius: 1rem;
        display: inline-block;
      }

      .league-status.pre-draft {
        background-color: var(--info-100);
        color: var(--info-700);
      }

      .league-status.drafting {
        background-color: var(--warning-100);
        color: var(--warning-700);
      }

      .league-status.in-season {
        background-color: var(--success-100);
        color: var(--success-700);
      }

      .league-status.offseason {
        background-color: var(--secondary-100);
        color: var(--secondary-700);
      }

      /* Empty States */
      .empty-leagues,
      .empty-channels {
        padding: 2rem 1rem;
        text-align: center;
        color: var(--text-tertiary);
      }

      .empty-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        opacity: 0.5;
      }

      .empty-text {
        margin: 0 0 1rem 0;
        font-size: 0.875rem;
      }

      .create-first-league-btn {
        background-color: var(--primary-500);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .create-first-league-btn:hover {
        background-color: var(--primary-600);
      }

      /* Channels Section */
      .channels-section {
        padding: 1rem 0;
        border-bottom: 1px solid var(--border-primary);
      }

      /* User Section */
      .user-section {
        padding: 1rem;
        border-top: 1px solid var(--border-primary);
        background-color: var(--bg-tertiary);
      }

      .user-profile {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 0.5rem;
        transition: all 0.2s ease;
      }

      .user-profile:hover {
        background-color: var(--bg-primary);
      }

      .user-avatar {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        background-color: var(--primary-100);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .user-icon {
        font-size: 1.25rem;
      }

      .user-info {
        flex: 1;
        min-width: 0;
      }

      .username {
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .user-status {
        font-size: 0.75rem;
        color: var(--success-500);
      }

      .user-menu-btn {
        background: none;
        border: none;
        color: var(--text-tertiary);
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 50%;
        width: 1.5rem;
        height: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .user-menu-btn:hover {
        background-color: var(--bg-primary);
        color: var(--text-primary);
      }

      .menu-icon {
        font-size: 1rem;
      }
    `,
  ],
})
export class SidebarMenuComponent {
  // Mock data for now - will be replaced with real data
  userLeagues = signal<
    Array<{
      id: string;
      name: string;
      type: string;
      teams: number;
      status: string;
      isActive: boolean;
    }>
  >([]);

  currentUser: any; // Will be initialized in constructor

  constructor(private authService: AuthService) {
    this.currentUser = this.authService.currentUser;
  }

  ngOnInit(): void {
    // TODO: Load user leagues from service
    this.loadUserLeagues();
  }

  private loadUserLeagues(): void {
    // Mock data - replace with real service call
    this.userLeagues.set([
      {
        id: '1',
        name: 'The Dynasty League',
        type: '12-Team Keeper',
        teams: 12,
        status: 'pre-draft',
        isActive: true,
      },
      {
        id: '2',
        name: 'Fantasy Champions',
        type: '10-Team PPR',
        teams: 10,
        status: 'in-season',
        isActive: false,
      },
    ]);
  }

  navigateToDirectMessages(): void {
    // TODO: Implement direct messages navigation
    console.log('Navigate to direct messages');
  }

  navigateToInbox(): void {
    // TODO: Implement inbox navigation
    console.log('Navigate to inbox');
  }

  createNewLeague(): void {
    // TODO: Open create league modal/form
    console.log('Create new league');
  }

  selectLeague(league: any): void {
    // TODO: Navigate to league detail page
    console.log('Select league:', league);
  }

  openUserMenu(): void {
    // TODO: Open user menu dropdown
    console.log('Open user menu');
  }
}
