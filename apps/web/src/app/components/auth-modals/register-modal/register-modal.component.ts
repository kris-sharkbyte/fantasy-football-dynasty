import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ModalService } from '../../../services/modal.service';
import { LoginModalComponent } from '../login-modal/login-modal.component';

@Component({
  selector: 'app-register-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-modal">
      <div class="auth-header">
        <h2 class="auth-title">Create Account</h2>
        <p class="auth-subtitle">
          Already have an account?
          <button class="auth-link" (click)="switchToLogin()" type="button">
            SIGN IN
          </button>
        </p>
      </div>

      <form (ngSubmit)="onSubmit()" class="auth-form">
        <div class="form-group">
          <label for="displayName" class="form-label">Display Name</label>
          <input
            id="displayName"
            type="text"
            [(ngModel)]="displayName"
            name="displayName"
            class="form-input"
            [class.error]="showDisplayNameError"
            placeholder="Enter your display name"
            required
          />
          <div *ngIf="showDisplayNameError" class="error-message">
            Please enter a display name
          </div>
        </div>

        <div class="form-group">
          <label for="email" class="form-label">Email</label>
          <input
            id="email"
            type="email"
            [(ngModel)]="email"
            name="email"
            class="form-input"
            [class.error]="showEmailError"
            placeholder="Enter your email"
            required
          />
          <div *ngIf="showEmailError" class="error-message">
            Please enter a valid email address
          </div>
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Password</label>
          <input
            id="password"
            type="password"
            [(ngModel)]="password"
            name="password"
            class="form-input"
            [class.error]="showPasswordError"
            placeholder="Create a password"
            required
          />
          <div *ngIf="showPasswordError" class="error-message">
            Password must be at least 6 characters
          </div>
        </div>

        <div class="form-group">
          <label for="confirmPassword" class="form-label"
            >Confirm Password</label
          >
          <input
            id="confirmPassword"
            type="password"
            [(ngModel)]="confirmPassword"
            name="confirmPassword"
            class="form-input"
            [class.error]="showConfirmPasswordError"
            placeholder="Confirm your password"
            required
          />
          <div *ngIf="showConfirmPasswordError" class="error-message">
            Passwords do not match
          </div>
        </div>

        <button type="submit" class="auth-button" [disabled]="isLoading">
          <span *ngIf="!isLoading">CREATE ACCOUNT</span>
          <span *ngIf="isLoading">Creating account...</span>
        </button>

        <div *ngIf="errorMessage" class="error-message auth-error">
          {{ errorMessage }}
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .auth-modal {
        padding: 0;
      }

      .auth-header {
        text-align: center;
        margin-bottom: 2rem;
      }

      .auth-title {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 0.5rem 0;
      }

      .auth-subtitle {
        color: var(--text-secondary);
        margin: 0;
        font-size: 0.9rem;
      }

      .auth-link {
        background: none;
        border: none;
        color: var(--primary-500);
        font-weight: 600;
        cursor: pointer;
        text-decoration: underline;
        padding: 0;
        font-size: inherit;
      }

      .auth-link:hover {
        color: var(--primary-600);
      }

      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .form-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-secondary);
      }

      .form-input {
        padding: 0.75rem;
        border: 1px solid var(--border-primary);
        border-radius: 8px;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-size: 1rem;
        transition: all 0.2s ease;
      }

      .form-input:focus {
        outline: none;
        border-color: var(--primary-500);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .form-input.error {
        border-color: var(--error-500);
      }

      .form-input::placeholder {
        color: var(--text-tertiary);
      }

      .auth-button {
        background: var(--primary-600);
        color: white;
        border: none;
        padding: 0.875rem;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 0.5rem;
      }

      .auth-button:hover:not(:disabled) {
        background: var(--primary-700);
      }

      .auth-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .error-message {
        color: var(--error-500);
        font-size: 0.875rem;
        margin-top: 0.25rem;
      }

      .auth-error {
        text-align: center;
        margin-top: 1rem;
      }
    `,
  ],
})
export class RegisterModalComponent {
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

  constructor(
    private authService: AuthService,
    private modalService: ModalService
  ) {}

  async onSubmit(): Promise<void> {
    this.clearErrors();

    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.signUp(
        this.email,
        this.password,
        this.displayName
      );
      // Close modal and redirect to leagues (handled by auth service)
      this.modalService.closeAllModals();
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

  switchToLogin(): void {
    this.modalService.closeModal('register');
    this.modalService.openModal({
      id: 'login',
      title: 'Log in',
      component: LoginModalComponent,
      size: 'md',
    });
  }
}
