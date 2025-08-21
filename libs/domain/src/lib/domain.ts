import {
  Contract,
  Guarantee,
  CapLedger,
  Team,
  Player,
  Position,
} from '@fantasy-football-dynasty/types';

export class CapMath {
  /**
   * Calculate the cap hit for a contract in a specific year
   */
  static calculateCapHit(contract: Contract, year: number): number {
    if (year < contract.startYear || year > contract.endYear) {
      return 0;
    }

    const baseSalary = contract.baseSalary[year] || 0;
    const proratedBonus = this.calculateProratedBonus(contract, year);

    return baseSalary + proratedBonus;
  }

  /**
   * Calculate prorated signing bonus for a specific year
   */
  static calculateProratedBonus(contract: Contract, year: number): number {
    if (contract.signingBonus === 0) return 0;

    const contractLength = contract.endYear - contract.startYear + 1;
    const maxProrationYears = Math.min(contractLength, 5); // NFL rule: max 5 years

    return contract.signingBonus / maxProrationYears;
  }

  /**
   * Calculate dead money when a contract is cut or traded
   */
  static calculateDeadMoney(
    contract: Contract,
    cutYear: number,
    preJune1: boolean = false
  ): { currentYear: number; nextYear: number } {
    const remainingBonus = this.calculateRemainingBonus(contract, cutYear - 1);

    if (preJune1) {
      // All remaining bonus accelerates to current year
      return { currentYear: remainingBonus, nextYear: 0 };
    } else {
      // Current year's proration stays, rest accelerates to next year
      const currentYearProration = this.calculateProratedBonus(
        contract,
        cutYear
      );
      const nextYearAcceleration = remainingBonus - currentYearProration;

      return {
        currentYear: currentYearProration,
        nextYear: Math.max(0, nextYearAcceleration),
      };
    }
  }

  /**
   * Calculate remaining unamortized signing bonus through a specific year
   */
  static calculateRemainingBonus(
    contract: Contract,
    throughYear: number
  ): number {
    if (contract.signingBonus === 0) return 0;

    const totalProration = this.calculateTotalProration(contract);
    const yearsElapsed = Math.max(0, throughYear - contract.startYear + 1);
    const prorationPaid = totalProration * yearsElapsed;

    return Math.max(0, contract.signingBonus - prorationPaid);
  }

  /**
   * Calculate total proration for a contract
   */
  static calculateTotalProration(contract: Contract): number {
    if (contract.signingBonus === 0) return 0;

    const contractLength = contract.endYear - contract.startYear + 1;
    const maxProrationYears = Math.min(contractLength, 5);

    return contract.signingBonus / maxProrationYears;
  }

  /**
   * Calculate guaranteed money for a contract
   */
  static calculateGuaranteedMoney(contract: Contract, year: number): number {
    return contract.guarantees
      .filter((g) => g.year <= year)
      .reduce((total, guarantee) => total + guarantee.amount, 0);
  }

  /**
   * Validate if a team can afford a contract
   */
  static canAffordContract(
    team: Team,
    contract: Contract,
    year: number
  ): boolean {
    const capHit = this.calculateCapHit(contract, year);
    return team.capSpace >= capHit;
  }

  /**
   * Calculate cap space after signing a contract
   */
  static calculateRemainingCapSpace(
    team: Team,
    contract: Contract,
    year: number
  ): number {
    const capHit = this.calculateCapHit(contract, year);
    return team.capSpace - capHit;
  }
}

export class ContractValidator {
  /**
   * Validate a contract structure
   */
  static validateContract(contract: Contract): string[] {
    const errors: string[] = [];

    if (contract.startYear > contract.endYear) {
      errors.push('Start year must be before or equal to end year');
    }

    if (contract.endYear - contract.startYear + 1 > 7) {
      errors.push('Contract cannot exceed 7 years');
    }

    if (contract.signingBonus < 0) {
      errors.push('Signing bonus cannot be negative');
    }

    // Validate base salary for each year
    for (let year = contract.startYear; year <= contract.endYear; year++) {
      const salary = contract.baseSalary[year];
      if (salary === undefined || salary < 0) {
        errors.push(`Invalid base salary for year ${year}`);
      }
    }

    // Validate guarantees
    contract.guarantees.forEach((guarantee, index) => {
      if (guarantee.amount < 0) {
        errors.push(`Guarantee ${index + 1} amount cannot be negative`);
      }
      if (
        guarantee.year < contract.startYear ||
        guarantee.year > contract.endYear
      ) {
        errors.push(
          `Guarantee ${index + 1} year must be within contract period`
        );
      }
    });

    return errors;
  }

  /**
   * Check if a contract is valid for a rookie
   */
  static isRookieContract(contract: Contract): boolean {
    return contract.endYear - contract.startYear + 1 === 4;
  }
}

export class RosterValidator {
  /**
   * Validate roster composition
   */
  static validateRoster(roster: any[], maxPlayers: number = 53): string[] {
    const errors: string[] = [];

    if (roster.length > maxPlayers) {
      errors.push(`Roster cannot exceed ${maxPlayers} players`);
    }

    // Add more roster validation logic here
    return errors;
  }

  /**
   * Check if a position is valid
   */
  static isValidPosition(position: string): position is Position {
    return ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(position);
  }
}

export class TradeValidator {
  /**
   * Validate trade structure
   */
  static validateTrade(trade: any): string[] {
    const errors: string[] = [];

    if (!trade.proposerAssets || !trade.responderAssets) {
      errors.push('Trade must have assets for both teams');
    }

    if (
      trade.proposerAssets.length === 0 &&
      trade.responderAssets.length === 0
    ) {
      errors.push('Trade must include at least one asset');
    }

    return errors;
  }

  /**
   * Calculate cap impact of a trade
   */
  static calculateTradeCapImpact(trade: any, contracts: Contract[]): any[] {
    // Implementation for calculating cap impacts of trades
    return [];
  }
}
