import { Injectable, signal } from '@angular/core';
import { Board, Cell } from '../models/board.model';
import { Buildings } from '../models/buildings.model';
import { GameConfig } from '../models/game-config.model';

/**
 * Service responsible for board state management and operations
 */
@Injectable({
  providedIn: 'root',
})
export class BoardService {
  private _board = signal<Board>([]);

  /**
   * Initialize board with given dimensions
   */
  initializeBoard(config: GameConfig): void {
    this._board.set(this.createEmptyBoard(config.rows, config.cols));
  }

  /**
   * Get the board signal (read-only)
   */
  get board() {
    return this._board.asReadonly();
  }

  /**
   * Place a building at a specific position
   */
  placeBuilding(row: number, col: number, building: Buildings): void {
    this._board.update((currentBoard) => {
      const newBoard = currentBoard.map((r) => [...r]);
      newBoard[row][col] = building;
      return newBoard;
    });
  }

  /**
   * Get the building at a specific position
   */
  getBuildingAt(row: number, col: number): Cell {
    const currentBoard = this._board();
    return currentBoard[row]?.[col] ?? null;
  }

  /**
   * Check if a cell is occupied
   */
  isCellOccupied(row: number, col: number): boolean {
    return this.getBuildingAt(row, col) !== null;
  }

  /**
   * Clear a cell (set to null)
   */
  clearCell(row: number, col: number): void {
    this._board.update((currentBoard) => {
      const newBoard = currentBoard.map((r) => [...r]);
      newBoard[row][col] = null;
      return newBoard;
    });
  }

  /**
   * Reset the board to empty state
   */
  resetBoard(config: GameConfig): void {
    this._board.set(this.createEmptyBoard(config.rows, config.cols));
  }

  /**
   * Get the current board state (for calculations)
   */
  getBoardState(): Board {
    return this._board();
  }

  /**
   * Creates an empty board with given dimensions
   */
  private createEmptyBoard(rows: number, cols: number): Board {
    return Array.from({ length: rows }, () => Array(cols).fill(null));
  }
}
