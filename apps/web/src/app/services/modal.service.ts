import { Injectable, signal, computed } from '@angular/core';

export interface ModalConfig {
  id: string;
  title: string;
  component: any;
  data?: any;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
  header?: string;
  footer?: string;
  draggable?: boolean;
  resizable?: boolean;
  modal?: boolean;
  closeOnEscape?: boolean;
  dismissableMask?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  // Angular signals for modal state
  private modalsSignal = signal<ModalConfig[]>([]);
  private visibleModalsSignal = signal<Set<string>>(new Set());

  // Public readonly signals
  public modals = this.modalsSignal.asReadonly();
  public visibleModals = this.visibleModalsSignal.asReadonly();
  public modalCount = computed(() => this.modalsSignal().length);

  constructor() {}

  openModal(config: ModalConfig): void {
    const currentModals = this.modalsSignal();
    const newModals = [...currentModals, config];
    this.modalsSignal.set(newModals);

    // Mark modal as visible
    const currentVisible = this.visibleModalsSignal();
    const newVisible = new Set(currentVisible);
    newVisible.add(config.id);
    this.visibleModalsSignal.set(newVisible);
  }

  closeModal(modalId: string): void {
    // Mark modal as not visible
    const currentVisible = this.visibleModalsSignal();
    const newVisible = new Set(currentVisible);
    newVisible.delete(modalId);
    this.visibleModalsSignal.set(newVisible);

    // Remove modal from list after a short delay to allow animation
    setTimeout(() => {
      const currentModals = this.modalsSignal();
      const newModals = currentModals.filter((modal) => modal.id !== modalId);
      this.modalsSignal.set(newModals);
    }, 150);
  }

  closeAllModals(): void {
    this.visibleModalsSignal.set(new Set());
    setTimeout(() => {
      this.modalsSignal.set([]);
    }, 150);
  }

  isModalOpen(modalId: string): boolean {
    return this.visibleModalsSignal().has(modalId);
  }

  getModalCount(): number {
    return this.modalsSignal().length;
  }

  // Helper method to get modal config by ID
  getModalConfig(modalId: string): ModalConfig | undefined {
    return this.modalsSignal().find((modal) => modal.id === modalId);
  }

  // Method to update modal data
  updateModalData(modalId: string, data: any): void {
    const currentModals = this.modalsSignal();
    const modalIndex = currentModals.findIndex((modal) => modal.id === modalId);

    if (modalIndex !== -1) {
      const updatedModals = [...currentModals];
      updatedModals[modalIndex] = { ...updatedModals[modalIndex], data };
      this.modalsSignal.set(updatedModals);
    }
  }
}
