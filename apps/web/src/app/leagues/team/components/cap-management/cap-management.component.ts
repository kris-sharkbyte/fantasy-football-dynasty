import { Component, signal, computed, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { LeagueService } from '../../../../services/league.service';
import { CapLedgerService } from '../../../../services/cap-ledger.service';
import { SportsDataService } from '../../../../services/sports-data.service';
import { NumberFormatService } from '../../../../services/number-format.service';
import { Contract, CapLedger, Position } from '@fantasy-football-dynasty/types';
import { CapMath } from '@fantasy-football-dynasty/domain';

interface ContractWithPlayer extends Contract {
  playerName?: string;
  position?: Position;
  sportPlayerID?: string;
}

interface DeadMoneyEntry {
  playerName: string;
  position: Position;
  contractId: string;
  deadMoneyThisYear: number;
  deadMoneyNextYear: number;
  reason: string;
  refType: 'cut' | 'trade';
  createdAt: Date;
}

interface ExpiringContract {
  playerName: string;
  position: Position;
  contractId: string;
  endYear: number;
  currentCapHit: number;
  yearsRemaining: number;
}

interface PositionCapAllocation {
  position: Position;
  totalCap: number;
  playerCount: number;
  percentage: number;
}

@Component({
  selector: 'app-cap-management',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TableModule,
    TagModule,
    ButtonModule,
    TabsModule,
    DialogModule,
    InputNumberModule,
    SelectModule,
    ProgressBarModule,
    TooltipModule,
    CheckboxModule,
    FormsModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './cap-management.component.html',
  styleUrls: ['./cap-management.component.scss'],
})
export class CapManagementComponent implements OnInit {
  private readonly firestore = inject(Firestore);
  private readonly leagueService = inject(LeagueService);
  private readonly capLedgerService = inject(CapLedgerService);
  private readonly sportsDataService = inject(SportsDataService);
  private readonly numberFormatService = inject(NumberFormatService);

  // Component state
  private _isLoading = signal(true);
  private _leagueId = signal<string | null>(null);
  private _teamId = signal<string | null>(null);
  private _selectedYear = signal<number>(new Date().getFullYear());
  private _teamContracts = signal<ContractWithPlayer[]>([]);
  private _capLedgerEntries = signal<CapLedger[]>([]);
  private _showCalculatorDialog = signal(false);
  private _calculatorAction = signal<'cut' | 'trade' | 'restructure' | null>(null);
  private _calculatorContract = signal<ContractWithPlayer | null>(null);

  // Public signals
  public isLoading = this._isLoading.asReadonly();
  public selectedYear = this._selectedYear.asReadonly();
  public showCalculatorDialog = computed(() => this._showCalculatorDialog());
  
  set showCalculatorDialogValue(value: boolean) {
    this._showCalculatorDialog.set(value);
  }
  
  get showCalculatorDialogValue(): boolean {
    return this._showCalculatorDialog();
  }
  public calculatorAction = this._calculatorAction.asReadonly();
  public calculatorContract = this._calculatorContract.asReadonly();

  // Computed values
  public currentUserTeam = computed(() => this.leagueService.currentUserTeam());
  public selectedLeague = computed(() => this.leagueService.selectedLeague());
  public currentYear = computed(() => this.selectedLeague()?.currentYear || new Date().getFullYear());
  public salaryCap = computed(() => {
    const league = this.selectedLeague();
    return league?.rules?.cap?.salaryCap || 200000000; // Default $200M
  });

  // Phase 1: Overview Metrics
  public committedCap = computed(() => {
    const contracts = this._teamContracts();
    const year = this._selectedYear();
    return contracts.reduce((total, contract) => {
      return total + CapMath.calculateCapHit(contract, year);
    }, 0);
  });

  public deadMoney = computed(() => {
    const entries = this._capLedgerEntries();
    const year = this._selectedYear();
    return entries
      .filter((entry) => entry.leagueYear === year)
      .reduce((total, entry) => total + entry.capOut, 0);
  });

  public availableCapSpace = computed(() => {
    return this.salaryCap() - this.committedCap() - this.deadMoney();
  });

  public capUtilization = computed(() => {
    const total = this.salaryCap();
    if (total === 0) return 0;
    return (this.committedCap() / total) * 100;
  });

  // Phase 1: Active Contracts Table
  public activeContracts = computed(() => {
    const contracts = this._teamContracts();
    const year = this._selectedYear();
    const sportsPlayers = this.sportsDataService.activePlayers();
    const sportsMap = new Map<number, any>();
    sportsPlayers.forEach((p) => sportsMap.set(p.PlayerID, p));

    return contracts
      .filter((contract) => year >= contract.startYear && year <= contract.endYear)
      .map((contract) => {
        const player = this.getPlayerFromContract(contract);
        const sportPlayer = player?.sportPlayerID
          ? sportsMap.get(parseInt(player.sportPlayerID))
          : null;

        const capHit = CapMath.calculateCapHit(contract, year);
        const baseSalary = contract.baseSalary[year] || 0;
        const proratedBonus = CapMath.calculateProratedBonus(contract, year);
        const yearsRemaining = contract.endYear - year + 1;
        const totalValue = Object.values(contract.baseSalary).reduce((sum, val) => sum + val, 0) + contract.signingBonus;

        return {
          ...contract,
          playerName: sportPlayer
            ? `${sportPlayer.FirstName} ${sportPlayer.LastName}`
            : player?.name || 'Unknown Player',
          position: (player?.position || sportPlayer?.Position || 'RB') as Position,
          sportPlayerID: player?.sportPlayerID || sportPlayer?.PlayerID?.toString(),
          capHit,
          baseSalary,
          proratedBonus,
          yearsRemaining,
          totalValue,
        };
      })
      .sort((a, b) => b.capHit - a.capHit);
  });

  // Phase 2: Dead Money Breakdown
  public deadMoneyEntries = computed(() => {
    const entries = this._capLedgerEntries();
    const contracts = this._teamContracts();
    const year = this._selectedYear();
    const sportsPlayers = this.sportsDataService.activePlayers();
    const sportsMap = new Map<number, any>();
    sportsPlayers.forEach((p) => sportsMap.set(p.PlayerID, p));

    const deadMoneyMap = new Map<string, DeadMoneyEntry>();

    entries
      .filter((entry) => entry.leagueYear === year || entry.leagueYear === year + 1)
      .forEach((entry) => {
        if (entry.refType !== 'cut' && entry.refType !== 'trade') return;

        const existing = deadMoneyMap.get(entry.refId);
        if (existing) {
          if (entry.leagueYear === year) {
            existing.deadMoneyThisYear += entry.capOut;
          } else {
            existing.deadMoneyNextYear += entry.capOut;
          }
        } else {
          // Find contract to get player info
          const contract = contracts.find((c) => c.id === entry.refId);
          const player = contract ? this.getPlayerFromContract(contract) : null;
          const sportPlayer = player?.sportPlayerID
            ? sportsMap.get(parseInt(player.sportPlayerID))
            : null;

          deadMoneyMap.set(entry.refId, {
            playerName: sportPlayer
              ? `${sportPlayer.FirstName} ${sportPlayer.LastName}`
              : player?.name || 'Unknown Player',
            position: (player?.position || sportPlayer?.Position || 'RB') as Position,
            contractId: entry.refId,
            deadMoneyThisYear: entry.leagueYear === year ? entry.capOut : 0,
            deadMoneyNextYear: entry.leagueYear === year + 1 ? entry.capOut : 0,
            reason: entry.reason,
            refType: entry.refType,
            createdAt: entry.createdAt,
          });
        }
      });

    return Array.from(deadMoneyMap.values()).sort(
      (a, b) => b.deadMoneyThisYear + b.deadMoneyNextYear - (a.deadMoneyThisYear + a.deadMoneyNextYear)
    );
  });

  // Phase 2: Upcoming Expirations
  public expiringContracts = computed(() => {
    const contracts = this._teamContracts();
    const year = this._selectedYear();
    const sportsPlayers = this.sportsDataService.activePlayers();
    const sportsMap = new Map<number, any>();
    sportsPlayers.forEach((p) => sportsMap.set(p.PlayerID, p));

    const expiring: ExpiringContract[] = [];

    contracts.forEach((contract) => {
      if (contract.endYear <= year + 2) {
        const player = this.getPlayerFromContract(contract);
        const sportPlayer = player?.sportPlayerID
          ? sportsMap.get(parseInt(player.sportPlayerID))
          : null;

        expiring.push({
          playerName: sportPlayer
            ? `${sportPlayer.FirstName} ${sportPlayer.LastName}`
            : player?.name || 'Unknown Player',
          position: (player?.position || sportPlayer?.Position || 'RB') as Position,
          contractId: contract.id,
          endYear: contract.endYear,
          currentCapHit: CapMath.calculateCapHit(contract, year),
          yearsRemaining: contract.endYear - year,
        });
      }
    });

    return expiring.sort((a, b) => a.endYear - b.endYear);
  });

  // Phase 3: Position Cap Allocation
  public positionCapAllocation = computed(() => {
    const contracts = this.activeContracts();
    const totalCap = this.committedCap();
    const allocation = new Map<Position, { cap: number; count: number }>();

    contracts.forEach((contract) => {
      const pos = contract.position || 'RB';
      const existing = allocation.get(pos) || { cap: 0, count: 0 };
      allocation.set(pos, {
        cap: existing.cap + contract.capHit,
        count: existing.count + 1,
      });
    });

    const result: PositionCapAllocation[] = [];
    allocation.forEach((data, position) => {
      result.push({
        position,
        totalCap: data.cap,
        playerCount: data.count,
        percentage: totalCap > 0 ? (data.cap / totalCap) * 100 : 0,
      });
    });

    return result.sort((a, b) => b.totalCap - a.totalCap);
  });

  // Multi-year projections
  public futureYears = computed(() => {
    const current = this.currentYear();
    return [current, current + 1, current + 2, current + 3, current + 4].map(year => ({
      label: year.toString(),
      value: year
    }));
  });

  public yearProjection = computed(() => {
    return (year: number) => {
      const contracts = this._teamContracts();
      const committed = contracts.reduce((total, contract) => {
        return total + CapMath.calculateCapHit(contract, year);
      }, 0);

      // Get dead money for this year (would need to load ledger for each year)
      // For now, only show current year dead money
      const deadMoney = year === this._selectedYear() ? this.deadMoney() : 0;

      return {
        year,
        salaryCap: this.salaryCap(),
        committed,
        deadMoney,
        available: this.salaryCap() - committed - deadMoney,
        utilization: this.salaryCap() > 0 ? (committed / this.salaryCap()) * 100 : 0,
      };
    };
  });

  // Get year options for dropdown
  public yearOptions = computed(() => {
    const current = this.currentYear();
    return [current, current + 1, current + 2, current + 3, current + 4].map(year => ({
      label: year.toString(),
      value: year
    }));
  });

  // Calculator state
  public calculatorDeadMoney = signal<{ currentYear: number; nextYear: number } | null>(null);
  public calculatorCapSavings = signal<number>(0);
  public calculatorPreJune1 = signal<boolean>(false);

  // Expose calculatorPreJune1 for two-way binding
  get calculatorPreJune1Value(): boolean {
    return this.calculatorPreJune1();
  }

  set calculatorPreJune1Value(value: boolean) {
    this.calculatorPreJune1.set(value);
  }

  constructor() {
    // Auto-load when team/league changes
    effect(() => {
      const team = this.currentUserTeam();
      const league = this.selectedLeague();
      if (team?.teamId && league?.id) {
        this._teamId.set(team.teamId);
        this._leagueId.set(league.id);
        this._selectedYear.set(league.currentYear || new Date().getFullYear());
        this.loadData();
      }
    });
  }

  ngOnInit(): void {
    // Initial load handled by effect
  }

  private async loadData(): Promise<void> {
    const leagueId = this._leagueId();
    const teamId = this._teamId();
    if (!leagueId || !teamId) {
      console.warn('[Cap Management] Missing leagueId or teamId:', { leagueId, teamId });
      return;
    }

    try {
      this._isLoading.set(true);

      console.log('[Cap Management] Loading data for:', { leagueId, teamId });

      // Load contracts
      const players = await this.leagueService.getTeamPlayersFromContracts(leagueId, teamId);
      console.log('[Cap Management] Players from contracts:', players.length, players);
      
      const contracts: ContractWithPlayer[] = players.map((player) => {
        // Handle both contract structures (nested contract or direct)
        const contractData = player.contract || player;
        
        const contract: ContractWithPlayer = {
          id: player.contractId || player.id,
          playerId: player.leaguePlayerId || player.id || player.playerId,
          teamId: teamId,
          startYear: contractData.startYear || new Date().getFullYear(),
          endYear: contractData.endYear || (contractData.startYear ? contractData.startYear + (contractData.years || 1) - 1 : new Date().getFullYear() + 1),
          baseSalary: contractData.baseSalary || {},
          signingBonus: contractData.signingBonus || 0,
          guarantees: contractData.guarantees || [],
          noTradeClause: contractData.noTradeClause || false,
          createdAt: contractData.createdAt || new Date(),
          playerName: player.name,
          position: (player.position || 'RB') as Position,
          sportPlayerID: player.sportPlayerID,
        };
        
        console.log('[Cap Management] Mapped contract:', {
          contractId: contract.id,
          playerId: contract.playerId,
          playerName: contract.playerName,
          startYear: contract.startYear,
          endYear: contract.endYear,
          baseSalaryKeys: Object.keys(contract.baseSalary),
        });
        
        return contract;
      });
      
      console.log('[Cap Management] Total contracts loaded:', contracts.length);
      this._teamContracts.set(contracts);

      // Load cap ledger
      const ledgerEntries = await this.capLedgerService.getTeamCapLedger(
        leagueId,
        teamId,
        this._selectedYear()
      );
      this._capLedgerEntries.set(ledgerEntries);
    } catch (error) {
      console.error('[Cap Management] Error loading data:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  private getPlayerFromContract(contract: ContractWithPlayer): any {
    // This would ideally look up the player from league players
    // For now, return contract data if available
    return contract;
  }

  // Year selector
  onYearChange(event: any): void {
    const year = event.value || event;
    this._selectedYear.set(year);
    this.loadData();
  }

  get selectedYearValue(): number {
    return this._selectedYear();
  }

  set selectedYearValue(value: number) {
    this._selectedYear.set(value);
    this.loadData();
  }

  // Calculator methods
  openCalculator(action: 'cut' | 'trade' | 'restructure', contract: ContractWithPlayer): void {
    this._calculatorAction.set(action);
    this._calculatorContract.set(contract);
    this._showCalculatorDialog.set(true);
    this.calculateCapImpact(action, contract);
  }

  closeCalculator(): void {
    this._showCalculatorDialog.set(false);
    this._calculatorAction.set(null);
    this._calculatorContract.set(null);
    this.calculatorDeadMoney.set(null);
    this.calculatorCapSavings.set(0);
    this.calculatorPreJune1.set(false);
  }

  calculateCapImpact(action: 'cut' | 'trade' | 'restructure', contract: ContractWithPlayer): void {
    const year = this._selectedYear();
    const currentCapHit = CapMath.calculateCapHit(contract, year);

    if (action === 'cut' || action === 'trade') {
      const deadMoney = CapMath.calculateDeadMoney(
        contract,
        year,
        this.calculatorPreJune1()
      );
      this.calculatorDeadMoney.set(deadMoney);
      this.calculatorCapSavings.set(currentCapHit - deadMoney.currentYear);
    } else if (action === 'restructure') {
      // Restructure would convert salary to bonus
      // Simplified: assume converting base salary to signing bonus
      // This is a placeholder - actual restructure logic would be more complex
      this.calculatorDeadMoney.set(null);
      this.calculatorCapSavings.set(0);
    }
  }

  onPreJune1Change(): void {
    const contract = this.calculatorContract();
    const action = this.calculatorAction();
    if (contract && action) {
      this.calculateCapImpact(action, contract);
    }
  }

  // Formatting helpers
  formatCurrency(value: number): string {
    // For cap management, show full amounts with commas
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  // Expose CapMath for template
  get CapMath() {
    return CapMath;
  }

  // Helper to calculate cap hit in template
  calculateCapHit(contract: ContractWithPlayer, year: number): number {
    return CapMath.calculateCapHit(contract, year);
  }
}
