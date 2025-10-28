import { Component, signal } from '@angular/core';

type Cell = null | 'X' | 'O';
type Board = Cell[][];

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [],
  templateUrl: './game-board.component.html',
  styleUrl: './game-board.component.scss',
})
export class GameBoardComponent {
  // Define the dimensions of the board
  private readonly rows = 5;
  private readonly cols = 5;

  board = signal<Board>(this.createEmptyBoard(this.rows, this.cols));

  /**
   * Creates and returns a 2D array representing an empty game board.
   * @param rows The number of rows for the board.
   * @param cols The number of columns for the board.
   * @returns A 2D array (Board) filled with 'null'.
   */
  private createEmptyBoard(rows: number, cols: number): Board {
    // We use Array.from() to create the outer array (rows)
    // For each row, we create an inner array (columns) and fill it with 'null'
    return Array.from({ length: rows }, () => Array(cols).fill(null));
  }
}
