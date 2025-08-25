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
import { CheckboxModule } from 'primeng/checkbox';
import { LeagueService, CreateLeagueData } from '../../services/league.service';
import { MessageService } from 'primeng/api';

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
    CheckboxModule,
  ],
  providers: [MessageService],
  templateUrl: './create-league.component.html',
  styleUrls: ['./create-league.component.scss'],
})
export class CreateLeagueComponent {
  leagueForm: FormGroup;
  isSubmitting = signal(false);
  currentStepIndex = signal(0);

  steps = [
    { label: 'Basic Info', icon: 'pi pi-info-circle' },
    { label: 'Salary Cap', icon: 'pi pi-dollar' },
    { label: 'Draft & Roster', icon: 'pi pi-users' },
    { label: 'Invitations', icon: 'pi pi-envelope' },
    { label: 'Review', icon: 'pi pi-check-circle' },
  ];

  leagueTypes = [
    { label: 'Dynasty', value: 'dynasty' },
    { label: 'Keeper', value: 'keeper' },
    { label: 'Redraft', value: 'redraft' },
  ];

  scoringSystems = [
    { label: 'PPR (Point Per Reception)', value: 'ppr' },
    { label: 'Half PPR', value: 'half-ppr' },
    { label: 'Standard', value: 'standard' },
    { label: 'Custom', value: 'custom' },
  ];

  positions = [
    { label: 'QB', value: 'QB' },
    { label: 'RB', value: 'RB' },
    { label: 'WR', value: 'WR' },
    { label: 'TE', value: 'TE' },
    { label: 'K', value: 'K' },
    { label: 'DEF', value: 'DEF' },
    { label: 'IDP', value: 'IDP' },
    { label: 'FLEX', value: 'FLEX' },
  ];

  private leagueService = inject(LeagueService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  constructor(private fb: FormBuilder) {
    this.leagueForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      teamName: [
        'My Dynasty Team',
        [Validators.required, Validators.minLength(2)],
      ],
      teams: [12, [Validators.required, Validators.min(8), Validators.max(16)]],
      description: [''],
      type: ['dynasty'],
      scoring: ['ppr'],
      salaryCap: [200000000, [Validators.required, Validators.min(100000000)]],
      minSpend: [
        85,
        [Validators.required, Validators.min(70), Validators.max(95)],
      ],
      maxContractYears: [
        5,
        [Validators.required, Validators.min(1), Validators.max(7)],
      ],
      franchiseTagCost: [
        15,
        [Validators.required, Validators.min(10), Validators.max(25)],
      ],
      allowVoidYears: [false],
      rosterSize: [
        25,
        [Validators.required, Validators.min(20), Validators.max(35)],
      ],
      taxiSquadSize: [
        3,
        [Validators.required, Validators.min(0), Validators.max(10)],
      ],
      draftDate: [''],
      draftTimeLimit: [
        90,
        [Validators.required, Validators.min(30), Validators.max(300)],
      ],
      requiredPositions: [['QB', 'RB', 'WR', 'TE', 'K', 'DEF']],
      inviteEmails: [''],
      entryFee: [0],
      publicLeague: [false],
    });
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
          this.leagueForm.get('teamName')?.valid &&
          this.leagueForm.get('teams')?.valid
        );
      case 1: // Salary Cap
        return !!(
          this.leagueForm.get('salaryCap')?.valid &&
          this.leagueForm.get('minSpend')?.valid &&
          this.leagueForm.get('maxContractYears')?.valid
        );
      case 2: // Draft & Roster
        return !!(
          this.leagueForm.get('rosterSize')?.valid &&
          this.leagueForm.get('taxiSquadSize')?.valid &&
          this.leagueForm.get('draftTimeLimit')?.valid
        );
      case 3: // Invitations
        return true; // Optional step
      case 4: // Review
        return this.leagueForm.valid;
      default:
        return false;
    }
  }

  getLeagueTypeLabel(value: string): string {
    const type = this.leagueTypes.find((t) => t.value === value);
    return type ? type.label : value;
  }

  getScoringLabel(value: string): string {
    const scoring = this.scoringSystems.find((s) => s.value === value);
    return scoring ? scoring.label : value;
  }

  getSalaryCapDisplay(): string {
    const salaryCap = this.leagueForm.get('salaryCap')?.value;
    if (salaryCap) {
      return (salaryCap / 1000000).toFixed(1);
    }
    return '0.0';
  }

  async onSubmit(): Promise<void> {
    if (this.leagueForm.valid) {
      try {
        this.isSubmitting.set(true);

        const formData = this.leagueForm.value;
        const leagueData: CreateLeagueData = {
          name: formData.name,
          teamName: formData.teamName,
          description: formData.description,
          type: formData.type,
          scoring: formData.scoring,
          teams: formData.teams,
          salaryCap: formData.salaryCap,
          minSpend: formData.minSpend,
          maxContractYears: formData.maxContractYears,
          franchiseTagCost: formData.franchiseTagCost,
          allowVoidYears: formData.allowVoidYears,
          rosterSize: formData.rosterSize,
          taxiSquadSize: formData.taxiSquadSize,
          draftDate: formData.draftDate,
          draftTimeLimit: formData.draftTimeLimit,
          requiredPositions: formData.requiredPositions,
          inviteEmails: formData.inviteEmails,
          entryFee: formData.entryFee,
          publicLeague: formData.publicLeague,
        };

        const leagueId = await this.leagueService.createLeague(leagueData);

        this.messageService.add({
          severity: 'success',
          summary: 'League Created!',
          detail: `Your league "${formData.name}" has been created successfully.`,
        });

        // Navigate to the new league
        this.router.navigate(['/leagues', leagueId]);
      } catch (error) {
        console.error('Error creating league:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Creation Failed',
          detail:
            error instanceof Error
              ? error.message
              : 'Failed to create league. Please try again.',
        });
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }
}
