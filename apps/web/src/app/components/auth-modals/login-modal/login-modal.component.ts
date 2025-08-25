import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="text-center mb-8">
        <h2
          class="text-3xl font-bold text-surface-900 dark:text-surface-0 mb-2"
        >
          Welcome back
        </h2>
        <p class="text-surface-600 dark:text-surface-400">
          New to Dynasty Fantasy?
          <button
            class="text-primary-600 hover:text-primary-700 font-semibold underline ml-1 transition-colors"
            (click)="onSwitchToRegister()"
            type="button"
          >
            Create an account
          </button>
        </p>
      </div>

      <!-- Form -->
      <form (ngSubmit)="onSubmit()" class="space-y-6">
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
            placeholder="Enter your password"
            required
          />
          <div
            *ngIf="showPasswordError"
            class="text-red-600 text-sm flex items-center gap-1"
          >
            <i class="pi pi-exclamation-triangle text-xs"></i>
            Please enter your password
          </div>
        </div>

        <!-- Forgot Password -->
        <div class="flex justify-end">
          <button
            type="button"
            class="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            (click)="forgotPassword()"
          >
            Forgot password?
          </button>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          class="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-surface-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          [disabled]="isLoading"
        >
          <i *ngIf="isLoading" class="pi pi-spinner pi-spin"></i>
          <span>{{ isLoading ? 'Signing in...' : 'Sign in' }}</span>
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
export class LoginModalComponent {
  private readonly authService = inject(AuthService);

  @Output() loginSuccess = new EventEmitter<void>();
  @Output() switchToRegister = new EventEmitter<void>();

  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  showEmailError: boolean = false;
  showPasswordError: boolean = false;

  async onSubmit(): Promise<void> {
    this.clearErrors();

    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.signIn(this.email, this.password);
      // Emit success event to close modal
      this.loginSuccess.emit();
    } catch (error: any) {
      this.errorMessage = this.getErrorMessage(error.code);
    } finally {
      this.isLoading = false;
    }
  }

  private validateForm(): boolean {
    let isValid = true;

    if (!this.email) {
      this.showEmailError = true;
      isValid = false;
    }

    if (!this.password) {
      this.showPasswordError = true;
      isValid = false;
    }

    return isValid;
  }

  private clearErrors(): void {
    this.showEmailError = false;
    this.showPasswordError = false;
    this.errorMessage = '';
  }

  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      default:
        return 'An error occurred during login. Please try again.';
    }
  }

  onSwitchToRegister(): void {
    this.switchToRegister.emit();
  }

  forgotPassword(): void {
    // TODO: Implement forgot password
    console.log('Forgot password clicked');
  }
}
