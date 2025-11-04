import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DiceComponent } from './components/dice/dice.component';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { HeaderComponent } from './components/header/header.component';
import { Buildings } from './models/buildings.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, GameBoardComponent, DiceComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'my-city-board-game';

  currentRolls = signal<number[] | null>(null);
  currentBuilding = signal<Buildings | undefined>(undefined);

  buildingSelected(building: Buildings): void {
    this.currentBuilding.set(building);
  }
}
