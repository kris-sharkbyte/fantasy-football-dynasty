import { Component, inject, signal } from '@angular/core';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '../../services/auth.service';
import { RegisterModalComponent } from '../../components/auth-modals/register-modal/register-modal.component';
import { LoginModalComponent } from '../../components/auth-modals/login-modal/login-modal.component';

@Component({
  selector: 'web-topbar',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    StyleClassModule,
    DialogModule,
    LoginModalComponent,
    RegisterModalComponent,
  ],
  template: ` <!-- Header -->
    <header
      class="bg-surface-0 dark:bg-surface-900 shadow-sm border-b border-surface-200 dark:border-surface-700"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo -->
          <div class="flex items-center">
            <h1
              class="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent"
            >
              Dynasty Fantasy
            </h1>
          </div>

          <!-- Navigation -->
          <nav class="hidden md:flex space-x-8">
            <a
              routerLink="/leagues"
              routerLinkActive="text-primary-600"
              class="text-surface-600 dark:text-surface-400 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              Leagues
            </a>
            <a
              routerLink="/teams"
              routerLinkActive="text-primary-600"
              class="text-surface-600 dark:text-surface-400 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              Teams
            </a>
            <a
              routerLink="/players"
              routerLinkActive="text-primary-600"
              class="text-surface-600 dark:text-surface-400 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              Players
            </a>
            <a
              routerLink="/free-agency"
              routerLinkActive="text-primary-600"
              class="text-surface-600 dark:text-surface-400 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              Free Agency
            </a>
            <a
              routerLink="/draft"
              routerLinkActive="text-primary-600"
              class="text-surface-600 dark:text-surface-400 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              Draft
            </a>
            <a
              routerLink="/trades"
              routerLinkActive="text-primary-600"
              class="text-surface-600 dark:text-surface-400 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              Trades
            </a>
          </nav>

          <!-- User Menu -->
          <div class="flex items-center space-x-4">
            <!-- Show when user is not authenticated -->
            @if (user() === null) {
            <div class="flex items-center space-x-3">
              <button
                (click)="openLoginModal()"
                class="px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-200 bg-surface-100 dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
              >
                Sign In
              </button>
              <button
                (click)="openRegisterModal()"
                class="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-primary-600 rounded-lg hover:bg-primary-700 hover:border-primary-700 transition-colors"
              >
                Sign Up
              </button>
            </div>
            } @else {
            <!-- Show when user is authenticated -->
            <div class="flex items-center space-x-3">
              <span class="text-sm text-surface-600 dark:text-surface-400">{{
                user()?.email
              }}</span>
              <button
                (click)="signOut()"
                class="px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-200 bg-surface-100 dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
            }
          </div>
        </div>
      </div>
    </header>

    <!-- Login Dialog -->
    <p-dialog
      [(visible)]="showLoginDialog"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      class="auth-dialog"
      header="Sign In"
      (onHide)="closeLoginDialog()"
    >
      <app-login-modal
        (loginSuccess)="onLoginSuccess()"
        (switchToRegister)="switchToRegister()"
      ></app-login-modal>
    </p-dialog>

    <!-- Register Dialog -->
    <p-dialog
      [(visible)]="showRegisterDialog"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      class="auth-dialog"
      header="Create Account"
      (onHide)="closeRegisterDialog()"
    >
      <app-register-modal
        (registerSuccess)="onRegisterSuccess()"
        (switchToLogin)="switchToLogin()"
      ></app-register-modal>
    </p-dialog>`,
  styles: [
    `
      :host ::ng-deep .auth-dialog .p-dialog {
        width: 90vw;
        max-width: 480px;
        border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        border: 1px solid var(--surface-border);
      }

      :host ::ng-deep .auth-dialog .p-dialog-content {
        padding: 0;
        border-radius: 0 0 12px 12px;
      }

      :host ::ng-deep .auth-dialog .p-dialog-header {
        padding: 1.5rem 2rem 0.5rem;
        border-radius: 12px 12px 0 0;
        background: var(--surface-0);
        border-bottom: 1px solid var(--surface-border);
      }

      :host ::ng-deep .auth-dialog .p-dialog-header .p-dialog-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-color);
      }

      :host ::ng-deep .auth-dialog .p-dialog-header .p-dialog-header-icon {
        width: 2rem;
        height: 2rem;
        color: var(--text-color-secondary);
        transition: color 0.2s;
      }

      :host
        ::ng-deep
        .auth-dialog
        .p-dialog-header
        .p-dialog-header-icon:hover {
        color: var(--text-color);
      }

      @media (max-width: 640px) {
        :host ::ng-deep .auth-dialog .p-dialog {
          width: 95vw;
          max-width: none;
          margin: 1rem;
          border-radius: 8px;
        }

        :host ::ng-deep .auth-dialog .p-dialog-header {
          padding: 1rem 1.5rem 0.5rem;
          border-radius: 8px 8px 0 0;
        }

        :host ::ng-deep .auth-dialog .p-dialog-content {
          border-radius: 0 0 8px 8px;
        }
      }
    `,
  ],
})
export class WebTopbar {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  user = this.authService.currentUser;

  // Dialog visibility signals
  showLoginDialog = signal(false);
  showRegisterDialog = signal(false);

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
      // Navigate to home page after logout
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  openLoginModal(): void {
    this.showLoginDialog.set(true);
  }

  openRegisterModal(): void {
    this.showRegisterDialog.set(true);
  }

  closeLoginDialog(): void {
    this.showLoginDialog.set(false);
  }

  closeRegisterDialog(): void {
    this.showRegisterDialog.set(false);
  }

  switchToRegister(): void {
    this.showLoginDialog.set(false);
    this.showRegisterDialog.set(true);
  }

  switchToLogin(): void {
    this.showRegisterDialog.set(false);
    this.showLoginDialog.set(true);
  }

  onLoginSuccess(): void {
    this.showLoginDialog.set(false);
    // Check for returnUrl in query params, otherwise go to leagues
    const returnUrl =
      this.route.snapshot.queryParams['returnUrl'] || '/leagues';
    this.router.navigate([returnUrl]);
  }

  onRegisterSuccess(): void {
    this.showRegisterDialog.set(false);
    // New users always go to leagues page
    this.router.navigate(['/leagues']);
  }
}
