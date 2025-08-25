import {
  Component,
  Renderer2,
  ViewChild,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { DraftTopbar } from './draft.topbar';
import { DraftFooter } from './draft.footer';
import { LayoutService } from '../service/layout.service';
import { DraftLayoutService } from '../../services/draft-layout.service';

@Component({
  selector: 'app-draft-layout',
  standalone: true,
  imports: [CommonModule, DraftTopbar, DraftFooter, RouterModule],
  template: `<div
    class="layout-wrapper draft-layout"
    [ngClass]="containerClass"
  >
    <app-draft-topbar
      (startDraft)="onStartDraft()"
      (pauseDraft)="onPauseDraft()"
    >
    </app-draft-topbar>
    <div class="layout-main-container">
      <div class="layout-main">
        <router-outlet></router-outlet>
      </div>
      <app-draft-footer (goToNegotiations)="onGoToNegotiations()">
      </app-draft-footer>
    </div>
  </div> `,
})
export class DraftLayout implements OnDestroy {
  overlayMenuOpenSubscription: Subscription;

  @ViewChild(DraftTopbar) draftTopbar!: DraftTopbar;
  @ViewChild(DraftFooter) draftFooter!: DraftFooter;

  constructor(
    public layoutService: LayoutService,
    public renderer: Renderer2,
    public router: Router,
    public draftLayoutService: DraftLayoutService
  ) {
    this.overlayMenuOpenSubscription =
      this.layoutService.overlayOpen$.subscribe(() => {
        // Handle any draft-specific overlay logic if needed
      });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        // Handle navigation events for draft
      });
  }

  onStartDraft() {
    // This will be handled by the child draft component
    // For now, we could emit an event or call a service method
    console.log('Start draft requested from layout');
  }

  onPauseDraft() {
    // This will be handled by the child draft component
    console.log('Pause draft requested from layout');
  }

  onGoToNegotiations() {
    // Navigate to negotiations
    this.router.navigate(['/negotiations', this.router.url.split('/').pop()]);
  }

  get containerClass() {
    return {
      'draft-active': true,
      'layout-static': true,
    };
  }

  ngOnDestroy() {
    if (this.overlayMenuOpenSubscription) {
      this.overlayMenuOpenSubscription.unsubscribe();
    }
  }
}
