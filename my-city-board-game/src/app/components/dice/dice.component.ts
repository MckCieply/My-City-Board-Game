import { Component, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

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
}
