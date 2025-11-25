import { Component, inject, input, OnInit, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import {
  Buildings,
  getBuildingDisplayName,
  getBuildingFromDice,
} from '../../models/buildings.model';
import { DEFAULT_GAME_CONFIG, GameConfig } from '../../models/game-config.model';
import { PlacementState } from '../../models/placement-state.model';
import { BoardService } from '../../services/board.service';
import { GameStateService } from '../../services/game-state.service';
import { ScoringService } from '../../services/scoring.service';
import {
  canPlaceInCell,
  getBuildingToPlace,
  getNextPlacementState,
  shouldTrackTurnPlacement,
} from '../../utils/placement-rules.util';
import { GameFooterComponent } from '../game-footer/game-footer.component';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [LucideAngularModule, GameFooterComponent],
  templateUrl: './game-board.component.html',
  styleUrl: './game-board.component.scss',
})
export class GameBoardComponent implements OnInit {
  // Inject services
  private boardService = inject(BoardService);
  private gameStateService = inject(GameStateService);
  private scoringService = inject(ScoringService);

  // Configuration
  private config: GameConfig = DEFAULT_GAME_CONFIG;

  // Component inputs/outputs
  currentRolls = input<number[] | null>(null);
  placementState = input<PlacementState>(PlacementState.PREP_FIRST);
  selectedBuilding = input<Buildings | null | undefined>(undefined);
  placementStateChanged = output<PlacementState>();

  // Expose service signals to template
  board = this.boardService.board;
  currentRound = this.gameStateService.currentRound;
  gameComplete = this.gameStateService.gameComplete;
  inPreparationPhase = this.gameStateService.inPreparationPhase;
  inBonusStage = this.gameStateService.inBonusStage;
  footerScores = this.gameStateService.footerScores;
  currentTurnPlacements = this.gameStateService.currentTurnPlacements;
  firstTurnPlaced = this.gameStateService.firstTurnPlaced;
  secondTurnPlaced = this.gameStateService.secondTurnPlaced;
  usedBonusBuildings = this.gameStateService.usedBonusBuildings;
  bonusStageBuildings = this.gameStateService.bonusStageBuildings;

  // Expose configuration to template
  get rowLabels() {
    return this.config.rowLabels;
  }

  get colLabels() {
    return this.config.colLabels;
  }

  get maxRounds() {
    return this.config.maxRounds;
  }

  get bonusStageRounds() {
    return this.config.bonusStageRounds;
  }

  ngOnInit(): void {
    this.boardService.initializeBoard(this.config);
    this.gameStateService.initializeGame(this.config);
  }

  /**
   * Gets the point value for a specific cell
   */
  getCellPoints(row: number, col: number): number {
    return this.scoringService.getCellPoints(row, col, this.config);
  }





  /**
   * Complete the building phase and trigger bonus or scoring
   */
  completeRound(): void {
    const rolls = this.currentRolls();
    if (!rolls || rolls.length !== 2) return;
    
    // Don't complete round if we're already in bonus stage
    if (this.inBonusStage()) {
      return;
    }
    
    // Handle preparation phase differently (no scoring)
    if (this.inPreparationPhase()) {
      this.gameStateService.exitPreparationPhase();
      this.placementStateChanged.emit(PlacementState.COMPLETE);
      return;
    }
    
    // Check if current round triggers a bonus stage BEFORE scoring
    const currentRoundNum = this.currentRound();
    if (this.config.bonusStageRounds.includes(currentRoundNum)) {
      this.gameStateService.startBonusStage();
      this.placementStateChanged.emit(PlacementState.BONUS);
      return; // Wait for bonus placement before scoring
    }
    
    // No bonus stage, proceed directly to scoring
    this.performScoring();
  }

  /**
   * Perform scoring after building and bonus phases are complete
   */
  private performScoring(): void {
    const rolls = this.currentRolls();
    if (!rolls || rolls.length !== 2) return;
    
    const diceSum = rolls[0] + rolls[1];
    const board = this.boardService.getBoardState();
    
    // Calculate and update score
    const score = this.scoringService.calculateStreetScore(diceSum, board, this.config);
    const roundIndex = this.currentRound() - 1;
    this.gameStateService.setRoundScore(roundIndex, score);
    
    // Show scoring visualization (will stay visible until next dice roll)
    this.scoringService.showScoringVisualization(diceSum, board, this.config);
    
    // Advance to next round
    this.gameStateService.advanceRound(this.config.maxRounds);
    
    // Emit COMPLETE state to trigger dice clearing and prepare for next round
    this.placementStateChanged.emit(PlacementState.COMPLETE);
  }

  /**
   * Get total score across all rounds
   */
  getTotalScore(): number {
    return this.gameStateService.getTotalScore();
  }

  /**
   * Get plaza bonus score
   */
  getPlazaBonus(): number {
    const board = this.boardService.getBoardState();
    return this.scoringService.calculatePlazaBonus(board, this.config);
  }

  /**
   * Clears current turn placements (called when round completes)
   */
  clearCurrentTurnPlacements(): void {
    this.gameStateService.clearCurrentTurnPlacements();
  }

  /**
   * Reset current turn placements and remove buildings placed in this turn
   */
  resetCurrentTurnPlacements(): void {
    const placedCells = this.currentTurnPlacements();
    
    // Remove buildings from cells placed in current turn
    placedCells.forEach(cellKey => {
      const [row, col] = cellKey.split('-').map(Number);
      if (!isNaN(row) && !isNaN(col)) {
        this.boardService.clearCell(row, col);
      }
    });
    
    // Clear the tracking
    this.gameStateService.clearCurrentTurnPlacements();
  }

  /**
   * Clear scoring visualization
   */
  clearScoringVisualization(): void {
    this.scoringService.clearScoringVisualization();
  }

  /**
   * Reset game to initial state
   */
  resetGame(): void {
    this.gameStateService.resetGame(this.config);
    this.boardService.resetBoard(this.config);
    this.scoringService.clearScoringVisualization();
  }

  /**
   * Check if a cell is part of current scoring visualization
   */
  isCellInScoringGroup(row: number, col: number): boolean {
    return this.scoringService.isCellInScoringGroup(row, col);
  }

  /**
   * Check if a row is the current scoring street
   */
  isRowScoringStreet(row: number): boolean {
    return this.scoringService.isRowScoringStreet(row);
  }

  /**
   * Gets the current placement instruction text
   */
  getCurrentPlacementText(): string {
    const rolls = this.currentRolls();
    const state = this.placementState();
    const round = this.currentRound();
    
    if (this.gameComplete()) {
      return `Game Complete! Total Score: ${this.getTotalScore()}`;
    }

    if (!rolls || rolls.length < 2) {
      if (this.inPreparationPhase()) {
        return `Preparation Phase - Roll dice to start!`;
      }
      // Show bonus stage text even without dice
      if (state === PlacementState.BONUS) {
        const availableBuildings = this.getAvailableBonusBuildings();
        const selectedBonusBuilding = this.selectedBuilding();
        
        if (availableBuildings.length === 0) {
          return `Bonus Stage (Round ${this.currentRound()}) - No buildings available!`;
        } else if (availableBuildings.length === 1) {
          return `Bonus Stage (Round ${this.currentRound()}) - Place ${this.getBuildingDisplayName(availableBuildings[0])} anywhere!`;
        } else if (!selectedBonusBuilding) {
          return `Bonus Stage (Round ${this.currentRound()}) - Select a building to place anywhere!`;
        } else {
          return `Bonus Stage (Round ${this.currentRound()}) - Place ${this.getBuildingDisplayName(selectedBonusBuilding)} anywhere!`;
        }
      }
      return `Round ${round}/${this.maxRounds} - Roll dice to start!`;
    }

    switch (state) {
      case PlacementState.PREP_FIRST:
        const selectedBuilding = this.selectedBuilding();
        if (!selectedBuilding) {
          return `Preparation - First placement: Column ${rolls[0]} - Select a building first!`;
        }
        return `Preparation - First placement: Column ${rolls[0]} - Place ${this.getBuildingDisplayName(selectedBuilding)}`;
      case PlacementState.PREP_SECOND:
        const selectedBuilding2 = this.selectedBuilding();
        if (!selectedBuilding2) {
          return `Preparation - Second placement: Column ${rolls[1]} - Select a building first!`;
        }
        return `Preparation - Second placement: Column ${rolls[1]} - Place ${this.getBuildingDisplayName(selectedBuilding2)}`;
      case PlacementState.PREP_DOUBLES_FIRST:
        const selectedBuilding3 = this.selectedBuilding();
        if (!selectedBuilding3) {
          return `Preparation - Doubles! First placement: Column ${rolls[0]} - Select a building first!`;
        }
        return `Preparation - Doubles! First placement: Place ${this.getBuildingDisplayName(selectedBuilding3)} in column ${rolls[0]}`;
      case PlacementState.PREP_DOUBLES_SECOND:
        const selectedBuilding4 = this.selectedBuilding();
        if (!selectedBuilding4) {
          return `Preparation - Doubles! Second placement: Column ${rolls[0]} - Select a building first!`;
        }
        return `Preparation - Doubles! Second placement: Place ${this.getBuildingDisplayName(selectedBuilding4)} in column ${rolls[0]}`;
      case PlacementState.FIRST:
        const firstBuilding = this.getBuildingDisplayName(
          getBuildingFromDice(rolls[1]),
        );
        return `Round ${round} - First placement: Column ${rolls[0]} - Place ${firstBuilding}`;
      case PlacementState.SECOND:
        const secondBuilding = this.getBuildingDisplayName(
          getBuildingFromDice(rolls[0]),
        );
        return `Round ${round} - Second placement: Column ${rolls[1]} - Place ${secondBuilding}`;
      case PlacementState.DOUBLES_FIRST:
        const doublesBuilding = this.getBuildingDisplayName(
          getBuildingFromDice(rolls[0]),
        );
        return `Round ${round} - Doubles! Place ${doublesBuilding} in column ${rolls[0]}`;
      case PlacementState.DOUBLES_SQUARE:
        return `Round ${round} - Place Square anywhere on empty space`;
      case PlacementState.BONUS:
        const availableBuildings = this.getAvailableBonusBuildings();
        const selectedBonusBuilding = this.selectedBuilding();
        
        if (availableBuildings.length === 0) {
          return `Bonus Stage (Round ${this.currentRound()}) - No buildings available!`;
        } else if (availableBuildings.length === 1) {
          return `Bonus Stage (Round ${this.currentRound()}) - Place ${this.getBuildingDisplayName(availableBuildings[0])} anywhere!`;
        } else if (!selectedBonusBuilding) {
          return `Bonus Stage (Round ${this.currentRound()}) - Select a building to place anywhere!`;
        } else {
          return `Bonus Stage (Round ${this.currentRound()}) - Place ${this.getBuildingDisplayName(selectedBonusBuilding)} anywhere!`;
        }
      case PlacementState.COMPLETE:
        if (this.inPreparationPhase()) {
          return 'Preparation complete! Roll dice for next turn.';
        }
        if (this.inBonusStage()) {
          return 'Bonus building placed! Roll dice for next turn.';
        }
        return 'Both placements completed! Roll dice for next turn.';
      default:
        return '';
    }
  }

  /**
   * Gets a user-friendly display name for a building
   */
  private getBuildingDisplayName(building: Buildings): string {
    return getBuildingDisplayName(building);
  }

  handleCellClick(row: number, col: number) {
    const rolls = this.currentRolls();
    const currentPlacementState = this.placementState();
    const selectedBuildingValue = this.selectedBuilding();

    // Determine what building to place
    const buildingToPlace = getBuildingToPlace(
      currentPlacementState,
      rolls || [],
      selectedBuildingValue
    );
    if (!buildingToPlace) return;

    // Validate if placement is allowed
    const board = this.boardService.getBoardState();
    const availableBuildings = this.gameStateService.getAvailableBonusBuildings();
    
    if (!canPlaceInCell(
      row,
      col,
      currentPlacementState,
      rolls,
      board,
      selectedBuildingValue,
      this.currentTurnPlacements(),
      availableBuildings,
      this.config.cols
    )) {
      return;
    }

    // Place the building
    const cellKey = `${row}-${col}`;
    this.boardService.placeBuilding(row, col, buildingToPlace);
    this.gameStateService.addCurrentTurnPlacement(cellKey);

    // Handle bonus stage completion
    if (currentPlacementState === PlacementState.BONUS) {
      this.completeBonusStage(buildingToPlace);
      return;
    }

    // Track turn placements for states that support turn tracking
    if (shouldTrackTurnPlacement(currentPlacementState)) {
      if (currentPlacementState === PlacementState.FIRST || 
          currentPlacementState === PlacementState.DOUBLES_FIRST ||
          currentPlacementState === PlacementState.PREP_FIRST ||
          currentPlacementState === PlacementState.PREP_DOUBLES_FIRST) {
        this.gameStateService.markFirstTurnPlaced();
      } else if (currentPlacementState === PlacementState.SECOND || 
                 currentPlacementState === PlacementState.DOUBLES_SQUARE ||
                 currentPlacementState === PlacementState.PREP_SECOND ||
                 currentPlacementState === PlacementState.PREP_DOUBLES_SECOND) {
        this.gameStateService.markSecondTurnPlaced();
      }
    }

    // Determine next placement state
    const nextState = getNextPlacementState(
      currentPlacementState,
      this.firstTurnPlaced(),
      this.secondTurnPlaced()
    );

    // If round is complete, trigger completion logic
    if (nextState === PlacementState.COMPLETE) {
      this.completeRound();
      // Don't emit nextState here - completeRound will handle state transitions
      // (either to BONUS or stay in COMPLETE for scoring)
      return;
    }

    this.placementStateChanged.emit(nextState);
  }

  /**
   * Checks if a cell is clickable based on the current dice rolls and placement state
   * @param row The row index to check
   * @param col The column index to check
   * @returns true if the cell can be clicked, false otherwise
   */
  isCellClickable(row: number, col: number): boolean {
    const rolls = this.currentRolls();
    const currentPlacementState = this.placementState();
    const selectedBuildingValue = this.selectedBuilding();
    const board = this.boardService.getBoardState();
    const availableBuildings = this.gameStateService.getAvailableBonusBuildings();

    return canPlaceInCell(
      row,
      col,
      currentPlacementState,
      rolls,
      board,
      selectedBuildingValue,
      this.currentTurnPlacements(),
      availableBuildings,
      this.config.cols
    );
  }

  /**
   * Checks if a cell is occupied (has a building)
   * @param row The row index to check
   * @param col The column index to check
   * @returns true if the cell is occupied, false otherwise
   */
  isCellOccupied(row: number, col: number): boolean {
    return this.boardService.isCellOccupied(row, col);
  }

  /**
   * Gets available buildings for bonus stage (excluding already used ones)
   */
  getAvailableBonusBuildings(): Buildings[] {
    return this.gameStateService.getAvailableBonusBuildings();
  }

  /**
   * Completes a bonus stage placement and proceeds to scoring
   */
  completeBonusStage(placedBuilding: Buildings): void {
    // Complete bonus stage in game state service
    this.gameStateService.completeBonusStage(placedBuilding);
    
    // After bonus stage, proceed to scoring phase
    this.performScoring();
  }

}
