import { Injectable, signal, computed } from '@angular/core';

export interface ModalState {
  modalId: string;
  isOpen: boolean;
  data?: any;
}

// Legacy interface for backward compatibility
export interface ModalConfig {
  id: string;
  title: string;
  component: any;
  size: string;
  data?: any;
}

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private _modalState = signal<ModalState | null>(null);
  
  // Legacy support - keep the old API working
  private _modals = signal<ModalConfig[]>([]);
  private _visibleModals = signal<ModalConfig[]>([]);

  // Public readonly signals
  public modalState = this._modalState.asReadonly();
  public currentModalId = computed(() => this._modalState()?.modalId);
  public isModalOpen = computed(() => this._modalState()?.isOpen ?? false);
  public modalData = computed(() => this._modalState()?.data);

  // Legacy public properties for backward compatibility
  public modals = this._modals.asReadonly();
  public visibleModals = this._visibleModals.asReadonly();

  constructor() {}

  // New signal-based API
  openModal(modalId: string, data?: any): void {
    this._modalState.set({
      modalId,
      isOpen: true,
      data,
    });
  }

  closeModal(modalId: string): void {
    this._modalState.set({
      modalId,
      isOpen: false,
    });
  }

  closeAllModals(): void {
    this._modalState.set(null);
  }

  isSpecificModalOpen(modalId: string): boolean {
    const currentState = this._modalState();
    return currentState?.modalId === modalId && currentState?.isOpen === true;
  }

  // Legacy API methods for backward compatibility
  openModalLegacy(config: ModalConfig): void {
    const existingIndex = this._modals().findIndex(m => m.id === config.id);
    
    if (existingIndex >= 0) {
      // Update existing modal
      const updatedModals = [...this._modals()];
      updatedModals[existingIndex] = { ...config };
      this._modals.set(updatedModals);
    } else {
      // Add new modal
      this._modals.set([...this._modals(), config]);
    }

    // Add to visible modals
    this._visibleModals.set([...this._visibleModals(), config]);
  }

  closeModalLegacy(modalId: string): void {
    // Remove from visible modals
    this._visibleModals.set(
      this._visibleModals().filter(m => m.id !== modalId)
    );
  }

  getModalConfig(modalId: string): ModalConfig | undefined {
    return this._modals().find(m => m.id === modalId);
  }

  updateModalData(modalId: string, data: any): void {
    const updatedModals = this._modals().map(m => 
      m.id === modalId ? { ...m, data } : m
    );
    this._modals.set(updatedModals);
  }

  // Overload to support both APIs
  openModalOverloaded(modalIdOrConfig: string | ModalConfig, data?: any): void {
    if (typeof modalIdOrConfig === 'string') {
      // New API
      this.openModal(modalIdOrConfig, data);
    } else {
      // Legacy API
      this.openModalLegacy(modalIdOrConfig);
    }
  }
}
