import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NumberFormatService {
  /**
   * Format a number as currency with K/M notation
   * Examples: 1500000 -> "1.5M", 750000 -> "750K", 2500 -> "2.5K"
   */
  formatCurrency(value: number, decimals: number = 1): string {
    if (value === 0) return '$0';

    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(decimals)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(decimals)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  }

  /**
   * Format a number as currency for input display (shorter format)
   * Examples: 1500000 -> "1.5M", 750000 -> "750K"
   */
  formatCurrencyShort(value: number): string {
    if (value === 0) return '';

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    } else {
      return value.toString();
    }
  }

  /**
   * Parse a formatted currency string back to a number
   * Examples: "1.5M" -> 1500000, "750K" -> 750000, "2.5K" -> 2500
   */
  parseCurrency(formattedValue: string): number {
    if (!formattedValue || formattedValue.trim() === '') return 0;

    const cleanValue = formattedValue.trim().toUpperCase();

    if (cleanValue.endsWith('M')) {
      const numberPart = parseFloat(cleanValue.slice(0, -1));
      return isNaN(numberPart) ? 0 : numberPart * 1000000;
    } else if (cleanValue.endsWith('K')) {
      const numberPart = parseFloat(cleanValue.slice(0, -1));
      return isNaN(numberPart) ? 0 : numberPart * 1000;
    } else {
      const numberPart = parseFloat(cleanValue);
      return isNaN(numberPart) ? 0 : numberPart;
    }
  }

  /**
   * Format a percentage value
   * Examples: 0.75 -> "75%", 0.125 -> "12.5%"
   */
  formatPercentage(value: number, decimals: number = 0): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * Parse a percentage string back to a decimal
   * Examples: "75%" -> 0.75, "12.5%" -> 0.125
   */
  parsePercentage(formattedValue: string): number {
    if (!formattedValue || formattedValue.trim() === '') return 0;

    const cleanValue = formattedValue.trim();
    if (cleanValue.endsWith('%')) {
      const numberPart = parseFloat(cleanValue.slice(0, -1));
      return isNaN(numberPart) ? 0 : numberPart / 100;
    } else {
      const numberPart = parseFloat(cleanValue);
      return isNaN(numberPart) ? 0 : numberPart / 100;
    }
  }

  /**
   * Format a number with appropriate suffix for display
   * Examples: 1500000 -> "1.5M", 750000 -> "750K", 2500 -> "2.5K"
   */
  formatNumber(value: number, decimals: number = 1): string {
    if (value === 0) return '0';

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(decimals)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(decimals)}K`;
    } else {
      return value.toFixed(0);
    }
  }

  /**
   * Parse a formatted number string back to a number
   * Examples: "1.5M" -> 1500000, "750K" -> 750000, "2.5K" -> 2500
   */
  parseNumber(formattedValue: string): number {
    if (!formattedValue || formattedValue.trim() === '') return 0;

    const cleanValue = formattedValue.trim().toUpperCase();

    if (cleanValue.endsWith('M')) {
      const numberPart = parseFloat(cleanValue.slice(0, -1));
      return isNaN(numberPart) ? 0 : numberPart * 1000000;
    } else if (cleanValue.endsWith('K')) {
      const numberPart = parseFloat(cleanValue.slice(0, -1));
      return isNaN(numberPart) ? 0 : numberPart * 1000;
    } else {
      const numberPart = parseFloat(cleanValue);
      return isNaN(numberPart) ? 0 : numberPart;
    }
  }
}
