import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ModalConfig } from '../../services/modal.service';

@Component({
  selector: 'app-modal-container',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule],
  template: `
    <p-dialog
      [header]="config.header || config.title"
      [visible]="true"
      [modal]="config.modal !== false"
      [draggable]="config.draggable || false"
      [resizable]="config.resizable || false"
      [closeOnEscape]="config.closeOnEscape !== false"
      [dismissableMask]="config.dismissableMask || false"
      [style]="getDialogStyle()"
      [contentStyle]="getContentStyle()"
      (onHide)="onClose()"
      [closable]="config.closable !== false"
      [showHeader]="true"
    >
      <ng-container *ngComponentOutlet="config.component"></ng-container>

      <ng-container pTemplate="footer" *ngIf="config.footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Cancel"
            severity="secondary"
            (onClick)="onClose()"
            [outlined]="true"
          ></p-button>
          <p-button label="Confirm" (onClick)="onConfirm()"></p-button>
        </div>
      </ng-container>
    </p-dialog>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      ::ng-deep .p-dialog {
        box-shadow: var(--shadow-xl);
        border-radius: 12px;
      }

      ::ng-deep .p-dialog .p-dialog-header {
        background: var(--bg-primary);
        border-bottom: 1px solid var(--border-primary);
        border-radius: 12px 12px 0 0;
        padding: 1.5rem 1.5rem 1rem;
      }

      ::ng-deep .p-dialog .p-dialog-title {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
      }

      ::ng-deep .p-dialog .p-dialog-content {
        background: var(--bg-primary);
        padding: 1rem 1.5rem 1.5rem;
        border-radius: 0 0 12px 12px;
      }

      ::ng-deep .p-dialog .p-dialog-footer {
        background: var(--bg-primary);
        border-top: 1px solid var(--border-primary);
        border-radius: 0 0 12px 12px;
        padding: 1rem 1.5rem 1.5rem;
      }

      ::ng-deep .p-dialog .p-dialog-header-icons {
        margin-left: 0.5rem;
      }

      ::ng-deep .p-dialog .p-dialog-header-icon {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.2s ease;
      }

      ::ng-deep .p-dialog .p-dialog-header-icon:hover {
        background: var(--bg-secondary);
        color: var(--text-primary);
      }

      /* Responsive adjustments */
      @media (max-width: 640px) {
        ::ng-deep .p-dialog {
          margin: 1rem;
          max-width: calc(100vw - 2rem);
          max-height: calc(100vh - 2rem);
        }

        ::ng-deep .p-dialog .p-dialog-header {
          padding: 1rem 1rem 0.75rem;
        }

        ::ng-deep .p-dialog .p-dialog-content {
          padding: 0.75rem 1rem 1rem;
        }

        ::ng-deep .p-dialog .p-dialog-footer {
          padding: 0.75rem 1rem 1rem;
        }
      }
    `,
  ],
})
export class ModalContainerComponent {
  @Input() config!: ModalConfig;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }

  onConfirm(): void {
    this.confirm.emit();
  }

  getDialogStyle(): string {
    const sizeMap = {
      sm: 'width: 400px',
      md: 'width: 600px',
      lg: 'width: 800px',
      xl: 'width: 1000px',
    };

    return sizeMap[this.config.size || 'md'] || sizeMap['md'];
  }

  getContentStyle(): string {
    return 'max-height: 70vh; overflow-y: auto;';
  }
}
