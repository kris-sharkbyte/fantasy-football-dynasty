import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { ModalService } from './services/modal.service';
import { LoginModalComponent } from './components/auth-modals/login-modal/login-modal.component';
import { RegisterModalComponent } from './components/auth-modals/register-modal/register-modal.component';
import { ModalContainerComponent } from './components/modal-container/modal-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    ModalContainerComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent {
  title = 'web';

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private modalService: ModalService
  ) {}

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

  toggleTheme(): void {
    this.themeService.toggleTheme();
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
