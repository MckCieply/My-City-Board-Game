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
  placementState = signal<PlacementState>(PlacementState.FIRST);

  onDiceRolled(rolls: number[], gameBoard: GameBoardComponent): void {
    this.currentRolls.set(rolls);
    this.placementState.set(PlacementState.FIRST);
    gameBoard.resetPlacementState();
  }

  onPlacementStateChange(state: PlacementState): void {
    this.placementState.set(state);
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

    if (state === PlacementState.FIRST) {
      // First placement: second die determines building
      return getBuildingFromDice(rolls[1]);
    } else {
      // Second placement: first die determines building
      return getBuildingFromDice(rolls[0]);
    }
  } // Dummy method for header component (buttons won't actually change selection)
  buildingSelected(building: Buildings): void {
    // No-op since buildings are determined by dice
  }
}
