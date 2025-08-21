import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { AuthService } from '../../services/auth.service';
import { RegisterModalComponent } from '../../components/auth-modals/register-modal/register-modal.component';
import { ModalService } from '../../services/modal.service';
import { LoginModalComponent } from '../../components/auth-modals/login-modal/login-modal.component';

@Component({
  selector: 'web-topbar',
  standalone: true,
  imports: [RouterModule, CommonModule, StyleClassModule],
  template: ` <!-- Header -->
    <header class="header-theme shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo -->
          <div class="flex items-center">
            <h1 class="text-2xl font-bold text-gradient">Dynasty Fantasy</h1>
          </div>

          <!-- Navigation -->
          <nav class="hidden md:flex space-x-8">
            <a
              routerLink="/leagues"
              routerLinkActive="text-primary-600"
              class="text-secondary-600 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              Leagues
            </a>
            <a
              routerLink="/teams"
              routerLinkActive="text-primary-600"
              class="text-secondary-600 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              Teams
            </a>
            <a
              routerLink="/players"
              routerLinkActive="text-primary-600"
              class="text-secondary-600 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              Players
            </a>
            <a
              routerLink="/free-agency"
              routerLinkActive="text-primary-600"
              class="text-secondary-600 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              Free Agency
            </a>
            <a
              routerLink="/draft"
              routerLinkActive="text-primary-600"
              class="text-secondary-600 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              Draft
            </a>
            <a
              routerLink="/trades"
              routerLinkActive="text-primary-600"
              class="text-secondary-600 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              Trades
            </a>
          </nav>

          <!-- User Menu -->
          <div class="flex items-center space-x-4">
            <!-- Show when user is not authenticated -->
            @if (user() === null) {
            <div>
              <button (click)="openLoginModal()" class="btn-secondary">
                Sign In
              </button>
              <button (click)="openRegisterModal()" class="btn-primary ml-2">
                Sign Up
              </button>
            </div>
            } @else {
            <!-- Show when user is authenticated -->
            <div class="flex items-center space-x-3">
              <span class="text-sm text-secondary-600">{{
                user()?.email
              }}</span>
              <button (click)="signOut()" class="btn-secondary">
                Sign Out
              </button>
            </div>
            }
          </div>
        </div>
      </div>
    </header>`,
})
export class WebTopbar {
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);
  user = this.authService.currentUser;

  // Expose modals signal for template
  get modals() {
    return this.modalService.modals;
  }

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  openLoginModal(): void {
    this.modalService.openModal({
      id: 'login',
      title: 'Log in',
      component: LoginModalComponent,
      size: 'md',
    });
  }

  openRegisterModal(): void {
    this.modalService.openModal({
      id: 'register',
      title: 'Create Account',
      component: RegisterModalComponent,
      size: 'md',
    });
  }

  closeModal(modalId: string): void {
    this.modalService.closeModal(modalId);
  }

  trackModal(index: number, modal: any): string {
    return modal.id;
  }
}
