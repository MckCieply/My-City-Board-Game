import { Injectable, signal } from '@angular/core';
import { Board } from '../models/board.model';
import { Buildings } from '../models/buildings.model';
import { GameConfig } from '../models/game-config.model';

/**
 * Service responsible for all scoring calculations and visualization
 */
@Injectable({
  providedIn: 'root',
})
export class ScoringService {
  // Scoring visualization
  private _currentScoringStreet = signal<number>(-1);
  private _currentScoringGroups = signal<Set<string>>(new Set());

  get currentScoringStreet() {
    return this._currentScoringStreet.asReadonly();
  }

  get currentScoringGroups() {
    return this._currentScoringGroups.asReadonly();
  }

  /**
   * Calculate score for a specific street (row) based on dice sum
   */
  calculateStreetScore(
    diceSum: number,
    board: Board,
    config: GameConfig,
    playerCanChoose = false
  ): number {
    const targetRow = this.getTargetRowFromDiceSum(
      diceSum,
      playerCanChoose,
      config
    );
    if (targetRow === -1) return 0;

    let totalScore = 0;

    // Find all building groups and check if they have buildings on the target street
    const visitedCells = new Set<string>();

    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        const cellKey = `${row}-${col}`;
        if (visitedCells.has(cellKey)) continue;

        const building = board[row][col];
        if (!building || building === Buildings.SQUARE) continue; // Skip empty cells and squares

        // Find all connected buildings of the same type
        const group = this.findConnectedGroup(
          board,
          row,
          col,
          building,
          visitedCells,
          config
        );

        // Check if this group has at least one building on the target street
        const hasBuildingOnTargetStreet = group.some(
          ([r, c]) => r === targetRow
        );

        if (hasBuildingOnTargetStreet) {
          // Calculate points for this entire group
          const groupScore = group.reduce((sum, [r, c]) => {
            return sum + this.getCellPoints(r, c, config);
          }, 0);
          totalScore += groupScore;
        }
      }
    }

    return totalScore;
  }

  /**
   * Get target row based on dice sum
   */
  getTargetRowFromDiceSum(
    diceSum: number,
    playerCanChoose: boolean,
    config: GameConfig
  ): number {
    if (diceSum === 2 || diceSum === 12) {
      // Player can choose - for now return -1 to indicate choice needed
      return playerCanChoose ? -1 : 0; // Default to first row if not choosing
    }

    // Map dice sum to row index
    const sumToRowMap: { [key: number]: number } = {
      3: 0,
      4: 0, // (3, 4) -> row 0
      5: 1,
      6: 1, // (5, 6) -> row 1
      7: 2, // (7) -> row 2
      8: 3,
      9: 3, // (8, 9) -> row 3
      10: 4,
      11: 4, // (10, 11) -> row 4
    };

    return sumToRowMap[diceSum] ?? -1;
  }

  /**
   * Find all connected buildings of the same type using BFS
   */
  findConnectedGroup(
    board: Board,
    startRow: number,
    startCol: number,
    buildingType: Buildings,
    visitedGlobal: Set<string>,
    config: GameConfig
  ): [number, number][] {
    const group: [number, number][] = [];
    const queue: [number, number][] = [[startRow, startCol]];
    const visitedLocal = new Set<string>();

    while (queue.length > 0) {
      const [row, col] = queue.shift()!;
      const cellKey = `${row}-${col}`;

      if (visitedLocal.has(cellKey) || visitedGlobal.has(cellKey)) continue;
      if (row < 0 || row >= config.rows || col < 0 || col >= config.cols)
        continue;
      if (board[row][col] !== buildingType) continue;

      visitedLocal.add(cellKey);
      visitedGlobal.add(cellKey);
      group.push([row, col]);

      // Add adjacent cells (not diagonal)
      queue.push([row - 1, col]); // up
      queue.push([row + 1, col]); // down
      queue.push([row, col - 1]); // left
      queue.push([row, col + 1]); // right
    }

    return group;
  }

  /**
   * Gets the point value for a specific cell
   */
  getCellPoints(row: number, col: number, config: GameConfig): number {
    return config.pointMatrix[row]?.[col] || 0;
  }

  /**
   * Show visual highlighting for scoring street and groups
   */
  showScoringVisualization(
    diceSum: number,
    board: Board,
    config: GameConfig
  ): void {
    const targetRow = this.getTargetRowFromDiceSum(diceSum, false, config);
    if (targetRow === -1) return;

    this._currentScoringStreet.set(targetRow);

    // Find all scoring groups
    const visitedCells = new Set<string>();
    const scoringGroups = new Set<string>();

    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        const cellKey = `${row}-${col}`;
        if (visitedCells.has(cellKey)) continue;

        const building = board[row][col];
        if (!building || building === Buildings.SQUARE) continue;

        // Find connected group
        const group = this.findConnectedGroup(
          board,
          row,
          col,
          building,
          visitedCells,
          config
        );

        // Check if this group has buildings on target street
        const hasBuildingOnTargetStreet = group.some(
          ([r, c]) => r === targetRow
        );

        if (hasBuildingOnTargetStreet) {
          // Add all cells in this scoring group
          group.forEach(([r, c]) => {
            scoringGroups.add(`${r}-${c}`);
          });
        }
      }
    }

    this._currentScoringGroups.set(scoringGroups);
  }

  /**
   * Clear scoring visualization
   */
  clearScoringVisualization(): void {
    this._currentScoringStreet.set(-1);
    this._currentScoringGroups.set(new Set());
  }

  /**
   * Check if a cell is part of current scoring visualization
   */
  isCellInScoringGroup(row: number, col: number): boolean {
    return this._currentScoringGroups().has(`${row}-${col}`);
  }

  /**
   * Check if a row is the current scoring street
   */
  isRowScoringStreet(row: number): boolean {
    return this._currentScoringStreet() === row;
  }
}
