import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="text-center mb-8">
        <h2
          class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2"
        >
          Create your account
        </h2>
        <p class="text-surface-600 dark:text-surface-400">
          Already have an account?
          <button
            class="text-primary-600 hover:text-primary-700 font-semibold underline ml-1 transition-colors"
            (click)="onSwitchToLogin()"
            type="button"
          >
            Sign in
          </button>
        </p>
      </div>

      <!-- Form -->
      <form (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Display Name Field -->
        <div class="space-y-2">
          <label
            for="displayName"
            class="block text-sm font-medium text-surface-900 dark:text-surface-0"
          >
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            [(ngModel)]="displayName"
            name="displayName"
            class="w-full px-4 py-3 border rounded-lg text-surface-900 dark:text-surface-0 bg-surface-0 dark:bg-surface-900 border-surface-300 dark:border-surface-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all outline-none"
            [class.border-red-500]="showDisplayNameError"
            [class.focus:border-red-500]="showDisplayNameError"
            [class.focus:ring-red-200]="showDisplayNameError"
            placeholder="Enter your display name"
            required
          />
          <div
            *ngIf="showDisplayNameError"
            class="text-red-600 text-sm flex items-center gap-1"
          >
            <i class="pi pi-exclamation-triangle text-xs"></i>
            Please enter a display name
          </div>
        </div>

        <!-- Email Field -->
        <div class="space-y-2">
          <label
            for="email"
            class="block text-sm font-medium text-surface-900 dark:text-surface-0"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            [(ngModel)]="email"
            name="email"
            class="w-full px-4 py-3 border rounded-lg text-surface-900 dark:text-surface-0 bg-surface-0 dark:bg-surface-900 border-surface-300 dark:border-surface-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all outline-none"
            [class.border-red-500]="showEmailError"
            [class.focus:border-red-500]="showEmailError"
            [class.focus:ring-red-200]="showEmailError"
            placeholder="Enter your email address"
            required
          />
          <div
            *ngIf="showEmailError"
            class="text-red-600 text-sm flex items-center gap-1"
          >
            <i class="pi pi-exclamation-triangle text-xs"></i>
            Please enter a valid email address
          </div>
        </div>

        <!-- Password Field -->
        <div class="space-y-2">
          <label
            for="password"
            class="block text-sm font-medium text-surface-900 dark:text-surface-0"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            [(ngModel)]="password"
            name="password"
            class="w-full px-4 py-3 border rounded-lg text-surface-900 dark:text-surface-0 bg-surface-0 dark:bg-surface-900 border-surface-300 dark:border-surface-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all outline-none"
            [class.border-red-500]="showPasswordError"
            [class.focus:border-red-500]="showPasswordError"
            [class.focus:ring-red-200]="showPasswordError"
            placeholder="Create a strong password"
            required
          />
          <div
            *ngIf="showPasswordError"
            class="text-red-600 text-sm flex items-center gap-1"
          >
            <i class="pi pi-exclamation-triangle text-xs"></i>
            Password must be at least 6 characters
          </div>
        </div>

        <!-- Confirm Password Field -->
        <div class="space-y-2">
          <label
            for="confirmPassword"
            class="block text-sm font-medium text-surface-900 dark:text-surface-0"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            [(ngModel)]="confirmPassword"
            name="confirmPassword"
            class="w-full px-4 py-3 border rounded-lg text-surface-900 dark:text-surface-0 bg-surface-0 dark:bg-surface-900 border-surface-300 dark:border-surface-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all outline-none"
            [class.border-red-500]="showConfirmPasswordError"
            [class.focus:border-red-500]="showConfirmPasswordError"
            [class.focus:ring-red-200]="showConfirmPasswordError"
            placeholder="Confirm your password"
            required
          />
          <div
            *ngIf="showConfirmPasswordError"
            class="text-red-600 text-sm flex items-center gap-1"
          >
            <i class="pi pi-exclamation-triangle text-xs"></i>
            Passwords do not match
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          class="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          [disabled]="isLoading"
        >
          <i *ngIf="isLoading" class="pi pi-spinner pi-spin"></i>
          <span>{{
            isLoading ? 'Creating account...' : 'Create account'
          }}</span>
        </button>

        <!-- Error Message -->
        <div
          *ngIf="errorMessage"
          class="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <div class="flex items-center gap-2 text-red-800 dark:text-red-200">
            <i class="pi pi-exclamation-circle"></i>
            <span class="text-sm">{{ errorMessage }}</span>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [],
})
export class RegisterModalComponent {
  private readonly authService = inject(AuthService);

  @Output() registerSuccess = new EventEmitter<void>();
  @Output() switchToLogin = new EventEmitter<void>();

  displayName: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  showDisplayNameError: boolean = false;
  showEmailError: boolean = false;
  showPasswordError: boolean = false;
  showConfirmPasswordError: boolean = false;

  async onSubmit(): Promise<void> {
    this.clearErrors();

    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.signUp(this.email, this.password);
      // Emit success event to close modal
      this.registerSuccess.emit();
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error.code);
    } finally {
      this.isLoading = false;
    }
  }

  private validateForm(): boolean {
    let isValid = true;

    if (!this.displayName.trim()) {
      this.showDisplayNameError = true;
      isValid = false;
    }

    if (!this.email || !this.isValidEmail(this.email)) {
      this.showEmailError = true;
      isValid = false;
    }

    if (!this.password || this.password.length < 6) {
      this.showPasswordError = true;
      isValid = false;
    }

    if (this.password !== this.confirmPassword) {
      this.showConfirmPasswordError = true;
      isValid = false;
    }

    return isValid;
  }

  private clearErrors(): void {
    this.showDisplayNameError = false;
    this.showEmailError = false;
    this.showPasswordError = false;
    this.showConfirmPasswordError = false;
    this.errorMessage = '';
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/weak-password':
        return 'Password is too weak. Please choose a stronger password.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled. Please contact support.';
      default:
        return 'An error occurred during registration. Please try again.';
    }
  }

  onSwitchToLogin(): void {
    this.switchToLogin.emit();
  }
}
