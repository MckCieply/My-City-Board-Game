import { Component, input, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Buildings } from '../../models/buildings.model';

type Cell = Buildings | null;
type Board = Cell[][];

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './game-board.component.html',
  styleUrl: './game-board.component.scss',
})
//TODO: Export types
export class GameBoardComponent {
  isBuildingSelected = input.required<boolean>();
  buildingSelected = input<Buildings | undefined>(undefined);

  //TODO: Move to config
  private readonly rows = 5;
  private readonly cols = 5;

  board = signal<Board>(this.createEmptyBoard(this.rows, this.cols));

  handleCellClick(row: number, col: number) {
    const buildingToPlace = this.buildingSelected();

    if (buildingToPlace === undefined) {
      return;
    }

    this.board.update((currentBoard) => {
      const newBoard = currentBoard.map((r) => [...r]);

      if (newBoard[row][col] === null) {
        // Cell is empty: Place the selected building
        newBoard[row][col] = buildingToPlace;
        console.log(`Placed ${buildingToPlace} at: [${row}, ${col}]`);
      } else {
        // Cell is occupied: Clear it
        newBoard[row][col] = null;
        console.log(`Cleared cell at: [${row}, ${col}]`);
      }

      return newBoard;
    });
  }

  /**
   * Creates and returns a 2D array representing an empty game board.
   * @param rows The number of rows for the board.
   * @param cols The number of columns for the board.
   * @returns A 2D array (Board) filled with 'null'.
   */
  private createEmptyBoard(rows: number, cols: number): Board {
    return Array.from({ length: rows }, () => Array(cols).fill(null));
  }
}
