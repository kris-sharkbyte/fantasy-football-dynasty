import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
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
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

import { LeagueService } from '../../services/league.service';
import { TeamLocation } from '@fantasy-football-dynasty/types';

interface CityOption {
  city: string;
  state: string;
  timezone: string;
  marketSize: 'small' | 'medium' | 'large';
  climate: 'cold' | 'temperate' | 'warm';
  taxRate: number;
  stadiumName: string;
  stadiumCapacity: number;
}

@Component({
  selector: 'app-team-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    MessageModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService],
  templateUrl: './team-edit.component.html',
  styleUrls: ['./team-edit.component.scss'],
})
export class TeamEditComponent implements OnInit {
  teamForm!: FormGroup;
  isSubmitting = signal(false);
  isLoading = signal(true);
  leagueId = signal<string | null>(null);
  teamId = signal<string | null>(null);

  // City options with realistic NFL market data
  cityOptions: CityOption[] = [
    // Big Markets
    {
      city: 'New York',
      state: 'NY',
      timezone: 'EST',
      marketSize: 'large',
      climate: 'temperate',
      taxRate: 0.0685,
      stadiumName: 'MetLife Stadium',
      stadiumCapacity: 82500,
    },
    {
      city: 'Los Angeles',
      state: 'CA',
      timezone: 'PST',
      marketSize: 'large',
      climate: 'warm',
      taxRate: 0.133,
      stadiumName: 'SoFi Stadium',
      stadiumCapacity: 70240,
    },
    {
      city: 'Chicago',
      state: 'IL',
      timezone: 'CST',
      marketSize: 'large',
      climate: 'cold',
      taxRate: 0.0495,
      stadiumName: 'Soldier Field',
      stadiumCapacity: 61500,
    },
    {
      city: 'Dallas',
      state: 'TX',
      timezone: 'CST',
      marketSize: 'large',
      climate: 'warm',
      taxRate: 0,
      stadiumName: 'AT&T Stadium',
      stadiumCapacity: 80000,
    },
    {
      city: 'Philadelphia',
      state: 'PA',
      timezone: 'EST',
      marketSize: 'large',
      climate: 'temperate',
      taxRate: 0.0307,
      stadiumName: 'Lincoln Financial Field',
      stadiumCapacity: 69596,
    },

    // Medium Markets
    {
      city: 'Denver',
      state: 'CO',
      timezone: 'MST',
      marketSize: 'medium',
      climate: 'cold',
      taxRate: 0.0446,
      stadiumName: 'Empower Field at Mile High',
      stadiumCapacity: 76125,
    },
    {
      city: 'Seattle',
      state: 'WA',
      timezone: 'PST',
      marketSize: 'medium',
      climate: 'temperate',
      taxRate: 0,
      stadiumName: 'Lumen Field',
      stadiumCapacity: 69000,
    },
    {
      city: 'Miami',
      state: 'FL',
      timezone: 'EST',
      marketSize: 'medium',
      climate: 'warm',
      taxRate: 0,
      stadiumName: 'Hard Rock Stadium',
      stadiumCapacity: 65326,
    },
    {
      city: 'Nashville',
      state: 'TN',
      timezone: 'CST',
      marketSize: 'medium',
      climate: 'temperate',
      taxRate: 0,
      stadiumName: 'Nissan Stadium',
      stadiumCapacity: 69143,
    },
    {
      city: 'Kansas City',
      state: 'MO',
      timezone: 'CST',
      marketSize: 'medium',
      climate: 'temperate',
      taxRate: 0.0495,
      stadiumName: 'Arrowhead Stadium',
      stadiumCapacity: 76416,
    },

    // Small Markets
    {
      city: 'Green Bay',
      state: 'WI',
      timezone: 'CST',
      marketSize: 'small',
      climate: 'cold',
      taxRate: 0.0765,
      stadiumName: 'Lambeau Field',
      stadiumCapacity: 81441,
    },
    {
      city: 'Buffalo',
      state: 'NY',
      timezone: 'EST',
      marketSize: 'small',
      climate: 'cold',
      taxRate: 0.0685,
      stadiumName: 'Highmark Stadium',
      stadiumCapacity: 71608,
    },
    {
      city: 'Jacksonville',
      state: 'FL',
      timezone: 'EST',
      marketSize: 'small',
      climate: 'warm',
      taxRate: 0,
      stadiumName: 'TIAA Bank Field',
      stadiumCapacity: 67246,
    },
    {
      city: 'Cleveland',
      state: 'OH',
      timezone: 'EST',
      marketSize: 'small',
      climate: 'cold',
      taxRate: 0.0399,
      stadiumName: 'FirstEnergy Stadium',
      stadiumCapacity: 67500,
    },
    {
      city: 'Cincinnati',
      state: 'OH',
      timezone: 'EST',
      marketSize: 'small',
      climate: 'temperate',
      taxRate: 0.0399,
      stadiumName: 'Paycor Stadium',
      stadiumCapacity: 65515,
    },
  ];

  marketSizeOptions = [
    { label: 'Small Market', value: 'small' },
    { label: 'Medium Market', value: 'medium' },
    { label: 'Large Market', value: 'large' },
  ];

  climateOptions = [
    { label: 'Cold Weather', value: 'cold' },
    { label: 'Temperate', value: 'temperate' },
    { label: 'Warm Weather', value: 'warm' },
  ];

  private readonly leagueService = inject(LeagueService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.leagueId.set(params['leagueId']);
      this.loadTeamData();
    });
  }

  private async loadTeamData(): Promise<void> {
    try {
      this.isLoading.set(true);

      if (!this.leagueId()) {
        throw new Error('No league ID provided');
      }

      // Get current user's team for this league
      const currentUserTeam = this.leagueService.currentUserTeam();
      if (!currentUserTeam) {
        throw new Error('No team found for current user');
      }

      this.teamId.set(currentUserTeam.teamId);

      // Initialize form with current team data
      this.initializeForm();
    } catch (error) {
      console.error('Error loading team data:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load team data. Please try again.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  private initializeForm(): void {
    const currentUserTeam = this.leagueService.currentUserTeam();
    if (!currentUserTeam) return;

    // Get the actual team data from leagueTeams
    const currentTeam = this.leagueService
      .leagueTeams()
      .find((team) => team.id === currentUserTeam.teamId);

    this.teamForm = this.fb.group({
      name: [
        currentUserTeam?.teamName || '',
        [Validators.required, Validators.minLength(3)],
      ],
      city: [null, Validators.required],
      customStadiumName: ['', Validators.required],
      customStadiumCapacity: [
        70000,
        [Validators.required, Validators.min(10000), Validators.max(100000)],
      ],
      isContender: [false],
      isStable: [true],
    });

    // Set default city if team doesn't have location set
    if (!currentTeam?.location) {
      this.teamForm.patchValue({
        city: this.cityOptions[0], // Default to first city
        customStadiumName: this.cityOptions[0].stadiumName,
        customStadiumCapacity: this.cityOptions[0].stadiumCapacity,
      });
    } else {
      // Find matching city option
      const matchingCity = this.cityOptions.find(
        (city) =>
          city.city === currentTeam.location!.city &&
          city.state === currentTeam.location!.state
      );

      if (matchingCity) {
        this.teamForm.patchValue({
          city: matchingCity,
          customStadiumName:
            currentTeam.location!.stadiumName || matchingCity.stadiumName,
          customStadiumCapacity:
            currentTeam.location!.stadiumCapacity ||
            matchingCity.stadiumCapacity,
          isContender: currentTeam.location!.isContender,
          isStable: currentTeam.location!.isStable,
        });
      }
    }
  }

  onCityChange(): void {
    const selectedCity = this.teamForm.get('city')?.value;
    if (selectedCity) {
      this.teamForm.patchValue({
        customStadiumName: selectedCity.stadiumName,
        customStadiumCapacity: selectedCity.stadiumCapacity,
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.teamForm.invalid) {
      return;
    }

    try {
      this.isSubmitting.set(true);

      const formData = this.teamForm.value;
      const selectedCity = formData.city;

      // Create team location object
      const teamLocation: TeamLocation = {
        city: selectedCity.city,
        state: selectedCity.state,
        timezone: selectedCity.timezone,
        marketSize: selectedCity.marketSize,
        climate: selectedCity.climate,
        stadiumName: formData.customStadiumName,
        stadiumCapacity: formData.customStadiumCapacity,
        isContender: formData.isContender,
        isStable: formData.isStable,
        taxRate: selectedCity.taxRate,
      };

      // Update team in the league service
      // Note: This would need to be implemented in the league service
      // await this.leagueService.updateTeamLocation(this.leagueId()!, this.teamId()!, teamLocation);

      this.messageService.add({
        severity: 'success',
        summary: 'Success!',
        detail: 'Team settings updated successfully!',
      });

      // Navigate back to league detail
      this.router.navigate(['/leagues', this.leagueId()]);
    } catch (error) {
      console.error('Error updating team:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update team. Please try again.',
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onCancel(): void {
    this.router.navigate(['/leagues', this.leagueId()]);
  }

  get selectedCity(): CityOption | null {
    return this.teamForm.get('city')?.value || null;
  }

  get marketSizeLabel(): string {
    const city = this.selectedCity;
    return city
      ? city.marketSize.charAt(0).toUpperCase() +
          city.marketSize.slice(1) +
          ' Market'
      : '';
  }

  get climateLabel(): string {
    const city = this.selectedCity;
    if (!city) return '';

    switch (city.climate) {
      case 'cold':
        return 'Cold Weather';
      case 'temperate':
        return 'Temperate';
      case 'warm':
        return 'Warm Weather';
      default:
        return city.climate;
    }
  }

  get taxRateLabel(): string {
    const city = this.selectedCity;
    if (!city) return '';

    if (city.taxRate === 0) {
      return 'No State Income Tax';
    }
    return `${(city.taxRate * 100).toFixed(2)}% State Tax`;
  }
}
