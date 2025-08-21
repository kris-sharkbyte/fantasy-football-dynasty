import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ModalService } from '../../../services/modal.service';
import { RegisterModalComponent } from '../register-modal/register-modal.component';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-modal">
      <div class="auth-header">
        <h2 class="auth-title">Log in</h2>
        <p class="auth-subtitle">
          New to Dynasty Fantasy?
          <button class="auth-link" (click)="switchToRegister()" type="button">
            CREATE AN ACCOUNT
          </button>
        </p>
      </div>

      <form (ngSubmit)="onSubmit()" class="auth-form">
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
            Please enter your email
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
            placeholder="Enter your password"
            required
          />
          <div *ngIf="showPasswordError" class="error-message">
            Please enter your password
          </div>
        </div>

        <div class="form-actions">
          <button
            type="button"
            class="auth-link forgot-password"
            (click)="forgotPassword()"
          >
            FORGOT PASSWORD?
          </button>
        </div>

        <button type="submit" class="auth-button" [disabled]="isLoading">
          <span *ngIf="!isLoading">CONTINUE</span>
          <span *ngIf="isLoading">Signing in...</span>
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

      .form-actions {
        display: flex;
        justify-content: flex-end;
      }

      .forgot-password {
        font-size: 0.875rem;
        color: var(--text-secondary);
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
export class LoginModalComponent {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  showEmailError: boolean = false;
  showPasswordError: boolean = false;

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
      await this.authService.signIn(this.email, this.password);
      // Close modal and redirect to leagues
      this.modalService.closeAllModals();
      // TODO: Navigate to leagues page
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

  switchToRegister(): void {
    this.modalService.closeModal('login');
    this.modalService.openModal({
      id: 'register',
      title: 'Create Account',
      component: RegisterModalComponent,
      size: 'md',
    });
  }

  forgotPassword(): void {
    // TODO: Implement forgot password
    console.log('Forgot password clicked');
  }
}
