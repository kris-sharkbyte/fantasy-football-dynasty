import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-draft-controls',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="draft-controls">
      @if (isCommissioner) { @if (!draftState || (!draftState.isComplete &&
      draftState.isPaused)) {
      <p-button
        [label]="'Initialize Draft'"
        (onClick)="startDraft.emit()"
        severity="primary"
        size="large"
        class="w-full"
      ></p-button>
      } @if (draftState && !draftState.isComplete && !draftState.isPaused) {
      <p-button
        [label]="'Pause Draft'"
        (onClick)="pauseDraft.emit()"
        severity="danger"
        size="large"
        class="w-full"
      ></p-button>
      } @if (draftState?.isComplete) {
      <div class="draft-complete">
        <i class="pi pi-check-circle text-success text-2xl"></i>
        <span class="text-success font-semibold">Draft Complete</span>
      </div>
      } } @else {
      <div class="waiting-message">
        <i class="pi pi-clock text-muted text-xl"></i>
        <span class="text-muted"
          >Waiting for commissioner to start draft...</span
        >
      </div>
      }
    </div>
  `,
  styleUrls: ['./draft-controls.component.scss'],
})
export class DraftControlsComponent {
  @Input() isCommissioner: boolean = false;
  @Input() draftState: any = null;

  @Output() startDraft = new EventEmitter<void>();
  @Output() pauseDraft = new EventEmitter<void>();
}
