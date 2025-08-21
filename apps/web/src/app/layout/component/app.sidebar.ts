import { Component, ElementRef, inject } from '@angular/core';
import { AppMenu } from './app.menu';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [AppMenu],
  template: ` <div class="layout-sidebar">
    test
    <app-menu></app-menu>
    <!-- move this to the bottom and have a user icon first then email/username below that some text then on the far right a cog icon-->
    @if (user()) {
    <div class="flex items-center space-x-3">
      <i class="pi pi-user"></i>
      <span class="text-sm text-secondary-600">{{ user()?.email }}</span>
      <button (click)="signOut()" class="btn-secondary">Sign Out</button>
    </div>

    }
  </div>`,
})
export class AppSidebar {
  private readonly authService = inject(AuthService);
  user = this.authService.currentUser;
  constructor(public el: ElementRef) {}

  signOut() {
    this.authService.signOut();
  }
}
