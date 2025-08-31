import { describe, it, expect } from 'vitest';
import { calculateLocationMatchScore } from './enhanced-player';
import { EnhancedPlayer, TeamLocation, LocationPreference } from './enhanced-player';

describe('Location Preference System', () => {
  const mockTeamLocation: TeamLocation = {
    teamId: 'team1',
    city: 'Buffalo',
    state: 'NY',
    timezone: 'EST',
    marketSize: 'small',
    climate: 'cold',
    stadiumName: 'Highmark Stadium',
    stadiumCapacity: 71608,
    isContender: false,
    isStable: true,
    taxRate: 0.0685,
  };

  const mockWarmWeatherTeam: TeamLocation = {
    ...mockTeamLocation,
    city: 'Miami',
    state: 'FL',
    climate: 'warm',
    marketSize: 'medium',
    taxRate: 0,
  };

  const mockBigMarketTeam: TeamLocation = {
    ...mockTeamLocation,
    city: 'New York',
    state: 'NY',
    climate: 'temperate',
    marketSize: 'large',
    taxRate: 0.0685,
  };

  const mockTaxFreeTeam: TeamLocation = {
    ...mockTeamLocation,
    city: 'Dallas',
    state: 'TX',
    climate: 'warm',
    marketSize: 'large',
    taxRate: 0,
  };

  describe('Climate Preferences', () => {
    it('should give high score to cold weather players on cold weather teams', () => {
      const coldWeatherPlayer: EnhancedPlayer = {
        id: 'player1',
        name: 'Cold Weather Player',
        position: 'QB',
        age: 25,
        overall: 85,
        yearsExp: 3,
        nflTeam: 'FA',
        devGrade: 'B',
        traits: { speed: 0, strength: 0, agility: 0, awareness: 0, injury: 0, schemeFit: [] },
        stats: [],
        personality: {} as any,
        locationPreferences: [
          {
            type: 'cold_weather',
            weight: 1.0,
            cities: [],
            states: [],
            climates: ['cold'],
            marketSizes: [],
            currentTeamMatch: false,
            taxSensitivity: 0,
          },
        ],
        currentTeamId: undefined,
        previousTeamIds: [],
        contractHistory: [],
        negotiationHistory: [],
        marketExperiences: [],
        lifeEvents: [],
      };

      const coldTeamScore = calculateLocationMatchScore(coldWeatherPlayer, mockTeamLocation);
      const warmTeamScore = calculateLocationMatchScore(coldWeatherPlayer, mockWarmWeatherTeam);

      expect(coldTeamScore).toBeGreaterThan(warmTeamScore);
      expect(coldTeamScore).toBeGreaterThan(0.8);
      expect(warmTeamScore).toBeLessThan(0.3);
    });

    it('should give high score to warm weather players on warm weather teams', () => {
      const warmWeatherPlayer: EnhancedPlayer = {
        id: 'player2',
        name: 'Warm Weather Player',
        position: 'WR',
        age: 24,
        overall: 82,
        yearsExp: 2,
        nflTeam: 'FA',
        devGrade: 'B',
        traits: { speed: 0, strength: 0, agility: 0, awareness: 0, injury: 0, schemeFit: [] },
        stats: [],
        personality: {} as any,
        locationPreferences: [
          {
            type: 'warm_weather',
            weight: 1.0,
            cities: [],
            states: [],
            climates: ['warm'],
            marketSizes: [],
            currentTeamMatch: false,
            taxSensitivity: 0,
          },
        ],
        currentTeamId: undefined,
        previousTeamIds: [],
        contractHistory: [],
        negotiationHistory: [],
        marketExperiences: [],
        lifeEvents: [],
      };

      const warmTeamScore = calculateLocationMatchScore(warmWeatherPlayer, mockWarmWeatherTeam);
      const coldTeamScore = calculateLocationMatchScore(warmWeatherPlayer, mockTeamLocation);

      expect(warmTeamScore).toBeGreaterThan(coldTeamScore);
      expect(warmTeamScore).toBeGreaterThan(0.8);
      expect(coldTeamScore).toBeLessThan(0.3);
    });
  });

  describe('Market Size Preferences', () => {
    it('should give high score to big market players on big market teams', () => {
      const bigMarketPlayer: EnhancedPlayer = {
        id: 'player3',
        name: 'Big Market Player',
        position: 'QB',
        age: 26,
        overall: 88,
        yearsExp: 4,
        nflTeam: 'FA',
        devGrade: 'A',
        traits: { speed: 0, strength: 0, agility: 0, awareness: 0, injury: 0, schemeFit: [] },
        stats: [],
        personality: {} as any,
        locationPreferences: [
          {
            type: 'big_markets',
            weight: 1.0,
            cities: [],
            states: [],
            climates: [],
            marketSizes: ['large'],
            currentTeamMatch: false,
            taxSensitivity: 0,
          },
        ],
        currentTeamId: undefined,
        previousTeamIds: [],
        contractHistory: [],
        negotiationHistory: [],
        marketExperiences: [],
        lifeEvents: [],
      };

      const bigMarketScore = calculateLocationMatchScore(bigMarketPlayer, mockBigMarketTeam);
      const smallMarketScore = calculateLocationMatchScore(bigMarketPlayer, mockTeamLocation);

      expect(bigMarketScore).toBeGreaterThan(smallMarketScore);
      expect(bigMarketScore).toBeGreaterThan(0.8);
      expect(smallMarketScore).toBeLessThan(0.3);
    });

    it('should give partial score for medium market teams', () => {
      const bigMarketPlayer: EnhancedPlayer = {
        id: 'player4',
        name: 'Big Market Player 2',
        position: 'WR',
        age: 25,
        overall: 84,
        yearsExp: 3,
        nflTeam: 'FA',
        devGrade: 'B',
        traits: { speed: 0, strength: 0, agility: 0, awareness: 0, injury: 0, schemeFit: [] },
        stats: [],
        personality: {} as any,
        locationPreferences: [
          {
            type: 'big_markets',
            weight: 1.0,
            cities: [],
            states: [],
            climates: [],
            marketSizes: ['large'],
            currentTeamMatch: false,
            taxSensitivity: 0,
          },
        ],
        currentTeamId: undefined,
        previousTeamIds: [],
        contractHistory: [],
        negotiationHistory: [],
        marketExperiences: [],
        lifeEvents: [],
      };

      const mediumMarketScore = calculateLocationMatchScore(bigMarketPlayer, mockWarmWeatherTeam);

      expect(mediumMarketScore).toBeGreaterThan(0.6);
      expect(mediumMarketScore).toBeLessThan(0.9);
    });
  });

  describe('Tax Sensitivity', () => {
    it('should penalize high tax rates for tax-sensitive players', () => {
      const taxSensitivePlayer: EnhancedPlayer = {
        id: 'player5',
        name: 'Tax Sensitive Player',
        position: 'QB',
        age: 27,
        overall: 86,
        yearsExp: 5,
        nflTeam: 'FA',
        devGrade: 'A',
        traits: { speed: 0, strength: 0, agility: 0, awareness: 0, injury: 0, schemeFit: [] },
        stats: [],
        personality: {} as any,
        locationPreferences: [
          {
            type: 'tax_conscious',
            weight: 1.0,
            cities: [],
            states: [],
            climates: [],
            marketSizes: [],
            currentTeamMatch: false,
            taxSensitivity: 0.8,
          },
        ],
        currentTeamId: undefined,
        previousTeamIds: [],
        contractHistory: [],
        negotiationHistory: [],
        marketExperiences: [],
        lifeEvents: [],
      };

      const highTaxScore = calculateLocationMatchScore(taxSensitivePlayer, mockTeamLocation);
      const noTaxScore = calculateLocationMatchScore(taxSensitivePlayer, mockTaxFreeTeam);

      expect(noTaxScore).toBeGreaterThan(highTaxScore);
      expect(noTaxScore).toBeGreaterThan(0.8);
      expect(highTaxScore).toBeLessThan(0.6);
    });

    it('should not affect tax-insensitive players', () => {
      const taxInsensitivePlayer: EnhancedPlayer = {
        id: 'player6',
        name: 'Tax Insensitive Player',
        position: 'RB',
        age: 23,
        overall: 83,
        yearsExp: 1,
        nflTeam: 'FA',
        devGrade: 'B',
        traits: { speed: 0, strength: 0, agility: 0, awareness: 0, injury: 0, schemeFit: [] },
        stats: [],
        personality: {} as any,
        locationPreferences: [
          {
            type: 'neutral',
            weight: 1.0,
            cities: [],
            states: [],
            climates: [],
            marketSizes: [],
            currentTeamMatch: false,
            taxSensitivity: 0,
          },
        ],
        currentTeamId: undefined,
        previousTeamIds: [],
        contractHistory: [],
        negotiationHistory: [],
        marketExperiences: [],
        lifeEvents: [],
      };

      const highTaxScore = calculateLocationMatchScore(taxInsensitivePlayer, mockTeamLocation);
      const noTaxScore = calculateLocationMatchScore(taxInsensitivePlayer, mockTaxFreeTeam);

      // Scores should be similar for tax-insensitive players
      expect(Math.abs(highTaxScore - noTaxScore)).toBeLessThan(0.1);
    });
  });

  describe('Multiple Preference Types', () => {
    it('should combine multiple preference types correctly', () => {
      const multiPreferencePlayer: EnhancedPlayer = {
        id: 'player7',
        name: 'Multi Preference Player',
        position: 'TE',
        age: 26,
        overall: 85,
        yearsExp: 4,
        nflTeam: 'FA',
        devGrade: 'B',
        traits: { speed: 0, strength: 0, agility: 0, awareness: 0, injury: 0, schemeFit: [] },
        stats: [],
        personality: {} as any,
        locationPreferences: [
          {
            type: 'warm_weather',
            weight: 0.6,
            cities: [],
            states: [],
            climates: ['warm'],
            marketSizes: [],
            currentTeamMatch: false,
            taxSensitivity: 0,
          },
          {
            type: 'big_markets',
            weight: 0.4,
            cities: [],
            states: [],
            climates: [],
            marketSizes: ['large'],
            currentTeamMatch: false,
            taxSensitivity: 0.3,
          },
        ],
        currentTeamId: undefined,
        previousTeamIds: [],
        contractHistory: [],
        negotiationHistory: [],
        marketExperiences: [],
        lifeEvents: [],
      };

      // Perfect match: warm weather + big market + low tax
      const perfectMatchScore = calculateLocationMatchScore(multiPreferencePlayer, mockTaxFreeTeam);
      
      // Good match: warm weather + medium market + no tax
      const goodMatchScore = calculateLocationMatchScore(multiPreferencePlayer, mockWarmWeatherTeam);
      
      // Poor match: cold weather + small market + high tax
      const poorMatchScore = calculateLocationMatchScore(multiPreferencePlayer, mockTeamLocation);

      expect(perfectMatchScore).toBeGreaterThan(goodMatchScore);
      expect(goodMatchScore).toBeGreaterThan(poorMatchScore);
      expect(perfectMatchScore).toBeGreaterThan(0.8);
      expect(poorMatchScore).toBeLessThan(0.4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle players with no location preferences', () => {
      const noPreferencePlayer: EnhancedPlayer = {
        id: 'player8',
        name: 'No Preference Player',
        position: 'K',
        age: 29,
        overall: 78,
        yearsExp: 7,
        nflTeam: 'FA',
        devGrade: 'C',
        traits: { speed: 0, strength: 0, agility: 0, awareness: 0, injury: 0, schemeFit: [] },
        stats: [],
        personality: {} as any,
        locationPreferences: [],
        currentTeamId: undefined,
        previousTeamIds: [],
        contractHistory: [],
        negotiationHistory: [],
        marketExperiences: [],
        lifeEvents: [],
      };

      const score = calculateLocationMatchScore(noPreferencePlayer, mockTeamLocation);
      expect(score).toBe(0.5); // Neutral score for no preferences
    });

    it('should handle players with zero weight preferences', () => {
      const zeroWeightPlayer: EnhancedPlayer = {
        id: 'player9',
        name: 'Zero Weight Player',
        position: 'DL',
        age: 24,
        overall: 80,
        yearsExp: 2,
        nflTeam: 'FA',
        devGrade: 'B',
        traits: { speed: 0, strength: 0, agility: 0, awareness: 0, injury: 0, schemeFit: [] },
        stats: [],
        personality: {} as any,
        locationPreferences: [
          {
            type: 'cold_weather',
            weight: 0,
            cities: [],
            states: [],
            climates: ['cold'],
            marketSizes: [],
            currentTeamMatch: false,
            taxSensitivity: 0,
          },
        ],
        currentTeamId: undefined,
        previousTeamIds: [],
        contractHistory: [],
        negotiationHistory: [],
        marketExperiences: [],
        lifeEvents: [],
      };

      const score = calculateLocationMatchScore(zeroWeightPlayer, mockTeamLocation);
      expect(score).toBe(0.5); // Neutral score for zero weight preferences
    });
  });
});
