import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarMenuComponent } from '../sidebar-menu/sidebar-menu.component';

@Component({
  selector: 'app-leagues-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarMenuComponent],
  template: `
    <div class="leagues-layout">
      <!-- Left Sidebar -->
      <aside class="sidebar">
        <app-sidebar-menu></app-sidebar-menu>
      </aside>

      <!-- Main Content Area -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      .leagues-layout {
        display: flex;
        height: 100vh;
        background-color: var(--bg-primary);
      }

      .sidebar {
        width: 280px;
        background-color: var(--bg-secondary);
        border-right: 1px solid var(--border-primary);
        flex-shrink: 0;
        overflow-y: auto;
      }

      .main-content {
        flex: 1;
        overflow-y: auto;
        background-color: var(--bg-primary);
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .sidebar {
          position: fixed;
          left: -280px;
          top: 0;
          height: 100vh;
          z-index: 1000;
          transition: left 0.3s ease;
        }

        .sidebar.open {
          left: 0;
        }

        .main-content {
          margin-left: 0;
        }
      }
    `,
  ],
})
export class LeaguesLayoutComponent {
  // Layout state management
  private sidebarOpenSignal = signal<boolean>(false);
  public sidebarOpen = this.sidebarOpenSignal.asReadonly();

  toggleSidebar(): void {
    this.sidebarOpenSignal.update((open) => !open);
  }
}
