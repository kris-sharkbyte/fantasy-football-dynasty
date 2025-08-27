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

  /**
   * Check if a team can afford a contract by year, considering all existing contracts
   */
  static canAffordContractByYear(
    team: Team,
    newContract: Contract,
    existingContracts: Contract[],
    year: number,
    salaryCap: number
  ): {
    canAfford: boolean;
    currentCapHit: number;
    newCapHit: number;
    remainingCap: number;
  } {
    // Calculate current cap hit for the year
    const currentCapHit = existingContracts
      .filter(
        (contract) => year >= contract.startYear && year <= contract.endYear
      )
      .reduce(
        (total, contract) => total + this.calculateCapHit(contract, year),
        0
      );

    // Calculate new contract cap hit for the year
    const newCapHit = this.calculateCapHit(newContract, year);

    // Calculate total cap hit if contract is added
    const totalCapHit = currentCapHit + newCapHit;

    // Check if team can afford it
    const canAfford = totalCapHit <= salaryCap;
    const remainingCap = salaryCap - totalCapHit;

    return {
      canAfford,
      currentCapHit,
      newCapHit,
      remainingCap,
    };
  }

  /**
   * Calculate total cap hit for a team in a specific year
   */
  static calculateTeamCapHit(
    team: Team,
    contracts: Contract[],
    year: number
  ): number {
    return contracts
      .filter(
        (contract) => year >= contract.startYear && year <= contract.endYear
      )
      .reduce(
        (total, contract) => total + this.calculateCapHit(contract, year),
        0
      );
  }
}

export class ContractMinimumCalculator {
  /**
   * Calculate minimum contract value based on player tier, age, and position
   * Based on PLAYER_CONTRACT.md specifications
   */
  static calculateMinimumContract(
    playerTier: 'elite' | 'starter' | 'depth',
    playerAge: number,
    playerPosition: Position,
    salaryCap: number
  ): number {
    const tierBase = this.getTierBase(playerTier);
    const ageModifier = this.getAgeModifier(playerAge);
    const positionModifier = this.getPositionModifier(playerPosition);

    const minimumPercentage = tierBase * ageModifier * positionModifier;
    return Math.round(salaryCap * minimumPercentage);
  }

  /**
   * Calculate rookie scale minimum based on draft round
   */
  static calculateRookieMinimum(draftRound: number, salaryCap: number): number {
    const roundPercentages: Record<number, number> = {
      1: draftRound <= 8 ? 0.08 : draftRound <= 16 ? 0.07 : 0.06,
      2: 0.04,
      3: 0.03,
      4: 0.025,
      5: 0.02,
      6: 0.015,
      7: 0.01,
    };

    const percentage = roundPercentages[draftRound] || 0.005; // UDFA default
    return Math.round(salaryCap * percentage);
  }

  /**
   * Get tier base percentage
   */
  private static getTierBase(tier: 'elite' | 'starter' | 'depth'): number {
    switch (tier) {
      case 'elite':
        return 0.2;
      case 'starter':
        return 0.1;
      case 'depth':
        return 0.03;
      default:
        return 0.1;
    }
  }

  /**
   * Get age modifier
   */
  private static getAgeModifier(age: number): number {
    if (age < 24) return 0.8;
    if (age >= 24 && age <= 29) return 1.0;
    if (age >= 30 && age <= 33) return 0.7;
    return 0.5; // 34+
  }

  /**
   * Get position modifier
   */
  private static getPositionModifier(position: Position): number {
    switch (position) {
      case 'QB':
        return 1.0;
      case 'RB':
      case 'WR':
        return 0.8;
      case 'TE':
        return 0.6;
      case 'K':
        return 0.2;
      case 'DEF':
        return 0.5; // Defense gets a moderate modifier
      default:
        return 0.5;
    }
  }

  /**
   * Determine player tier based on overall rating and experience
   * This is a simplified heuristic - can be enhanced with more sophisticated logic
   */
  static determinePlayerTier(
    overall: number,
    yearsExp: number,
    position: Position
  ): 'elite' | 'starter' | 'depth' {
    // Elite: High overall rating or proven veterans
    if (overall >= 85 || (yearsExp >= 3 && overall >= 80)) {
      return 'elite';
    }

    // Starter: Solid overall rating or young players with potential
    if (overall >= 75 || (yearsExp <= 2 && overall >= 70)) {
      return 'starter';
    }

    // Depth: Lower overall rating or inexperienced players
    return 'depth';
  }

  /**
   * Validate if a contract meets minimum requirements
   */
  static validateContractMinimum(
    contract: Contract,
    player: {
      age: number;
      position: Position;
      overall: number;
      yearsExp: number;
    },
    salaryCap: number,
    isRookie: boolean = false,
    draftRound?: number
  ): {
    isValid: boolean;
    minimumRequired: number;
    currentValue: number;
    message: string;
  } {
    let minimumRequired: number;

    if (isRookie && draftRound) {
      minimumRequired = this.calculateRookieMinimum(draftRound, salaryCap);
    } else {
      const tier = this.determinePlayerTier(
        player.overall,
        player.yearsExp,
        player.position
      );
      minimumRequired = this.calculateMinimumContract(
        tier,
        player.age,
        player.position,
        salaryCap
      );
    }

    const currentValue = this.calculateContractValue(contract);
    const isValid = currentValue >= minimumRequired;

    let message = '';
    if (!isValid) {
      if (isRookie) {
        message = `Rookie contract must be at least $${(
          minimumRequired / 1000000
        ).toFixed(1)}M (Round ${draftRound} minimum)`;
      } else {
        const tier = this.determinePlayerTier(
          player.overall,
          player.yearsExp,
          player.position
        );
        message = `${tier.charAt(0).toUpperCase() + tier.slice(1)} ${
          player.position
        } age ${player.age} minimum: $${(minimumRequired / 1000000).toFixed(
          1
        )}M`;
      }
    }

    return { isValid, minimumRequired, currentValue, message };
  }

  /**
   * Calculate total contract value
   */
  private static calculateContractValue(contract: Contract): number {
    const baseSalaryTotal = Object.values(contract.baseSalary).reduce(
      (sum, salary) => sum + salary,
      0
    );
    return baseSalaryTotal + contract.signingBonus;
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
