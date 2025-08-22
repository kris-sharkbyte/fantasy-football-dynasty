import { Component, ElementRef, inject } from '@angular/core';
import { AppMenu } from './app.menu';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [AppMenu, RouterModule],
  template: ` <div class="layout-sidebar flex flex-col h-full">
    <div class="flex-1">
      <app-menu></app-menu>
    </div>
    
    <!-- User section at the bottom -->
    @if (user()) {
    <div class="mt-auto pt-4 border-t border-gray-700">
      <div class="flex items-center justify-between p-3">
        <div class="flex items-center space-x-3">
          <i class="pi pi-user text-blue-400 text-lg"></i>
          <div class="flex flex-col">
            <span class="text-sm text-white font-medium">{{ user()?.displayName || 'User' }}</span>
            <span class="text-xs text-gray-400">{{ user()?.email }}</span>
          </div>
        </div>
        <a 
          routerLink="/account" 
          class="p-2 text-gray-400 hover:text-white transition-colors"
          title="Account Settings"
        >
          <i class="pi pi-cog text-lg"></i>
        </a>
      </div>
    </div>
    }
  </div>`,
})
export class AppSidebar {
  private readonly authService = inject(AuthService);
  user = this.authService.currentUser;
  constructor(public el: ElementRef) {}
}
