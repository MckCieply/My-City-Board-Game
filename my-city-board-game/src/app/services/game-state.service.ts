import { Injectable, signal } from '@angular/core';
import { Buildings } from '../models/buildings.model';
import { GameConfig } from '../models/game-config.model';

/**
 * Service responsible for managing game state
 */
@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  // Round tracking
  private _currentRound = signal<number>(0);
  private _gameComplete = signal<boolean>(false);
  private _inPreparationPhase = signal<boolean>(true);

  // Scoring
  private _footerScores = signal<number[]>([]);

  // Bonus stage tracking
  private _inBonusStage = signal<boolean>(false);
  private _usedBonusBuildings = signal<Set<Buildings>>(new Set());
  private _bonusStageBuildings = signal<Map<number, Buildings>>(new Map());

  // Turn tracking
  private _currentTurnPlacements = signal<Set<string>>(new Set());
  private _firstTurnPlaced = signal<boolean>(false);
  private _secondTurnPlaced = signal<boolean>(false);
  
  // Row selection for scoring (when dice sum is 2 or 12)
  private _selectedScoringRow = signal<number | null>(null);

  // Expose readonly signals directly
  readonly currentRound = this._currentRound.asReadonly();
  readonly gameComplete = this._gameComplete.asReadonly();
  readonly inPreparationPhase = this._inPreparationPhase.asReadonly();
  readonly footerScores = this._footerScores.asReadonly();
  readonly inBonusStage = this._inBonusStage.asReadonly();
  readonly usedBonusBuildings = this._usedBonusBuildings.asReadonly();
  readonly bonusStageBuildings = this._bonusStageBuildings.asReadonly();
  readonly currentTurnPlacements = this._currentTurnPlacements.asReadonly();
  readonly firstTurnPlaced = this._firstTurnPlaced.asReadonly();
  readonly secondTurnPlaced = this._secondTurnPlaced.asReadonly();
  readonly selectedScoringRow = this._selectedScoringRow.asReadonly();
  
  setSelectedScoringRow(row: number | null): void {
    this._selectedScoringRow.set(row);
  }

  /**
   * Initialize game state with configuration
   */
  initializeGame(config: GameConfig): void {
    this._currentRound.set(0);
    this._gameComplete.set(false);
    this._inPreparationPhase.set(true);
    this._footerScores.set(Array(config.maxRounds).fill(0));
    this._inBonusStage.set(false);
    this._usedBonusBuildings.set(new Set());
    this._bonusStageBuildings.set(new Map());
    this._currentTurnPlacements.set(new Set());
    this._firstTurnPlaced.set(false);
    this._secondTurnPlaced.set(false);
  }

  /**
   * Advance to the next round
   */
  advanceRound(maxRounds: number): void {
    const nextRound = this._currentRound() + 1;
    if (nextRound <= maxRounds) {
      this._currentRound.set(nextRound);
    } else {
      this._gameComplete.set(true);
    }
  }

  /**
   * Set score for a specific round
   */
  setRoundScore(roundIndex: number, score: number): void {
    const scores = [...this._footerScores()];
    if (roundIndex >= 0 && roundIndex < scores.length) {
      scores[roundIndex] = score;
      this._footerScores.set(scores);
    }
  }

  /**
   * Get total score across all rounds
   */
  getTotalScore(): number {
    return this._footerScores().reduce((sum, score) => sum + score, 0);
  }

  /**
   * Exit preparation phase and start round 1
   */
  exitPreparationPhase(): void {
    this._inPreparationPhase.set(false);
    this._currentRound.set(1);
  }

  /**
   * Start bonus stage
   */
  startBonusStage(): void {
    this._inBonusStage.set(true);
  }

  /**
   * Complete bonus stage and record the building used
   */
  completeBonusStage(placedBuilding: Buildings): void {
    // Mark building as used
    const used = new Set(this._usedBonusBuildings());
    used.add(placedBuilding);
    this._usedBonusBuildings.set(used);

    // Track building by current round
    const roundBuildings = new Map(this._bonusStageBuildings());
    roundBuildings.set(this._currentRound(), placedBuilding);
    this._bonusStageBuildings.set(roundBuildings);

    // Exit bonus stage
    this._inBonusStage.set(false);
  }

  /**
   * Get available buildings for bonus stage (excluding already used ones)
   */
  getAvailableBonusBuildings(): Buildings[] {
    const allBuildings = [Buildings.HOUSE, Buildings.LAKE, Buildings.FOREST];
    const used = this._usedBonusBuildings();
    return allBuildings.filter((building) => !used.has(building));
  }

  /**
   * Add a placement to current turn tracking
   */
  addCurrentTurnPlacement(cellKey: string): void {
    this._currentTurnPlacements.update((placements) =>
      new Set([...placements, cellKey])
    );
  }

  /**
   * Clear current turn placements
   */
  clearCurrentTurnPlacements(): void {
    this._currentTurnPlacements.set(new Set());
    this._firstTurnPlaced.set(false);
    this._secondTurnPlaced.set(false);
  }

  /**
   * Mark first turn as placed
   */
  markFirstTurnPlaced(): void {
    this._firstTurnPlaced.set(true);
  }

  /**
   * Mark second turn as placed
   */
  markSecondTurnPlaced(): void {
    this._secondTurnPlaced.set(true);
  }

  /**
   * Check if both turns are placed
   */
  areBothTurnsPlaced(): boolean {
    return this._firstTurnPlaced() && this._secondTurnPlaced();
  }

  /**
   * Reset all game state
   */
  resetGame(config: GameConfig): void {
    this.initializeGame(config);
  }
}
