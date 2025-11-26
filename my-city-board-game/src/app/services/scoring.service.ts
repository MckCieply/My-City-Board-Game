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
  private _showPlazaBonus = signal<boolean>(false);

  // Expose readonly signals directly
  readonly currentScoringStreet = this._currentScoringStreet.asReadonly();
  readonly currentScoringGroups = this._currentScoringGroups.asReadonly();
  readonly showPlazaBonus = this._showPlazaBonus.asReadonly();

  /**
   * Calculate score for a specific street (row) based on dice sum
   */
  calculateStreetScore(
    diceSum: number,
    board: Board,
    config: GameConfig,
    selectedRow: number | null = null
  ): number {
    const targetRow = this.getTargetRowFromDiceSum(
      diceSum,
      config,
      selectedRow
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
    config: GameConfig,
    selectedRow: number | null = null
  ): number {
    if (diceSum === 2 || diceSum === 12) {
      // Player can choose which row to score
      return selectedRow !== null ? selectedRow : -1;
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
    config: GameConfig,
    selectedRow: number | null = null
  ): void {
    const targetRow = this.getTargetRowFromDiceSum(diceSum, config, selectedRow);
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
   * Show plaza bonus visualization
   */
  showPlazaBonusVisualization(): void {
    this._showPlazaBonus.set(true);
  }

  /**
   * Clear scoring visualization
   */
  clearScoringVisualization(): void {
    this._currentScoringStreet.set(-1);
    this._currentScoringGroups.set(new Set());
    this._showPlazaBonus.set(false);
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

  /**
   * Check if a plaza (square) is adjacent to house, forest, and lake
   * Returns true if the plaza has all three building types as neighbors (horizontal/vertical only)
   */
  isPlazaAdjacentToAllThree(
    board: Board,
    row: number,
    col: number,
    config: GameConfig
  ): boolean {
    const neighbors = new Set<Buildings>();

    // Check all four adjacent cells (up, down, left, right)
    const adjacentPositions = [
      [row - 1, col], // up
      [row + 1, col], // down
      [row, col - 1], // left
      [row, col + 1], // right
    ];

    for (const [r, c] of adjacentPositions) {
      if (r >= 0 && r < config.rows && c >= 0 && c < config.cols) {
        const building = board[r][c];
        if (building && building !== Buildings.SQUARE) {
          neighbors.add(building);
        }
      }
    }

    // Check if plaza is adjacent to all three types
    return (
      neighbors.has(Buildings.HOUSE) &&
      neighbors.has(Buildings.FOREST) &&
      neighbors.has(Buildings.LAKE)
    );
  }

  /**
   * Get all plazas that qualify for bonus and their adjacent buildings
   * Returns array of objects with plaza location and adjacent building locations
   */
  getPlazaBonusCells(board: Board, config: GameConfig): Array<{
    plaza: { row: number; col: number };
    adjacentBuildings: Array<{ row: number; col: number; building: Buildings }>;
  }> {
    const result: Array<{
      plaza: { row: number; col: number };
      adjacentBuildings: Array<{ row: number; col: number; building: Buildings }>;
    }> = [];

    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        const building = board[row][col];
        
        // Check if it's a plaza/square
        if (building === Buildings.SQUARE) {
          if (this.isPlazaAdjacentToAllThree(board, row, col, config)) {
            // Get the adjacent buildings that contribute to the bonus
            const adjacentBuildings: Array<{ row: number; col: number; building: Buildings }> = [];
            const adjacentPositions = [
              [row - 1, col], // up
              [row + 1, col], // down
              [row, col - 1], // left
              [row, col + 1], // right
            ];

            for (const [r, c] of adjacentPositions) {
              if (r >= 0 && r < config.rows && c >= 0 && c < config.cols) {
                const adjBuilding = board[r][c];
                if (adjBuilding && adjBuilding !== Buildings.SQUARE) {
                  adjacentBuildings.push({ row: r, col: c, building: adjBuilding });
                }
              }
            }

            result.push({
              plaza: { row, col },
              adjacentBuildings
            });
          }
        }
      }
    }

    return result;
  }

  /**
   * Calculate bonus points for plazas
   * Each plaza adjacent to house, forest, and lake gets 10 points
   */
  calculatePlazaBonus(board: Board, config: GameConfig): number {
    let bonusScore = 0;

    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        const building = board[row][col];
        
        // Check if it's a plaza/square
        if (building === Buildings.SQUARE) {
          if (this.isPlazaAdjacentToAllThree(board, row, col, config)) {
            bonusScore += 10;
          }
        }
      }
    }

    return bonusScore;
  }
}
