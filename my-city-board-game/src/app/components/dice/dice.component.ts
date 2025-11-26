import { Component, effect, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  Buildings,
  getBuildingDisplayName,
  getBuildingFromDice,
} from '../../models/buildings.model';
import { PlacementState } from '../../models/placement-state.model';
import { GameStateService } from '../../services/game-state.service';
import { isFirstPlacement, isPreparationPhase, isSecondPlacement } from '../../utils/placement-state.util';

@Component({
  selector: 'app-dice',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './dice.component.html',
  styleUrl: './dice.component.scss',
})
export class DiceComponent {
  private gameStateService = inject(GameStateService);

  disabled = input<boolean>(false);
  stepSwitchingDisabled = input<boolean>(false);
  placementState = input<PlacementState>(PlacementState.FIRST);
  diceRolled = output<number[]>();
  stepSelected = output<'first' | 'second'>();
  resetTurns = output<void>();

  // Get turn placement signals from service
  firstTurnPlaced = this.gameStateService.firstTurnPlaced;
  secondTurnPlaced = this.gameStateService.secondTurnPlaced;

  public diceValues: number[] = [1, 2, 3, 4, 5, 6];

  public currentRolls: number[] | null = null;
  public selectedStep: 'first' | 'second' = 'first';

  constructor() {
    // Sync selected step with placement state changes
    effect(() => {
      const state = this.placementState();
      if (isFirstPlacement(state)) {
        this.selectedStep = 'first';
      } else if (isSecondPlacement(state)) {
        this.selectedStep = 'second';
      }
    });
  }

  /**
   * Gets the building enum from dice value
   */
  getBuildingFromDice(diceValue: number): Buildings {
    return getBuildingFromDice(diceValue);
  }

  /**
   * Checks if the current roll is doubles
   */
  isDoubles(): boolean {
    return this.currentRolls !== null && this.currentRolls.length === 2 && this.currentRolls[0] === this.currentRolls[1];
  }

  /**
   * Gets the display name for a building enum value
   */
  getBuildingDisplayName(building: Buildings): string {
    return getBuildingDisplayName(building);
  }

  /**
   * Selects which step to perform (first or second)
   */
  selectStep(step: 'first' | 'second'): void {
    // Only emit if actually changing to avoid redundant state updates
    if (this.selectedStep !== step) {
      this.selectedStep = step;
      this.stepSelected.emit(step);
    }
  }

  /**
   * Check if a step button should be disabled (already placed)
   */
  isStepDisabled(step: 'first' | 'second'): boolean {
    return step === 'first' ? this.firstTurnPlaced() : this.secondTurnPlaced();
  }

  /**
   * Check if in preparation phase
   */
  isPreparationPhase(): boolean {
    return isPreparationPhase(this.placementState());
  }

  /**
   * Check if reset button should be shown (at least one turn placed and not in scoring)
   */
  shouldShowReset(): boolean {
    const isScoring = this.placementState() === PlacementState.COMPLETE;
    return (this.firstTurnPlaced() || this.secondTurnPlaced()) && !isScoring;
  }

  /**
   * Reset current turn placements
   */
  onResetTurns(): void {
    this.resetTurns.emit();
  }

  /**
   * Reset selected step when new dice are rolled
   */
  rollDice(): void {
    const roll1 =
      this.diceValues[Math.floor(Math.random() * this.diceValues.length)];
    const roll2 =
      this.diceValues[Math.floor(Math.random() * this.diceValues.length)];
    this.currentRolls = [roll1, roll2];
    this.selectedStep = 'first'; // Reset to first step
    this.diceRolled.emit(this.currentRolls);
  }
}
