import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="account-settings-container">
      <div class="account-settings-content">
        <div class="account-settings-grid">
          <!-- Main Content Area -->
          <div class="account-main-content">
            <h1 class="account-title">Account Settings</h1>
            <p class="account-description">
              Your login email / phone number & password allow you to
              authenticate yourself and use the app on multiple devices. Never
              give out your credentials to anyone!
            </p>

            <form
              [formGroup]="accountForm"
              (ngSubmit)="onSubmit()"
              class="account-form"
            >
              <div class="form-field">
                <label for="email" class="form-label">Email</label>
                <input
                  type="email"
                  id="email"
                  formControlName="email"
                  class="form-input"
                  [readonly]="true"
                />
              </div>

              <div class="form-field">
                <label for="phone" class="form-label">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  formControlName="phone"
                  placeholder="Enter your phone number"
                  class="form-input"
                />
              </div>

              <button
                type="button"
                (click)="changePassword()"
                class="change-password-btn"
              >
                CHANGE PASSWORD
              </button>
            </form>
          </div>

          <!-- Navigation Sidebar -->
          <div class="account-nav-sidebar">
            <nav class="account-nav">
              <!-- Account Section -->
              <div class="nav-section">
                <h3 class="nav-section-header">ACCOUNT</h3>
                <ul class="nav-section-list">
                  <li>
                    <a
                      routerLink="/account"
                      routerLinkActive="nav-link-active"
                      class="nav-link"
                    >
                      Account Settings
                    </a>
                  </li>
                </ul>
              </div>

              <!-- Personal Section -->
              <div class="nav-section">
                <h3 class="nav-section-header">PERSONAL</h3>
                <ul class="nav-section-list">
                  <li>
                    <a routerLink="/profile" class="nav-link"> Profile </a>
                  </li>
                  <li>
                    <a routerLink="/preferences" class="nav-link">
                      Preferences
                    </a>
                  </li>
                </ul>
              </div>

              <!-- Support Section -->
              <div class="nav-section">
                <h3 class="nav-section-header">SUPPORT</h3>
                <ul class="nav-section-list">
                  <li>
                    <a routerLink="/support" class="nav-link">
                      Request Support
                    </a>
                  </li>
                </ul>
              </div>

              <!-- Logout -->
              <div class="nav-logout">
                <button (click)="signOut()" class="logout-btn">Logout</button>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .account-settings-container {
        min-height: 100vh;
        background-color: var(--surface-ground);
        color: var(--text-color);
        padding: 2rem;
      }

      .account-settings-content {
        max-width: 80rem;
        margin: 0 auto;
      }

      .account-settings-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2rem;
      }

      @media (min-width: 1024px) {
        .account-settings-grid {
          grid-template-columns: 3fr 1fr;
        }
      }

      .account-main-content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .account-title {
        font-size: 1.875rem;
        font-weight: 700;
        margin-bottom: 1rem;
        color: var(--text-color);
      }

      .account-description {
        font-size: 1.125rem;
        color: var(--text-color-secondary);
        margin-bottom: 2rem;
        line-height: 1.6;
      }

      .account-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .form-label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-color);
        margin-bottom: 0.5rem;
      }

      .form-input {
        width: 100%;
        padding: 0.5rem 0.75rem;
        background-color: transparent;
        border-bottom: 2px solid var(--text-color);
        color: var(--text-color);
        transition: border-color var(--transition-duration);
        outline: none;
      }

      .form-input::placeholder {
        color: var(--text-color-secondary);
      }

      .form-input:focus {
        border-color: var(--primary-color);
      }

      .change-password-btn {
        padding: 0.75rem 1.5rem;
        border: 1px solid var(--text-color);
        color: var(--text-color);
        background-color: transparent;
        border-radius: var(--content-border-radius);
        transition: all var(--transition-duration);
        cursor: pointer;
        font-weight: 500;
      }

      .change-password-btn:hover {
        background-color: var(--text-color);
        color: var(--surface-ground);
      }

      .account-nav-sidebar {
        display: flex;
        flex-direction: column;
      }

      .account-nav {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .nav-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .nav-section-header {
        font-size: 0.875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-color-secondary);
        margin-bottom: 0.75rem;
      }

      .nav-section-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .nav-link {
        display: block;
        padding: 0.5rem 0.75rem;
        border-radius: var(--content-border-radius);
        color: var(--text-color);
        text-decoration: none;
        transition: background-color var(--transition-duration);
      }

      .nav-link:hover {
        background-color: var(--surface-hover);
      }

      .nav-link-active {
        background-color: var(--surface-hover);
        font-weight: 600;
      }

      .nav-logout {
        padding-top: 1.5rem;
        border-top: 1px solid var(--surface-border);
      }

      .logout-btn {
        width: 100%;
        text-align: left;
        padding: 0.5rem 0.75rem;
        color: #ef4444;
        background: none;
        border: none;
        cursor: pointer;
        transition: color var(--transition-duration);
        border-radius: var(--content-border-radius);
      }

      .logout-btn:hover {
        color: #fca5a5;
      }
    `,
  ],
})
export class AccountSettingsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  user = this.authService.currentUser;

  accountForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
  });

  ngOnInit() {
    if (this.user()) {
      this.accountForm.patchValue({
        email: this.user()?.email || '',
        phone: this.user()?.phoneNumber || '',
      });
    }
  }

  onSubmit() {
    if (this.accountForm.valid) {
      // Handle form submission
      console.log('Form submitted:', this.accountForm.value);
    }
  }

  changePassword() {
    // Handle password change
    console.log('Change password clicked');
  }

  signOut() {
    this.authService.signOut();
  }
}
