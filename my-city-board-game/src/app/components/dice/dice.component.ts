import { Component, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  Buildings,
  getBuildingDisplayName,
  getBuildingFromDice,
} from '../../models/buildings.model';

@Component({
  selector: 'app-dice',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './dice.component.html',
  styleUrl: './dice.component.scss',
})
export class DiceComponent {
  diceRolled = output<number[]>();

  public diceValues: number[] = [1, 2, 3, 4, 5, 6];

  public currentRolls: number[] | null = null;

  constructor() {}

  //Roll twice to get a number between 1 and 6
  rollDice(): void {
    const roll1 =
      this.diceValues[Math.floor(Math.random() * this.diceValues.length)];
    const roll2 =
      this.diceValues[Math.floor(Math.random() * this.diceValues.length)];
    this.currentRolls = [roll1, roll2];
    this.diceRolled.emit(this.currentRolls);
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
}
