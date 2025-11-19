import { Component, signal } from '@angular/core';
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
    
    if (this.isDoublesRoll(rolls)) {
      this.placementState.set(isPreparation ? PlacementState.PREP_DOUBLES_FIRST : PlacementState.DOUBLES_FIRST);
    } else {
      this.placementState.set(isPreparation ? PlacementState.PREP_FIRST : PlacementState.FIRST);
    }
  }

  onPlacementStateChange(state: PlacementState): void {
    this.placementState.set(state);
    
    // If round is complete, clear dice to prepare for next roll
    if (state === PlacementState.COMPLETE) {
      setTimeout(() => {
        this.currentRolls.set(null);
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

    // During preparation phase, use selected building
    if (this.isPreparationPhase(state)) {
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
   * Handles building selection during preparation phase
   */
  buildingSelected(building: Buildings): void {
    if (this.isPreparationPhase(this.placementState()) && building !== Buildings.SQUARE) {
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
   * Checks if building selection is enabled (during preparation phase)
   */
  isBuildingSelectionEnabled(): boolean {
    return this.isPreparationPhase(this.placementState());
  }

  /**
   * Gets the selected building for the game board component
   */
  getSelectedBuildingForPlacement(): Buildings | undefined {
    const selected = this.selectedBuilding();
    return this.isPreparationPhase(this.placementState()) ? (selected || undefined) : undefined;
  }
}
