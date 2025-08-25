import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WebTopbar } from './web.topbar';
import { WebFooter } from './web.footer';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, WebFooter, WebTopbar],
  template: `<div class="layout-wrapper">
    <web-topbar></web-topbar>
    <div class="layout-main-container">
      <div class="layout-main">
        <router-outlet></router-outlet>
      </div>
      <web-footer></web-footer>
    </div>
    <div class="layout-mask animate-fadein"></div>
  </div> `,
})
export class WebLayout {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  title = 'web';

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
}
