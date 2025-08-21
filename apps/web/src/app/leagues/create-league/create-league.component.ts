import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { TextareaModule } from 'primeng/textarea';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-create-league',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    ReactiveFormsModule,
    CardModule, 
    ButtonModule, 
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    TextareaModule,
    DividerModule,
    MessageModule
  ],
  template: `
    <div class="create-league-container">
      <p-card styleClass="create-league-card">
        <ng-template pTemplate="header">
          <div class="text-center py-6">
            <i class="pi pi-trophy text-6xl text-primary-500 mb-4"></i>
            <h1 class="text-3xl font-bold text-secondary-900 mb-2">Create New League</h1>
            <p class="text-lg text-secondary-600">Set up your dynasty fantasy football league</p>
          </div>
        </ng-template>

        <form [formGroup]="leagueForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <div class="form-section">
            <h2 class="text-xl font-semibold text-secondary-800 mb-4">League Information</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="field">
                <label for="name" class="block text-sm font-medium text-secondary-700 mb-2">
                  League Name *
                </label>
                <input 
                  id="name"
                  type="text" 
                  pInputText 
                  formControlName="name"
                  placeholder="Enter league name"
                  class="w-full"
                />
                @if (leagueForm.get('name')?.invalid && leagueForm.get('name')?.touched) {
                  <small class="p-error">League name is required</small>
                }
              </div>

              <div class="field">
                <label for="teams" class="block text-sm font-medium text-secondary-700 mb-2">
                  Number of Teams *
                </label>
                <p-inputNumber 
                  id="teams"
                  formControlName="teams"
                  [min]="8"
                  [max]="16"
                  [showButtons]="true"
                  buttonLayout="horizontal"
                  spinnerMode="horizontal"
                  [step]="2"
                  decrementButtonClass="p-button-secondary" 
                  incrementButtonClass="p-button-secondary"
                  incrementButtonIcon="pi pi-plus" 
                  decrementButtonIcon="pi pi-minus"
                  class="w-full"
                ></p-inputNumber>
                @if (leagueForm.get('teams')?.invalid && leagueForm.get('teams')?.touched) {
                  <small class="p-error">Number of teams must be between 8 and 16</small>
                }
              </div>
            </div>

            <div class="field mt-4">
              <label for="description" class="block text-sm font-medium text-secondary-700 mb-2">
                Description
              </label>
              <textarea 
                id="description"
                pInputTextarea 
                formControlName="description"
                rows="3"
                placeholder="Describe your league (optional)"
                class="w-full"
              ></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div class="field">
                <label for="type" class="block text-sm font-medium text-secondary-700 mb-2">
                  League Type
                </label>
                <p-dropdown 
                  id="type"
                  formControlName="type"
                  [options]="leagueTypes"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select league type"
                  class="w-full"
                ></p-dropdown>
              </div>

              <div class="field">
                <label for="scoring" class="block text-sm font-medium text-secondary-700 mb-2">
                  Scoring System
                </label>
                <p-dropdown 
                  id="scoring"
                  formControlName="scoring"
                  [options]="scoringSystems"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select scoring system"
                  class="w-full"
                ></p-dropdown>
              </div>
            </div>
          </div>

          <p-divider></p-divider>

          <div class="form-section">
            <h2 class="text-xl font-semibold text-secondary-800 mb-4">League Settings</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="field">
                <label for="entryFee" class="block text-sm font-medium text-secondary-700 mb-2">
                  Entry Fee ($)
                </label>
                <p-inputNumber 
                  id="entryFee"
                  formControlName="entryFee"
                  [min]="0"
                  [max]="1000"
                  [showButtons]="true"
                  buttonLayout="horizontal"
                  spinnerMode="horizontal"
                  [step]="10"
                  decrementButtonClass="p-button-secondary" 
                  incrementButtonClass="p-button-secondary"
                  incrementButtonIcon="pi pi-plus" 
                  decrementButtonIcon="pi pi-minus"
                  class="w-full"
                ></p-inputNumber>
              </div>

              <div class="field">
                <label for="draftDate" class="block text-sm font-medium text-secondary-700 mb-2">
                  Draft Date
                </label>
                <input 
                  id="draftDate"
                  type="date" 
                  pInputText 
                  formControlName="draftDate"
                  class="w-full"
                />
              </div>
            </div>
          </div>
        </form>

        <ng-template pTemplate="footer">
          <div class="flex gap-3 justify-end">
            <p-button 
              label="Cancel" 
              icon="pi pi-times" 
              routerLink="/leagues"
              severity="secondary"
              outlined="true"
            ></p-button>
            <p-button 
              label="Create League" 
              icon="pi pi-check" 
              (onClick)="onSubmit()"
              severity="primary"
              [loading]="isSubmitting()"
              [disabled]="leagueForm.invalid"
            ></p-button>
          </div>
        </ng-template>
      </p-card>
    </div>
  `,
  styles: [
    `
      .create-league-container {
        padding: 2rem;
        max-width: 900px;
        margin: 0 auto;
      }

      .create-league-card {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      }

      .field {
        margin-bottom: 1rem;
      }

      .form-section {
        margin-bottom: 2rem;
      }

      .form-section h2 {
        color: var(--text-primary);
        margin: 0 0 1rem 0;
      }

      .p-inputtext,
      .p-inputnumber,
      .p-dropdown,
      .p-inputtextarea {
        width: 100%;
      }

      .p-error {
        color: var(--red-500);
        font-size: 0.875rem;
        margin-top: 0.25rem;
      }
    `,
  ],
})
export class CreateLeagueComponent {
  leagueForm: FormGroup;
  isSubmitting = signal(false);

  leagueTypes = [
    { label: 'Dynasty', value: 'dynasty' },
    { label: 'Keeper', value: 'keeper' },
    { label: 'Redraft', value: 'redraft' }
  ];

  scoringSystems = [
    { label: 'PPR (Point Per Reception)', value: 'ppr' },
    { label: 'Half PPR', value: 'half-ppr' },
    { label: 'Standard', value: 'standard' },
    { label: 'Custom', value: 'custom' }
  ];

  constructor(private fb: FormBuilder) {
    this.leagueForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      teams: [12, [Validators.required, Validators.min(8), Validators.max(16)]],
      description: [''],
      type: ['dynasty'],
      scoring: ['ppr'],
      entryFee: [0],
      draftDate: ['']
    });
  }

  onSubmit(): void {
    if (this.leagueForm.valid) {
      this.isSubmitting.set(true);
      console.log('League form submitted:', this.leagueForm.value);
      
      // Simulate API call
      setTimeout(() => {
        this.isSubmitting.set(false);
        // TODO: Navigate to new league or show success message
      }, 2000);
    }
  }
}
