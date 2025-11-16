import { Component, input, output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import {
  Buildings,
  getBuildingDisplayName,
  getBuildingFromDice,
} from '../../models/buildings.model';
import { PlacementState } from '../../models/placement-state.model';

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
  currentRolls = input<number[] | null>(null);
  placementState = input<PlacementState>(PlacementState.FIRST);
  placementStateChanged = output<PlacementState>();

  //TODO: Move to config
  private readonly rows = 5;
  private readonly cols = 6;

  // Labels for rows and columns
  readonly rowLabels = ['(3, 4)', '(5, 6)', '(7)', '(8, 9)', '(10, 11)'];
  readonly colLabels = ['1', '2', '3', '4', '5', '6'];

  board = signal<Board>(this.createEmptyBoard(this.rows, this.cols));

  // Point values for each cell position (row, col)
  readonly pointMatrix = [
    [3, 0, 2, 2, 0, 3], // Row 0: (3, 4)
    [0, 1, 0, 0, 1, 0], // Row 1: (5, 6) 
    [2, 0, 1, 1, 0, 2], // Row 2: (7)
    [0, 1, 0, 0, 1, 0], // Row 3: (8, 9)
    [3, 0, 2, 2, 0, 3]  // Row 4: (10, 11)
  ];

  /**
   * Gets the point value for a specific cell
   */
  getCellPoints(row: number, col: number): number {
    return this.pointMatrix[row]?.[col] || 0;
  }

  /**
   * Gets the current placement instruction text
   */
  getCurrentPlacementText(): string {
    const rolls = this.currentRolls();
    const state = this.placementState();

    if (!rolls || rolls.length < 2) {
      return 'Roll dice to start!';
    }

    switch (state) {
      case PlacementState.FIRST:
        const firstBuilding = this.getBuildingDisplayName(
          getBuildingFromDice(rolls[1]),
        );
        return `First placement: Column ${rolls[0]} - Place ${firstBuilding}`;
      case PlacementState.SECOND:
        const secondBuilding = this.getBuildingDisplayName(
          getBuildingFromDice(rolls[0]),
        );
        return `Second placement: Column ${rolls[1]} - Place ${secondBuilding}`;
      case PlacementState.DOUBLES_FIRST:
        const doublesBuilding = this.getBuildingDisplayName(
          getBuildingFromDice(rolls[0]),
        );
        return `Doubles! Place ${doublesBuilding} in column ${rolls[0]}`;
      case PlacementState.DOUBLES_SQUARE:
        return `Place Square anywhere on empty space`;
      case PlacementState.COMPLETE:
        return 'Both placements completed! Roll dice for next turn.';
      default:
        return '';
    }
  }

  /**
   * Gets a user-friendly display name for a building
   */
  private getBuildingDisplayName(building: Buildings): string {
    return getBuildingDisplayName(building);
  }

  handleCellClick(row: number, col: number) {
    const rolls = this.currentRolls();
    const currentPlacementState = this.placementState();
    const board = this.board();

    // Check if dice have been rolled
    if (!rolls || rolls.length < 2) {
      return;
    }

    // Check if we're in complete state (both placements done)
    if (currentPlacementState === PlacementState.COMPLETE) {
      return;
    }

    // Check if cell is already occupied
    if (board[row][col] !== null) {
      return;
    }

    // Determine allowed column and building based on placement state
    let allowedColumn: number | null = null;
    let columnDice: number;
    let buildingDice: number;
    let buildingToPlace: Buildings;

    if (currentPlacementState === PlacementState.FIRST) {
      // First placement: first die = column, second die = building
      columnDice = rolls[0];
      buildingDice = rolls[1];
      allowedColumn = columnDice - 1;
      buildingToPlace = getBuildingFromDice(buildingDice);
    } else if (currentPlacementState === PlacementState.SECOND) {
      // Second placement: second die = column, first die = building
      columnDice = rolls[1];
      buildingDice = rolls[0];
      allowedColumn = columnDice - 1;
      buildingToPlace = getBuildingFromDice(buildingDice);
    } else if (currentPlacementState === PlacementState.DOUBLES_FIRST) {
      // Doubles first placement: dice value = column and building
      columnDice = rolls[0];
      buildingDice = rolls[0];
      allowedColumn = columnDice - 1;
      buildingToPlace = getBuildingFromDice(buildingDice);
    } else if (currentPlacementState === PlacementState.DOUBLES_SQUARE) {
      // Doubles second placement: square anywhere (no column restriction)
      allowedColumn = null; // Any column allowed
      buildingToPlace = Buildings.SQUARE;
    } else {
      return;
    }

    // Check column restriction (only if not placing square anywhere)
    if (allowedColumn !== null && col !== allowedColumn) {
      return;
    }

    // Cell is empty and in correct column: Place the dice-determined building
    this.board.update((currentBoard) => {
      const newBoard = currentBoard.map((r) => [...r]);
      newBoard[row][col] = buildingToPlace;

      // Update placement state
      if (currentPlacementState === PlacementState.FIRST) {
        this.placementStateChanged.emit(PlacementState.SECOND);
        console.log('Now place your second building!');
      } else if (currentPlacementState === PlacementState.DOUBLES_FIRST) {
        this.placementStateChanged.emit(PlacementState.DOUBLES_SQUARE);
      } else {
        this.placementStateChanged.emit(PlacementState.COMPLETE);
      }

      return newBoard;
    });
  }

  /**
   * Checks if a cell is clickable based on the current dice rolls and placement state
   * @param row The row index to check
   * @param col The column index to check
   * @returns true if the cell can be clicked, false otherwise
   */
  isCellClickable(row: number, col: number): boolean {
    const rolls = this.currentRolls();
    const currentPlacementState = this.placementState();
    const board = this.board();

    // Must have dice rolled
    if (!rolls || rolls.length < 2) {
      return false;
    }

    // If both placements are complete, no cells are clickable
    if (currentPlacementState === PlacementState.COMPLETE) {
      return false;
    }

    // Cell must be empty
    if (board[row][col] !== null) {
      return false;
    }

    // Determine allowed column based on placement state
    let allowedColumn: number;

    if (currentPlacementState === PlacementState.FIRST) {
      // First placement: first die determines column
      allowedColumn = rolls[0] - 1;
    } else if (currentPlacementState === PlacementState.SECOND) {
      // Second placement: second die determines column
      allowedColumn = rolls[1] - 1;
    } else if (currentPlacementState === PlacementState.DOUBLES_FIRST) {
      // Doubles first placement: dice value determines column
      allowedColumn = rolls[0] - 1;
    } else if (currentPlacementState === PlacementState.DOUBLES_SQUARE) {
      // Doubles square placement: any empty cell is allowed
      return true;
    } else {
      return false;
    }

    return col === allowedColumn;
  }

  /**
   * Checks if a cell is occupied (has a building)
   * @param row The row index to check
   * @param col The column index to check
   * @returns true if the cell is occupied, false otherwise
   */
  isCellOccupied(row: number, col: number): boolean {
    const board = this.board();
    return board[row][col] !== null;
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
