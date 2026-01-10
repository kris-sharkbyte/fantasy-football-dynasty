import { Injectable, signal, computed, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  Timestamp,
  writeBatch,
} from '@angular/fire/firestore';
import { CapLedger } from '@fantasy-football-dynasty/types';
import { CapMath } from '@fantasy-football-dynasty/domain';
import { Contract } from '@fantasy-football-dynasty/types';

export interface FirestoreCapLedger extends Omit<CapLedger, 'createdAt'> {
  createdAt: Timestamp;
}

@Injectable({
  providedIn: 'root',
})
export class CapLedgerService {
  private readonly db = inject(Firestore);

  /**
   * Create a cap ledger entry for dead money from a cut/release
   */
  async createDeadMoneyEntry(
    leagueId: string,
    teamId: string,
    contract: Contract,
    cutYear: number,
    preJune1: boolean = false,
    reason: string = 'Player released'
  ): Promise<string> {
    try {
      const deadMoney = CapMath.calculateDeadMoney(contract, cutYear, preJune1);

      // Create entries for current year and next year if applicable
      const batch = writeBatch(this.db);
      const entries: string[] = [];

      // Current year dead money
      if (deadMoney.currentYear > 0) {
        const currentYearEntry = doc(collection(this.db, 'capLedger'));
        batch.set(currentYearEntry, {
          teamId,
          leagueId,
          leagueYear: cutYear,
          capIn: 0,
          capOut: deadMoney.currentYear,
          reason: `${reason} - Dead Money (Current Year)`,
          refType: 'cut' as const,
          refId: contract.id,
          createdAt: Timestamp.now(),
        });
        entries.push(currentYearEntry.id);
      }

      // Next year dead money (post-June 1 cuts)
      if (deadMoney.nextYear > 0) {
        const nextYearEntry = doc(collection(this.db, 'capLedger'));
        batch.set(nextYearEntry, {
          teamId,
          leagueId,
          leagueYear: cutYear + 1,
          capIn: 0,
          capOut: deadMoney.nextYear,
          reason: `${reason} - Dead Money (Next Year)`,
          refType: 'cut' as const,
          refId: contract.id,
          createdAt: Timestamp.now(),
        });
        entries.push(nextYearEntry.id);
      }

      await batch.commit();
      return entries[0] || ''; // Return first entry ID
    } catch (error) {
      console.error('[Cap Ledger Service] Error creating dead money entry:', error);
      throw error;
    }
  }

  /**
   * Create a cap ledger entry for a trade
   */
  async createTradeDeadMoneyEntry(
    leagueId: string,
    teamId: string,
    contract: Contract,
    tradeYear: number,
    preJune1: boolean = false,
    tradeId: string
  ): Promise<string> {
    try {
      const deadMoney = CapMath.calculateDeadMoney(contract, tradeYear, preJune1);

      const batch = writeBatch(this.db);
      const entries: string[] = [];

      // Current year dead money
      if (deadMoney.currentYear > 0) {
        const currentYearEntry = doc(collection(this.db, 'capLedger'));
        batch.set(currentYearEntry, {
          teamId,
          leagueId,
          leagueYear: tradeYear,
          capIn: 0,
          capOut: deadMoney.currentYear,
          reason: `Player traded - Dead Money (Current Year)`,
          refType: 'trade' as const,
          refId: tradeId,
          createdAt: Timestamp.now(),
        });
        entries.push(currentYearEntry.id);
      }

      // Next year dead money
      if (deadMoney.nextYear > 0) {
        const nextYearEntry = doc(collection(this.db, 'capLedger'));
        batch.set(nextYearEntry, {
          teamId,
          leagueId,
          leagueYear: tradeYear + 1,
          capIn: 0,
          capOut: deadMoney.nextYear,
          reason: `Player traded - Dead Money (Next Year)`,
          refType: 'trade' as const,
          refId: tradeId,
          createdAt: Timestamp.now(),
        });
        entries.push(nextYearEntry.id);
      }

      await batch.commit();
      return entries[0] || '';
    } catch (error) {
      console.error('[Cap Ledger Service] Error creating trade dead money entry:', error);
      throw error;
    }
  }

  /**
   * Get all cap ledger entries for a team in a specific year
   */
  async getTeamCapLedger(
    leagueId: string,
    teamId: string,
    year: number
  ): Promise<CapLedger[]> {
    try {
      const ledgerRef = collection(this.db, 'capLedger');
      const q = query(
        ledgerRef,
        where('leagueId', '==', leagueId),
        where('teamId', '==', teamId),
        where('leagueYear', '==', year),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const entries: CapLedger[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as FirestoreCapLedger;
        entries.push({
          id: doc.id,
          leagueId: data.leagueId,
          teamId: data.teamId,
          leagueYear: data.leagueYear,
          capIn: data.capIn,
          capOut: data.capOut,
          reason: data.reason,
          refType: data.refType,
          refId: data.refId,
          createdAt: data.createdAt.toDate(),
        });
      });

      return entries;
    } catch (error) {
      console.error('[Cap Ledger Service] Error getting team cap ledger:', error);
      return [];
    }
  }

  /**
   * Get total dead money for a team in a specific year
   */
  async getTeamDeadMoney(
    leagueId: string,
    teamId: string,
    year: number
  ): Promise<number> {
    try {
      const entries = await this.getTeamCapLedger(leagueId, teamId, year);
      return entries.reduce((total, entry) => total + entry.capOut, 0);
    } catch (error) {
      console.error('[Cap Ledger Service] Error getting team dead money:', error);
      return 0;
    }
  }

  /**
   * Get all years with cap ledger entries for a team
   */
  async getTeamCapLedgerYears(
    leagueId: string,
    teamId: string
  ): Promise<number[]> {
    try {
      const ledgerRef = collection(this.db, 'capLedger');
      const q = query(
        ledgerRef,
        where('leagueId', '==', leagueId),
        where('teamId', '==', teamId),
        orderBy('leagueYear', 'desc')
      );

      const snapshot = await getDocs(q);
      const years = new Set<number>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        years.add(data['leagueYear']);
      });

      return Array.from(years).sort((a, b) => b - a);
    } catch (error) {
      console.error('[Cap Ledger Service] Error getting cap ledger years:', error);
      return [];
    }
  }
}
