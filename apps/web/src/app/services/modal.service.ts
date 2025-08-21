import { Injectable, signal, computed } from '@angular/core';

export interface ModalConfig {
  id: string;
  title: string;
  component: any;
  data?: any;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  // Angular signals instead of BehaviorSubject
  private modalsSignal = signal<ModalConfig[]>([]);

  // Public readonly signals
  public modals = this.modalsSignal.asReadonly();
  public modalCount = computed(() => this.modalsSignal().length);

  constructor() {}

  openModal(config: ModalConfig): void {
    const currentModals = this.modalsSignal();
    const newModals = [...currentModals, config];
    this.modalsSignal.set(newModals);
  }

  closeModal(modalId: string): void {
    const currentModals = this.modalsSignal();
    const newModals = currentModals.filter((modal) => modal.id !== modalId);
    this.modalsSignal.set(newModals);
  }

  closeAllModals(): void {
    this.modalsSignal.set([]);
  }

  isModalOpen(modalId: string): boolean {
    return this.modalsSignal().some((modal) => modal.id === modalId);
  }

  getModalCount(): number {
    return this.modalsSignal().length;
  }
}
