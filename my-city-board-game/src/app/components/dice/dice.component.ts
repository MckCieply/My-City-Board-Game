import { Component, output } from '@angular/core';

@Component({
  selector: 'app-dice',
  standalone: true,
  imports: [],
  templateUrl: './dice.component.html',
  styleUrl: './dice.component.scss',
})
export class DiceComponent {
  diceRolled = output<number>();

  public diceValues: number[] = [1, 2, 3, 4, 5, 6];

  public currentRoll: number | null = null;

  constructor() {}

  rollDice(): void {
    const randomIndex = Math.floor(Math.random() * this.diceValues.length);
    const rolledValue = this.diceValues[randomIndex];
    this.currentRoll = rolledValue;
    this.diceRolled.emit(rolledValue);
  }
}
