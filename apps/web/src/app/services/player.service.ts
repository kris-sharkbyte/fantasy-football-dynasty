import { Injectable, signal, computed, inject } from '@angular/core';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { EnhancedSportsPlayer, SportsPlayer } from '@fantasy-football-dynasty/types';
import { SportsDataService } from './sports-data.service';
import { LeagueService } from './league.service';

/**
 * Unified Player Service
 * 
 * Centralizes all player data fetching and management.
 * 
 * Key principles:
 * - sportsPlayerId: number (PlayerID from SportsPlayer) - used for sports data
 * - leaguePlayerId: string (Firestore doc ID) - used for league-specific player documents
 */
@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private readonly firestore = inject(Firestore);
  private readonly sportsDataService = inject(SportsDataService);
  private readonly leagueService = inject(LeagueService);

  // Cache for league players (keyed by leagueId)
  private _leaguePlayersCache = signal<Map<string, any[]>>(new Map());

  // Cache for players with contracts (keyed by leagueId)
  private _playersWithContractsCache = signal<Map<string, Set<string>>>(new Map());

  // Public readonly signals
  public leaguePlayersCache = this._leaguePlayersCache.asReadonly();
  public playersWithContractsCache = this._playersWithContractsCache.asReadonly();

  /**
   * Get available players for free agency (not on any team roster)
   */
  public async getAvailablePlayers(leagueId: string): Promise<EnhancedSportsPlayer[]> {
    try {
      // Wait for sports data to be loaded
      await this.sportsDataService.waitForData();

      // Get all active sports players
      const allSportsPlayers = this.sportsDataService.activePlayers();

      // Get all rostered players for this league
      const rosteredPlayerIds = await this.getRosteredPlayerIds(leagueId);

      // Filter out rostered players
      const availablePlayers = allSportsPlayers.filter(
        (player) => !rosteredPlayerIds.has(player.PlayerID)
      );

      // Enhance with league data if available
      const leaguePlayers = await this.getLeaguePlayers(leagueId);
      return this.enhancePlayersWithLeagueData(availablePlayers, leaguePlayers);
    } catch (error) {
      console.error('[Player Service] Error getting available players:', error);
      return [];
    }
  }

  /**
   * Get all league players from Firestore
   * Uses cache to avoid redundant queries
   */
  public async getLeaguePlayers(leagueId: string): Promise<any[]> {
    // Check cache first
    const cached = this._leaguePlayersCache().get(leagueId);
    if (cached) {
      return cached;
    }

    try {
      const playersCollection = collection(
        this.firestore,
        'leagues',
        leagueId,
        'players'
      );

      const querySnapshot = await getDocs(playersCollection);
      const players = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          leaguePlayerId: doc.id, // Firestore document ID
          ...data,
        };
      });

      // Update cache
      this._leaguePlayersCache.update((cache) => {
        const newCache = new Map(cache);
        newCache.set(leagueId, players);
        return newCache;
      });

      return players;
    } catch (error) {
      console.error('[Player Service] Error fetching league players:', error);
      return [];
    }
  }

  /**
   * Get a single player by sportsPlayerId, enhanced with league data if available
   */
  public async getPlayer(
    sportsPlayerId: number,
    leagueId?: string
  ): Promise<EnhancedSportsPlayer | null> {
    // Get sports player data
    const sportsPlayer = this.sportsDataService.getPlayerById(sportsPlayerId);
    if (!sportsPlayer) {
      return null;
    }

    // Enhance with league data if leagueId provided
    if (leagueId) {
      const leaguePlayers = await this.getLeaguePlayers(leagueId);
      const leaguePlayer = leaguePlayers.find(
        (lp) => lp.sportPlayerID === sportsPlayerId.toString() || 
                lp.playerId === sportsPlayerId.toString()
      );

      if (leaguePlayer) {
        return this.enhancePlayerWithLeagueData(sportsPlayer, leaguePlayer);
      }
    }

    return sportsPlayer;
  }

  /**
   * Get a player by leaguePlayerId (Firestore doc ID)
   */
  public async getPlayerByLeagueId(
    leaguePlayerId: string,
    leagueId: string
  ): Promise<EnhancedSportsPlayer | null> {
    // Get league player from Firestore
    const leaguePlayers = await this.getLeaguePlayers(leagueId);
    const leaguePlayer = leaguePlayers.find((lp) => lp.id === leaguePlayerId);

    if (!leaguePlayer) {
      return null;
    }

    // Get sports player ID
    const sportsPlayerId = parseInt(
      leaguePlayer.sportPlayerID || leaguePlayer.playerId || '0'
    );

    if (!sportsPlayerId || isNaN(sportsPlayerId)) {
      return null;
    }

    // Get sports player data
    const sportsPlayer = this.sportsDataService.getPlayerById(sportsPlayerId);
    if (!sportsPlayer) {
      return null;
    }

    // Enhance with league data
    return this.enhancePlayerWithLeagueData(sportsPlayer, leaguePlayer);
  }

  /**
   * Enhance a single player with league data
   */
  private enhancePlayerWithLeagueData(
    sportsPlayer: EnhancedSportsPlayer,
    leaguePlayer: any
  ): EnhancedSportsPlayer {
    return {
      ...sportsPlayer,
      ...leaguePlayer,
      // Preserve sports data fields
      PlayerID: sportsPlayer.PlayerID,
      FirstName: sportsPlayer.FirstName,
      LastName: sportsPlayer.LastName,
      Position: sportsPlayer.Position,
      Team: sportsPlayer.Team,
      // Override with league data where available
      overall: leaguePlayer.overall || sportsPlayer.overall,
      // Add league-specific identifier
      leaguePlayerId: leaguePlayer.id || leaguePlayer.leaguePlayerId,
    };
  }

  /**
   * Enhance multiple players with league data
   * Public method for use by components
   */
  public enhancePlayersWithLeagueData(
    sportsPlayers: EnhancedSportsPlayer[],
    leaguePlayers: any[]
  ): EnhancedSportsPlayer[] {
    // Create lookup map for league players by sportsPlayerId
    const leaguePlayersMap = new Map<number, any>();
    leaguePlayers.forEach((lp) => {
      const sportsPlayerId = parseInt(lp.sportPlayerID || lp.playerId || '0');
      if (sportsPlayerId && !isNaN(sportsPlayerId)) {
        leaguePlayersMap.set(sportsPlayerId, lp);
      }
    });

    // Enhance each sports player with league data
    return sportsPlayers.map((sportsPlayer) => {
      const leaguePlayer = leaguePlayersMap.get(sportsPlayer.PlayerID);
      if (leaguePlayer) {
        return this.enhancePlayerWithLeagueData(sportsPlayer, leaguePlayer);
      }
      return sportsPlayer;
    });
  }

  /**
   * Get all player IDs that are currently on team rosters
   */
  private async getRosteredPlayerIds(leagueId: string): Promise<Set<number>> {
    try {
      const leagueMembers = this.leagueService.leagueMembers();
      const rosteredIds = new Set<number>();

      leagueMembers.forEach((member) => {
        if (member.roster && member.roster.length > 0) {
          member.roster.forEach((rosterSlot) => {
            // rosterSlot.playerId could be string or number
            const playerId = typeof rosterSlot.playerId === 'string'
              ? parseInt(rosterSlot.playerId)
              : rosterSlot.playerId;

            if (playerId && !isNaN(playerId)) {
              rosteredIds.add(playerId);
            }
          });
        }
      });

      return rosteredIds;
    } catch (error) {
      console.error('[Player Service] Error getting rostered player IDs:', error);
      return new Set();
    }
  }

  /**
   * Get players with active contracts for a league
   * Uses cache to avoid redundant queries
   */
  public async getPlayersWithContracts(leagueId: string): Promise<Set<string>> {
    // Check cache first
    const cached = this._playersWithContractsCache().get(leagueId);
    if (cached) {
      return cached;
    }

    try {
      const contractsRef = collection(this.firestore, 'contracts');
      const q = query(
        contractsRef,
        where('leagueId', '==', leagueId),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(q);
      const playerIds = new Set<string>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Check both leaguePlayerId (preferred) and playerId (fallback)
        const leaguePlayerId = String(data['leaguePlayerId'] || '');
        const playerId = String(data['playerId'] || '');
        
        // Add leaguePlayerId if available (preferred)
        if (leaguePlayerId) {
          playerIds.add(leaguePlayerId);
        }
        // Also add playerId for backward compatibility (if different from leaguePlayerId)
        // Note: playerId in contracts should now be leaguePlayerId, but we check both
        if (playerId && playerId !== leaguePlayerId) {
          playerIds.add(playerId);
        }
      });

      // Update cache
      this._playersWithContractsCache.update((cache) => {
        const newCache = new Map(cache);
        newCache.set(leagueId, playerIds);
        return newCache;
      });

      return playerIds;
    } catch (error) {
      console.error('[Player Service] Error loading contracts:', error);
      return new Set();
    }
  }

  /**
   * Check if a player has an active contract
   * Checks both leaguePlayerId and sportsPlayerId for compatibility
   */
  public async hasActiveContract(
    sportsPlayerId: number,
    leagueId: string
  ): Promise<boolean> {
    const playersWithContracts = await this.getPlayersWithContracts(leagueId);
    
    // Check by sportsPlayerId (for backward compatibility)
    if (playersWithContracts.has(sportsPlayerId.toString())) {
      return true;
    }

    // Also check by leaguePlayerId
    const leaguePlayerId = await this.getLeaguePlayerId(sportsPlayerId, leagueId);
    if (leaguePlayerId && playersWithContracts.has(leaguePlayerId)) {
      return true;
    }

    return false;
  }

  /**
   * Get league player ID (Firestore doc ID) for a sports player
   */
  public async getLeaguePlayerId(
    sportsPlayerId: number,
    leagueId: string
  ): Promise<string | null> {
    const leaguePlayers = await this.getLeaguePlayers(leagueId);
    const leaguePlayer = leaguePlayers.find(
      (lp) => lp.sportPlayerID === sportsPlayerId.toString() ||
              lp.playerId === sportsPlayerId.toString()
    );

    return leaguePlayer?.id || leaguePlayer?.leaguePlayerId || null;
  }

  /**
   * Get contract information for a player (including teamId)
   * Returns null if player has no active contract
   */
  public async getPlayerContract(
    sportsPlayerId: number,
    leagueId: string
  ): Promise<{ teamId: string; contractId: string } | null> {
    try {
      // Get leaguePlayerId first
      const leaguePlayerId = await this.getLeaguePlayerId(sportsPlayerId, leagueId);
      
      // Query contracts collection - try leaguePlayerId first, then fallback to playerId
      const contractsRef = collection(this.firestore, 'contracts');
      
      let q;
      if (leaguePlayerId) {
        // Try with leaguePlayerId first (preferred)
        q = query(
          contractsRef,
          where('leagueId', '==', leagueId),
          where('leaguePlayerId', '==', leaguePlayerId),
          where('status', '==', 'active')
        );
      } else {
        // Fallback to playerId (for backward compatibility)
        q = query(
          contractsRef,
          where('leagueId', '==', leagueId),
          where('playerId', '==', sportsPlayerId.toString()),
          where('status', '==', 'active')
        );
      }

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // If no contract found with leaguePlayerId and we have one, try playerId as fallback
        if (leaguePlayerId) {
          const fallbackQ = query(
            contractsRef,
            where('leagueId', '==', leagueId),
            where('playerId', '==', sportsPlayerId.toString()),
            where('status', '==', 'active')
          );
          const fallbackSnapshot = await getDocs(fallbackQ);
          
          if (!fallbackSnapshot.empty) {
            const contractDoc = fallbackSnapshot.docs[0];
            const contractData = contractDoc.data();
            return {
              teamId: contractData['teamId'],
              contractId: contractDoc.id,
            };
          }
        }
        
        return null;
      }

      // Get the first active contract (should only be one)
      const contractDoc = snapshot.docs[0];
      const contractData = contractDoc.data();

      return {
        teamId: contractData['teamId'],
        contractId: contractDoc.id,
      };
    } catch (error) {
      console.error('[Player Service] Error getting player contract:', error);
      return null;
    }
  }

  /**
   * Clear cache for a specific league (useful after roster changes)
   */
  public clearLeagueCache(leagueId: string): void {
    this._leaguePlayersCache.update((cache) => {
      const newCache = new Map(cache);
      newCache.delete(leagueId);
      return newCache;
    });

    this._playersWithContractsCache.update((cache) => {
      const newCache = new Map(cache);
      newCache.delete(leagueId);
      return newCache;
    });
  }

  /**
   * Clear all caches
   */
  public clearAllCaches(): void {
    this._leaguePlayersCache.set(new Map());
    this._playersWithContractsCache.set(new Map());
  }
}
