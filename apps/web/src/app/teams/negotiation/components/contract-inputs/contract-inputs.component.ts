import {
  Component,
  input,
  signal,
  computed,
  effect,
  OnDestroy,
  inject,
  Output,
  EventEmitter,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { LeagueService } from '../../../../services/league.service';

@Component({
  selector: 'app-contract-inputs',
  standalone: true,
  imports: [CommonModule, ButtonModule, SelectModule],
  templateUrl: './contract-inputs.component.html',
  styleUrls: ['./contract-inputs.component.scss'],
})
export class ContractInputsComponent implements OnDestroy, OnInit {
  private readonly leagueService = inject(LeagueService);

  // Inputs
  years = input<number>(1);
  baseSalary = input.required<number>();
  signingBonus = input.required<number>();
  mode = input<'total' | 'yearly'>('yearly');

  // Outputs for parent component updates
  @Output() yearsChange = new EventEmitter<number>();
  @Output() baseSalaryChange = new EventEmitter<number>();
  @Output() signingBonusChange = new EventEmitter<number>();

  // Local state
  private _years = signal(0);
  private _baseSalary = signal(0);
  private _signingBonus = signal(0);

  // Years options computed from league rules
  yearsOptions = computed(() => {
    try {
      const league = this.leagueService.selectedLeague();
      const maxYears = league?.rules?.contracts?.maxYears || 7;

      const options = [];
      for (let i = 1; i <= maxYears; i++) {
        options.push({ label: i.toString(), value: i });
      }
      return options;
    } catch (error) {
      console.warn('Error computing years options, using default:', error);
      // Fallback to default options
      return [
        { label: '1', value: 1 },
        { label: '2', value: 2 },
        { label: '3', value: 3 },
        { label: '4', value: 4 },
        { label: '5', value: 5 },
        { label: '6', value: 6 },
        { label: '7', value: 7 },
      ];
    }
  });

  // Public getters
  public get currentYears() {
    return this._years();
  }
  public get currentBaseSalary() {
    return this._baseSalary();
  }
  public get currentSigningBonus() {
    return this._signingBonus();
  }

  // Click and hold state
  private _holdInterval: any = null;
  private _holdDelay = 150; // Initial delay before rapid increment starts
  private _rapidInterval = 50; // How fast to increment when holding

  // Computed values
  formattedSalary = computed(() => this.formatCurrency(this._baseSalary()));
  formattedBonus = computed(() => this.formatCurrency(this._signingBonus()));

  // Effects
  constructor() {
    effect(() => {
      const yearsValue = this.years();
      if (yearsValue !== undefined && yearsValue > 0) {
        this._years.set(yearsValue);
      } else {
        // Default to 1 if no years provided or invalid value
        this._years.set(1);
        // Emit the default value to parent
        this.yearsChange.emit(1);
      }
    });
    effect(() => {
      const baseSalaryValue = this.baseSalary();
      if (baseSalaryValue !== undefined) {
        this._baseSalary.set(baseSalaryValue);
      }
    });
    effect(() => {
      const signingBonusValue = this.signingBonus();
      if (signingBonusValue !== undefined) {
        this._signingBonus.set(signingBonusValue);
      }
    });
  }

  ngOnInit(): void {
    // Ensure we have valid initial values
    if (this._years() === 0) {
      this._years.set(1);
      this.yearsChange.emit(1);
    }
  }

  // Click and hold methods
  onMouseDown(
    operation: 'increment' | 'decrement',
    field: 'salary' | 'bonus',
    amount: number
  ) {
    // Immediate first increment/decrement
    if (operation === 'increment') {
      if (field === 'salary') this.incrementSalary(amount);
      else this.incrementBonus(amount);
    } else {
      if (field === 'salary') this.decrementSalary(amount);
      else this.decrementBonus(amount);
    }

    // Set up rapid increment/decrement after delay
    this._holdInterval = setTimeout(() => {
      this._holdInterval = setInterval(() => {
        if (operation === 'increment') {
          if (field === 'salary') this.incrementSalary(amount);
          else this.incrementBonus(amount);
        } else {
          if (field === 'salary') this.decrementSalary(amount);
          else this.decrementBonus(amount);
        }
      }, this._rapidInterval);
    }, this._holdDelay);
  }

  onMouseUp() {
    this.clearHoldInterval();
  }

  onMouseLeave() {
    this.clearHoldInterval();
  }

  private clearHoldInterval() {
    if (this._holdInterval) {
      clearInterval(this._holdInterval);
      this._holdInterval = null;
    }
  }

  // Clean up on component destroy
  ngOnDestroy() {
    this.clearHoldInterval();
  }

  // Existing methods
  updateYears(newYears: number) {
    if (newYears >= 1 && newYears <= 7) {
      this._years.set(newYears);
      // Emit the change to parent component
      this.yearsChange.emit(newYears);
    } else if (newYears < 1) {
      // Default to 1 if invalid value
      this._years.set(1);
      this.yearsChange.emit(1);
    }
  }

  incrementSalary(amount: number) {
    const newValue = this._baseSalary() + amount;
    this._baseSalary.set(newValue);
    // Emit the change to parent component
    this.baseSalaryChange.emit(newValue);
  }

  decrementSalary(amount: number) {
    const newValue = Math.max(0, this._baseSalary() - amount);
    this._baseSalary.set(newValue);
    // Emit the change to parent component
    this.baseSalaryChange.emit(newValue);
  }

  incrementBonus(amount: number) {
    const newValue = this._signingBonus() + amount;
    this._signingBonus.set(newValue);
    // Emit the change to parent component
    this.signingBonusChange.emit(newValue);
  }

  decrementBonus(amount: number) {
    const newValue = Math.max(0, this._signingBonus() - amount);
    this._signingBonus.set(newValue);
    // Emit the change to parent component
    this.signingBonusChange.emit(newValue);
  }

  private formatCurrency(value: number): string {
    if (value === 0) return '$0';

    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toLocaleString()}`;
    }
  }
}
