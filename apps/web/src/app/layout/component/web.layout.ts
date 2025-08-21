import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WebTopbar } from './web.topbar';
import { WebFooter } from './web.footer';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ModalService } from '../../services/modal.service';
import { RegisterModalComponent } from '../../components/auth-modals/register-modal/register-modal.component';
import { LoginModalComponent } from '../../components/auth-modals/login-modal/login-modal.component';
import { ModalContainerComponent } from '../../components/modal-container/modal-container.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    WebFooter,
    WebTopbar,
    ModalContainerComponent,
  ],
  template: `<div class="layout-wrapper">
    <web-topbar></web-topbar>
    <div class="layout-main-container">
      <div class="layout-main">
        <router-outlet></router-outlet>
      </div>
      <web-footer></web-footer>
    </div>
    <div class="layout-mask animate-fadein"></div>
    <!-- Modal Container -->
    <div *ngFor="let modal of modals(); trackBy: trackModal">
      <app-modal-container
        [config]="modal"
        (close)="closeModal(modal.id)"
      ></app-modal-container>
    </div>
  </div> `,
})
export class WebLayout {
  private readonly modalService = inject(ModalService);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  title = 'web';

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
