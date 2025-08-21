import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AuthService } from './services/auth.service';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent {
  private readonly authService = inject(AuthService);
}
