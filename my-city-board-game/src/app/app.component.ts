import { Component, signal, ViewChild } from '@angular/core';
import { DiceComponent } from './components/dice/dice.component';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { HeaderComponent } from './components/header/header.component';
import { Buildings, getBuildingFromDice } from './models/buildings.model';
import { PlacementState } from './models/placement-state.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GameBoardComponent, DiceComponent, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'my-city-board-game';

  @ViewChild('gameBoard') gameBoard!: GameBoardComponent;
  
  currentRolls = signal<number[] | null>(null);
  placementState = signal<PlacementState>(PlacementState.PREP_FIRST);
  selectedBuilding = signal<Buildings | null>(null); // For preparation phase

  /**
   * Checks if the current dice roll is doubles (same number on both dice)
   */
  private isDoublesRoll(rolls: number[]): boolean {
    return rolls.length === 2 && rolls[0] === rolls[1];
  }

  onDiceRolled(rolls: number[]): void {
    this.currentRolls.set(rolls);
    
    const currentState = this.placementState();
    const isPreparation = this.isPreparationPhase(currentState);
    const isBonusStage = this.isBonusStage(currentState);
    
    // Don't change state if we're in bonus stage - let bonus logic handle it
    if (isBonusStage) {
      return;
    }
    
    // Clear selected building when dice are rolled in prep phase to force new selection
    if (isPreparation) {
      this.selectedBuilding.set(null);
    }
    
    if (this.isDoublesRoll(rolls)) {
      this.placementState.set(isPreparation ? PlacementState.PREP_DOUBLES_FIRST : PlacementState.DOUBLES_FIRST);
    } else {
      this.placementState.set(isPreparation ? PlacementState.PREP_FIRST : PlacementState.FIRST);
    }
  }

  onPlacementStateChange(state: PlacementState): void {
    console.log(`Placement state changing to: ${state}`);
    this.placementState.set(state);
    
    // Clear selected building when moving to second prep placement (after first placement)
    if (state === PlacementState.PREP_SECOND || state === PlacementState.PREP_DOUBLES_SECOND) {
      this.selectedBuilding.set(null);
      console.log('First prep placement done, cleared selected building for second placement');
    }
    
    // If entering bonus stage, clear selected building to force new selection
    if (state === PlacementState.BONUS) {
      this.selectedBuilding.set(null);
      console.log('Entered bonus stage, cleared selected building');
    }
    
    // Don't clear dice during bonus stage
    if (state === PlacementState.BONUS) {
      console.log('In bonus stage - keeping dice for reference');
      return; // Don't process any other state changes
    }
    
    // If round is complete, clear dice to prepare for next roll
    if (state === PlacementState.COMPLETE) {
      console.log('Round complete, clearing dice');
      
      // Clear current turn placements to prevent replacement of buildings from previous turns
      if (this.gameBoard) {
        this.gameBoard.clearCurrentTurnPlacements();
      }
      
      setTimeout(() => {
        this.currentRolls.set(null);
        console.log('Dice cleared, ready for new roll');
      }, 100);
    }
  }

  /**
   * Gets the currently selected building based on dice rolls and placement state
   */
  getCurrentSelectedBuilding(): Buildings | null {
    const rolls = this.currentRolls();
    const state = this.placementState();

    if (!rolls || rolls.length < 2 || state === PlacementState.COMPLETE) {
      return null;
    }

    // During preparation phase or bonus stage, use selected building
    if (this.isPreparationPhase(state) || this.isBonusStage(state)) {
      return this.selectedBuilding();
    }

    // During regular game, use dice-determined buildings
    if (state === PlacementState.FIRST) {
      // First placement: second die determines building
      return getBuildingFromDice(rolls[1]);
    } else if (state === PlacementState.SECOND) {
      // Second placement: first die determines building
      return getBuildingFromDice(rolls[0]);
    } else if (state === PlacementState.DOUBLES_FIRST) {
      // Doubles first placement: dice value determines building
      return getBuildingFromDice(rolls[0]);
    } else if (state === PlacementState.DOUBLES_SQUARE) {
      // Doubles second placement: always a square
      return Buildings.SQUARE;
    }
    
    return null;
  }

  /**
   * Handles building selection during preparation phase and bonus stages
   */
  buildingSelected(building: Buildings): void {
    const currentState = this.placementState();
    if (this.isPreparationPhase(currentState) && building !== Buildings.SQUARE) {
      this.selectedBuilding.set(building);
    } else if (this.isBonusStage(currentState) && building !== Buildings.SQUARE) {
      this.selectedBuilding.set(building);
    }
  }

  /**
   * Checks if current state is in preparation phase
   */
  private isPreparationPhase(state: PlacementState): boolean {
    return state === PlacementState.PREP_FIRST ||
           state === PlacementState.PREP_SECOND ||
           state === PlacementState.PREP_DOUBLES_FIRST ||
           state === PlacementState.PREP_DOUBLES_SECOND;
  }

  /**
   * Checks if building selection is enabled (during preparation phase or bonus stage)
   * In prep phase, dice must be rolled first before selection is enabled
   */
  isBuildingSelectionEnabled(): boolean {
    const state = this.placementState();
    const isPrep = this.isPreparationPhase(state);
    const isBonus = this.isBonusStage(state);
    
    // In prep phase, require dice to be rolled before enabling selection
    if (isPrep) {
      return this.currentRolls() !== null;
    }
    
    // Bonus stage always allows selection
    return isBonus;
  }

  /**
   * Checks if current state is bonus stage
   */
  private isBonusStage(state: PlacementState): boolean {
    return state === PlacementState.BONUS;
  }

  /**
   * Gets the selected building for the game board component
   */
  getSelectedBuildingForPlacement(): Buildings | undefined {
    const selected = this.selectedBuilding();
    const currentState = this.placementState();
    return (this.isPreparationPhase(currentState) || this.isBonusStage(currentState)) ? (selected || undefined) : undefined;
  }

  /**
   * Gets disabled buildings for header component
   */
  getDisabledBuildings(): Set<Buildings> {
    const currentState = this.placementState();
    const disabled = new Set([Buildings.SQUARE]); // Always disable square
    
    if (this.isBonusStage(currentState)) {
      // During bonus stage, disable used buildings
      const usedBuildings = this.getUsedBonusBuildings();
      usedBuildings.forEach(building => disabled.add(building));
    }
    
    return disabled;
  }

  /**
   * Gets used bonus buildings from the game board component
   */
  getUsedBonusBuildings(): Set<Buildings> {
    if (this.gameBoard) {
      return this.gameBoard.usedBonusBuildings();
    }
    return new Set();
  }

  /**
   * Determines if dice rolling should be disabled
   * Dice should be disabled when:
   * - A round is in progress (dice rolled but placements not complete)
   * - Game is complete
   */
  isDiceRollingDisabled(): boolean {
    const currentState = this.placementState();
    const hasRolls = this.currentRolls() !== null;
    
    // If game is complete, disable dice
    if (this.gameBoard && this.gameBoard.gameComplete()) {
      return true;
    }
    
    // If we have dice rolls and not in COMPLETE state, disable rolling again
    if (hasRolls && currentState !== PlacementState.COMPLETE) {
      return true;
    }
    
    return false;
  }

  /**
   * Determines if step switching should be disabled
   * Step switching is disabled during:
   * - Preparation phases
   * - Bonus stages  
   * - Doubles rolls
   */
  isStepSwitchingDisabled(): boolean {
    const rolls = this.currentRolls();
    const currentState = this.placementState();
    
    // Disable if no rolls or during prep/bonus/doubles
    return !rolls || 
           this.isPreparationPhase(currentState) || 
           this.isBonusStage(currentState) || 
           this.isDoublesRoll(rolls);
  }

  /**
   * Handles step selection from dice component
   */
  onStepSelected(step: 'first' | 'second'): void {
    const rolls = this.currentRolls();
    const currentState = this.placementState();
    
    // Only allow step switching during regular game (not prep, bonus, or doubles)
    if (!rolls || this.isPreparationPhase(currentState) || 
        this.isBonusStage(currentState) || this.isDoublesRoll(rolls)) {
      return;
    }
    
    // Switch placement state based on selected step
    if (step === 'first') {
      this.placementState.set(PlacementState.FIRST);
    } else {
      this.placementState.set(PlacementState.SECOND);
    }
  }

  /**
   * Get first turn placed status from game board
   */
  getFirstTurnPlaced(): boolean {
    return this.gameBoard ? this.gameBoard.firstTurnPlaced() : false;
  }

  /**
   * Get second turn placed status from game board
   */
  getSecondTurnPlaced(): boolean {
    return this.gameBoard ? this.gameBoard.secondTurnPlaced() : false;
  }

  /**
   * Reset current turn placements - removes buildings placed in current roll
   */
  onResetTurns(): void {
    if (this.gameBoard) {
      this.gameBoard.resetCurrentTurnPlacements();
      // Reset to first turn after reset
      this.placementState.set(PlacementState.FIRST);
    }
  }
}
