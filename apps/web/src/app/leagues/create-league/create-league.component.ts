import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { StepsModule } from 'primeng/steps';
import { LeagueService, CreateLeagueData } from '../../services/league.service';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

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
    SelectModule,
    TextareaModule,
    DividerModule,
    MessageModule,
    StepsModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService],
  templateUrl: './create-league.component.html',
  styleUrls: ['./create-league.component.scss'],
})
export class CreateLeagueComponent {
  leagueForm!: FormGroup;
  isSubmitting = signal(false);
  currentStepIndex = signal(0);
  isLoading = signal(true);

  steps = [
    { label: 'Basic Info', icon: 'pi pi-info-circle' },
    { label: 'Salary Cap & Contracts', icon: 'pi pi-dollar' },
    { label: 'Draft & Roster', icon: 'pi pi-users' },
    { label: 'Free Agency & Privacy', icon: 'pi pi-cog' },
    { label: 'Review', icon: 'pi pi-check-circle' },
  ];

  scoringSystems = [
    { label: 'PPR (Point Per Reception)', value: 'ppr' },
    { label: 'Half PPR', value: 'half-ppr' },
    { label: 'Standard', value: 'standard' },
  ];

  private leagueService = inject(LeagueService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.leagueForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      numberOfTeams: [
        12,
        [Validators.required, Validators.min(2), Validators.max(32)],
      ],
      rules: this.fb.group({
        scoring: ['ppr', Validators.required],
        cap: this.fb.group({
          salaryCap: [
            200000000,
            [Validators.required, Validators.min(100000000)],
          ],
          minimumSpend: [
            180000000,
            [Validators.required, Validators.min(100000000)],
          ],
        }),
        contracts: this.fb.group({
          maxYears: [
            5,
            [Validators.required, Validators.min(1), Validators.max(7)],
          ],
          maxSigningBonus: [
            50000000,
            [Validators.required, Validators.min(10000000)],
          ],
          rookieScale: [true],
        }),
        draft: this.fb.group({
          mode: ['snake', Validators.required],
          rounds: [
            20,
            [Validators.required, Validators.min(15), Validators.max(30)],
          ],
          timeLimit: [
            90,
            [Validators.required, Validators.min(30), Validators.max(300)],
          ],
          snakeOrder: [true],
          autodraftDelay: [
            30,
            [Validators.required, Validators.min(10), Validators.max(60)],
          ],
          rookieAutoContracts: [true],
          veteranNegotiationWindow: [
            72,
            [Validators.required, Validators.min(24), Validators.max(168)],
          ],
        }),
        freeAgency: this.fb.group({
          bidRounds: [
            30,
            [Validators.required, Validators.min(15), Validators.max(60)],
          ],
          tieBreakers: [['guarantees', 'apy', 'length', 'random']],
        }),
      }),
      isPrivate: [false], // Default to public
    });

    // Subscribe to isPrivate changes to update UI
    this.leagueForm
      .get('isPrivate')
      ?.valueChanges.subscribe((isPrivate: boolean) => {
        // No need to handle publicLeague anymore since we always generate codes
      });

    // Mark form as ready
    this.isLoading.set(false);
  }

  nextStep(): void {
    if (
      this.isCurrentStepValid() &&
      this.currentStepIndex() < this.steps.length - 1
    ) {
      this.currentStepIndex.set(this.currentStepIndex() + 1);
    }
  }

  previousStep(): void {
    if (this.currentStepIndex() > 0) {
      this.currentStepIndex.set(this.currentStepIndex() - 1);
    }
  }

  onStepChange(event: any): void {
    this.currentStepIndex.set(event.index);
  }

  isCurrentStepValid(): boolean {
    switch (this.currentStepIndex()) {
      case 0: // Basic Info
        return !!(
          this.leagueForm.get('name')?.valid &&
          this.leagueForm.get('numberOfTeams')?.valid
        );
      case 1: // Salary Cap & Contracts
        return !!(
          this.leagueForm.get('rules.cap.salaryCap')?.valid &&
          this.leagueForm.get('rules.cap.minimumSpend')?.valid &&
          this.leagueForm.get('rules.contracts.maxYears')?.valid &&
          this.leagueForm.get('rules.contracts.maxSigningBonus')?.valid
        );
      case 2: // Draft & Roster
        return !!(
          this.leagueForm.get('rules.draft.rounds')?.valid &&
          this.leagueForm.get('rules.draft.timeLimit')?.valid &&
          this.leagueForm.get('rules.draft.autodraftDelay')?.valid &&
          this.leagueForm.get('rules.draft.veteranNegotiationWindow')?.valid
        );
      case 3: // Free Agency & Privacy
        return !!(
          this.leagueForm.get('rules.freeAgency.bidRounds')?.valid &&
          this.leagueForm.get('rules.cap.minimumSpend')?.valid
        );
      case 4: // Review
        return this.leagueForm.valid;
      default:
        return false;
    }
  }

  getScoringLabel(value: string): string {
    const scoring = this.scoringSystems.find((s) => s.value === value);
    return scoring ? scoring.label : value;
  }

  async onSubmit(): Promise<void> {
    if (this.leagueForm.invalid) {
      return;
    }

    try {
      this.isSubmitting.set(true);
      const formData = this.leagueForm.value;

      const createLeagueData: CreateLeagueData = {
        name: formData.name,
        description: formData.description,
        numberOfTeams: formData.numberOfTeams,
        rules: formData.rules,
        isPrivate: formData.isPrivate,
      };

      const leagueId = await this.leagueService.createLeague(createLeagueData);
      this.router.navigate(['/leagues', leagueId]);
    } catch (error) {
      console.error('Error creating league:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
