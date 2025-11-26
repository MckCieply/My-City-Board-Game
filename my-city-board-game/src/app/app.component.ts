import { Component, computed, inject, signal } from '@angular/core';
import { DiceComponent } from './components/dice/dice.component';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { HeaderComponent } from './components/header/header.component';
import { Buildings, getBuildingFromDice } from './models/buildings.model';
import { DEFAULT_GAME_CONFIG } from './models/game-config.model';
import { PlacementState } from './models/placement-state.model';
import { BoardService } from './services/board.service';
import { GameStateService } from './services/game-state.service';
import { ScoringService } from './services/scoring.service';
import { isBonusStage, isPreparationPhase } from './utils/placement-state.util';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GameBoardComponent, DiceComponent, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'my-city-board-game';

  // Inject services
  private gameStateService = inject(GameStateService);
  private boardService = inject(BoardService);
  private scoringService = inject(ScoringService);
  
  // Local state signals
  currentRolls = signal<number[] | null>(null);
  placementState = signal<PlacementState>(PlacementState.PREP_FIRST);
  selectedBuilding = signal<Buildings | null>(null);

  // Computed signals for derived state
  private isDoublesRoll = computed(() => {
    const rolls = this.currentRolls();
    return rolls !== null && rolls.length === 2 && rolls[0] === rolls[1];
  });

  private isPreparationPhase = computed(() => isPreparationPhase(this.placementState()));
  private isBonusStage = computed(() => isBonusStage(this.placementState()));

  currentSelectedBuilding = computed(() => {
    const rolls = this.currentRolls();
    const state = this.placementState();

    if (!rolls || rolls.length < 2 || state === PlacementState.COMPLETE) {
      return null;
    }

    // During preparation phase or bonus stage, use selected building
    if (this.isPreparationPhase() || this.isBonusStage()) {
      return this.selectedBuilding();
    }

    // During regular game, use dice-determined buildings
    if (state === PlacementState.FIRST) {
      return getBuildingFromDice(rolls[1]);
    } else if (state === PlacementState.SECOND) {
      return getBuildingFromDice(rolls[0]);
    } else if (state === PlacementState.DOUBLES_FIRST) {
      return getBuildingFromDice(rolls[0]);
    } else if (state === PlacementState.DOUBLES_SQUARE) {
      return Buildings.SQUARE;
    }
    
    return null;
  });

  buildingSelectionEnabled = computed(() => {
    const isPrep = this.isPreparationPhase();
    const isBonus = this.isBonusStage();
    
    if (isPrep) {
      return this.currentRolls() !== null;
    }
    
    return isBonus;
  });

  selectedBuildingForPlacement = computed(() => {
    const selected = this.selectedBuilding();
    return (this.isPreparationPhase() || this.isBonusStage()) ? (selected || undefined) : undefined;
  });

  disabledBuildings = computed(() => {
    const disabled = new Set([Buildings.SQUARE]);
    
    if (this.isBonusStage()) {
      const usedBuildings = this.gameStateService.usedBonusBuildings();
      usedBuildings.forEach(building => disabled.add(building));
    }
    
    return disabled;
  });

  diceRollingDisabled = computed(() => {
    const currentState = this.placementState();
    const hasRolls = this.currentRolls() !== null;
    
    if (this.gameStateService.gameComplete()) {
      return true;
    }
    
    if (hasRolls && currentState !== PlacementState.COMPLETE) {
      return true;
    }
    
    return false;
  });

  stepSwitchingDisabled = computed(() => {
    const rolls = this.currentRolls();
    return !rolls || this.isBonusStage();
  });

  onDiceRolled(rolls: number[]): void {
    const currentState = this.placementState();
    const wasComplete = currentState === PlacementState.COMPLETE;
    
    // Clear scoring visualization from previous round
    this.scoringService.clearScoringVisualization();
    if (wasComplete) {
      this.gameStateService.clearCurrentTurnPlacements();
    }
    
    this.currentRolls.set(rolls);
    
    const isPreparation = this.isPreparationPhase();
    const isBonus = this.isBonusStage();
    
    // Don't change state if we're in bonus stage - let bonus logic handle it
    if (isBonus) {
      return;
    }
    
    // Clear selected building when dice are rolled in prep phase to force new selection
    if (isPreparation) {
      this.selectedBuilding.set(null);
      this.placementState.set(PlacementState.PREP_FIRST);
    } else if (this.isDoublesRoll()) {
      this.placementState.set(PlacementState.DOUBLES_FIRST);
    } else {
      this.placementState.set(PlacementState.FIRST);
    }
  }

  onPlacementStateChange(state: PlacementState): void {
    this.placementState.set(state);
    
    // Clear selected building when moving to second prep placement
    if (state === PlacementState.PREP_SECOND || state === PlacementState.PREP_DOUBLES_SECOND) {
      this.selectedBuilding.set(null);
    }
    
    // If entering bonus stage, clear selected building
    if (state === PlacementState.BONUS) {
      this.selectedBuilding.set(null);
      return;
    }
    
    // If round is complete, clear dice to prepare for next roll
    if (state === PlacementState.COMPLETE) {
      // Check if game is complete and show plaza bonus visualization
      if (this.gameStateService.gameComplete()) {
        this.scoringService.clearScoringVisualization();
        this.scoringService.showPlazaBonusVisualization();
      }
      
      setTimeout(() => {
        this.currentRolls.set(null);
      }, 100);
    }
  }

  buildingSelected(building: Buildings): void {
    if (building === Buildings.SQUARE) return;
    
    const isPrep = this.isPreparationPhase();
    const isBonus = this.isBonusStage();
    
    if (isPrep || isBonus) {
      this.selectedBuilding.set(building);
    }
  }

  onStepSelected(step: 'first' | 'second'): void {
    const rolls = this.currentRolls();
    
    if (!rolls || this.isBonusStage()) {
      return;
    }
    
    // Handle preparation phase (no doubles logic in prep)
    if (this.isPreparationPhase()) {
      if (step === 'first') {
        this.placementState.set(PlacementState.PREP_FIRST);
      } else {
        this.placementState.set(PlacementState.PREP_SECOND);
      }
      return;
    }
    
    // Handle regular game phase
    if (this.isDoublesRoll()) {
      if (step === 'first') {
        this.placementState.set(PlacementState.DOUBLES_FIRST);
      } else {
        this.placementState.set(PlacementState.DOUBLES_SQUARE);
      }
    } else {
      if (step === 'first') {
        this.placementState.set(PlacementState.FIRST);
      } else {
        this.placementState.set(PlacementState.SECOND);
      }
    }
  }

  onResetTurns(): void {
    // Remove buildings placed in current turn
    const placedCells = this.gameStateService.currentTurnPlacements();
    placedCells.forEach(cellKey => {
      const [row, col] = cellKey.split('-').map(Number);
      if (!isNaN(row) && !isNaN(col)) {
        this.boardService.clearCell(row, col);
      }
    });
    
    this.gameStateService.clearCurrentTurnPlacements();
    
    // Reset to appropriate first state
    const isPrep = this.isPreparationPhase();
    this.placementState.set(isPrep ? PlacementState.PREP_FIRST : PlacementState.FIRST);
  }

  onPlayAgain(): void {
    this.gameStateService.resetGame(DEFAULT_GAME_CONFIG);
    this.boardService.resetBoard(DEFAULT_GAME_CONFIG);
    this.scoringService.clearScoringVisualization();
    this.currentRolls.set(null);
    this.placementState.set(PlacementState.PREP_FIRST);
    this.selectedBuilding.set(null);
  }
}
