import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalConfig } from '../../services/modal.service';

@Component({
  selector: 'app-modal-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-content" [class]="'modal-' + config.size">
        <div class="modal-header">
          <h2 class="modal-title">{{ config.title }}</h2>
          <button 
            *ngIf="config.closable !== false"
            class="modal-close" 
            (click)="onClose()"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div class="modal-body">
          <ng-container *ngComponentOutlet="config.component"></ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }

    .modal-content {
      background: var(--bg-primary);
      border-radius: 12px;
      box-shadow: var(--shadow-xl);
      max-width: 90vw;
      max-height: 90vh;
      overflow: hidden;
      animation: modalSlideIn 0.3s ease-out;
    }

    .modal-sm { width: 400px; }
    .modal-md { width: 600px; }
    .modal-lg { width: 800px; }
    .modal-xl { width: 1000px; }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 1.5rem 1rem;
      border-bottom: 1px solid var(--border-primary);
    }

    .modal-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .modal-close:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }

    .modal-body {
      padding: 1rem 1.5rem 1.5rem;
      overflow-y: auto;
      max-height: calc(90vh - 80px);
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @media (max-width: 640px) {
      .modal-content {
        margin: 1rem;
        max-width: calc(100vw - 2rem);
        max-height: calc(100vh - 2rem);
      }
      
      .modal-header {
        padding: 1rem 1rem 0.75rem;
      }
      
      .modal-body {
        padding: 0.75rem 1rem 1rem;
      }
    }
  `]
})
export class ModalContainerComponent {
  @Input() config!: ModalConfig;
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
