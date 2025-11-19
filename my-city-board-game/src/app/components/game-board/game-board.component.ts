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
  placementState = input<PlacementState>(PlacementState.PREP_FIRST);
  selectedBuilding = input<Buildings | null | undefined>(undefined);
  placementStateChanged = output<PlacementState>();

  //TODO: Move to config
  private readonly rows = 5;
  private readonly cols = 6;

  // Labels for rows and columns
  readonly rowLabels = ['(3, 4)', '(5, 6)', '(7)', '(8, 9)', '(10, 11)'];
  readonly colLabels = ['1', '2', '3', '4', '5', '6'];

  board = signal<Board>(this.createEmptyBoard(this.rows, this.cols));
  
  // Game state tracking
  currentRound = signal<number>(0); // 0 = preparation phase, 1-9 = actual rounds
  maxRounds = 9;
  footerScores = signal<number[]>(Array(9).fill(0));
  gameComplete = signal<boolean>(false);
  inPreparationPhase = signal<boolean>(true);
  
  // Scoring visualization
  currentScoringStreet = signal<number>(-1);
  currentScoringGroups = signal<Set<string>>(new Set());

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
   * Helper method to create array for footer columns
   */
  getFooterColumns(): number[] {
    return Array.from({ length: 9 }, (_, i) => i);
  }

  /**
   * Calculate score for a specific street (row) based on dice sum
   */
  calculateStreetScore(diceSum: number, playerCanChoose = false): number {
    let targetRow = this.getTargetRowFromDiceSum(diceSum, playerCanChoose);
    if (targetRow === -1) return 0;

    const currentBoard = this.board();
    let totalScore = 0;
    
    // Find all building groups and check if they have buildings on the target street
    const visitedCells = new Set<string>();
    
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cellKey = `${row}-${col}`;
        if (visitedCells.has(cellKey)) continue;
        
        const building = currentBoard[row][col];
        if (!building || building === Buildings.SQUARE) continue; // Skip empty cells and squares
        
        // Find all connected buildings of the same type
        const group = this.findConnectedGroup(currentBoard, row, col, building, visitedCells);
        
        // Check if this group has at least one building on the target street
        const hasBuildingOnTargetStreet = group.some(([r, c]) => r === targetRow);
        
        if (hasBuildingOnTargetStreet) {
          // Calculate points for this entire group
          const groupScore = group.reduce((sum, [r, c]) => {
            return sum + this.getCellPoints(r, c);
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
  private getTargetRowFromDiceSum(diceSum: number, playerCanChoose: boolean): number {
    if (diceSum === 2 || diceSum === 12) {
      // Player can choose - for now return -1 to indicate choice needed
      return playerCanChoose ? -1 : 0; // Default to first row if not choosing
    }
    
    // Map dice sum to row index
    const sumToRowMap: { [key: number]: number } = {
      3: 0, 4: 0,    // (3, 4) -> row 0
      5: 1, 6: 1,    // (5, 6) -> row 1  
      7: 2,          // (7) -> row 2
      8: 3, 9: 3,    // (8, 9) -> row 3
      10: 4, 11: 4   // (10, 11) -> row 4
    };
    
    return sumToRowMap[diceSum] ?? -1;
  }

  /**
   * Find all connected buildings of the same type using BFS
   */
  private findConnectedGroup(
    board: Board, 
    startRow: number, 
    startCol: number, 
    buildingType: Buildings,
    visitedGlobal: Set<string>
  ): [number, number][] {
    const group: [number, number][] = [];
    const queue: [number, number][] = [[startRow, startCol]];
    const visitedLocal = new Set<string>();
    
    while (queue.length > 0) {
      const [row, col] = queue.shift()!;
      const cellKey = `${row}-${col}`;
      
      if (visitedLocal.has(cellKey) || visitedGlobal.has(cellKey)) continue;
      if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) continue;
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
   * Complete the current round and calculate scoring
   */
  completeRound(): void {
    const rolls = this.currentRolls();
    if (!rolls || rolls.length !== 2) return;
    
    // Handle preparation phase differently (no scoring)
    if (this.inPreparationPhase()) {
      console.log('Preparation phase complete! Starting round 1.');
      this.inPreparationPhase.set(false);
      this.currentRound.set(1);
      
      // Transition to regular game state - emit the appropriate first state
      setTimeout(() => {
        const currentRolls = this.currentRolls();
        if (currentRolls && currentRolls.length === 2) {
          if (currentRolls[0] === currentRolls[1]) {
            this.placementStateChanged.emit(PlacementState.DOUBLES_FIRST);
          } else {
            this.placementStateChanged.emit(PlacementState.FIRST);
          }
        }
      }, 100);
      return;
    }
    
    const diceSum = rolls[0] + rolls[1];
    
    // Show scoring visualization
    this.showScoringVisualization(diceSum);
    
    // Calculate score after a brief delay to show the visualization
    setTimeout(() => {
      const score = this.calculateStreetScore(diceSum);
      
      // Update footer scores for current round
      const currentScores = this.footerScores();
      const roundIndex = this.currentRound() - 1;
      if (roundIndex >= 0 && roundIndex < this.maxRounds) {
        currentScores[roundIndex] = score;
        this.footerScores.set([...currentScores]);
      }
      
      console.log(`Round ${this.currentRound()} complete: Dice sum ${diceSum}, Score: ${score}`);
      
      // Clear visualization after scoring
      setTimeout(() => {
        this.clearScoringVisualization();
        
        // Advance to next round
        const nextRound = this.currentRound() + 1;
        if (nextRound <= this.maxRounds) {
          this.currentRound.set(nextRound);
        } else {
          this.gameComplete.set(true);
          console.log('Game Complete! Final scores:', this.footerScores());
        }
      }, 2000);
    }, 500);
  }

  /**
   * Get total score across all rounds
   */
  getTotalScore(): number {
    return this.footerScores().reduce((sum, score) => sum + score, 0);
  }

  /**
   * Reset game to initial state
   */
  resetGame(): void {
    this.currentRound.set(0);
    this.inPreparationPhase.set(true);
    this.footerScores.set(Array(9).fill(0));
    this.gameComplete.set(false);
    this.board.set(this.createEmptyBoard(this.rows, this.cols));
    this.clearScoringVisualization();
  }

  /**
   * Show visual highlighting for scoring street and groups
   */
  showScoringVisualization(diceSum: number): void {
    const targetRow = this.getTargetRowFromDiceSum(diceSum, false);
    if (targetRow === -1) return;

    this.currentScoringStreet.set(targetRow);

    // Find all scoring groups
    const currentBoard = this.board();
    const visitedCells = new Set<string>();
    const scoringGroups = new Set<string>();

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cellKey = `${row}-${col}`;
        if (visitedCells.has(cellKey)) continue;

        const building = currentBoard[row][col];
        if (!building || building === Buildings.SQUARE) continue;

        // Find connected group
        const group = this.findConnectedGroup(currentBoard, row, col, building, visitedCells);
        
        // Check if this group has buildings on target street
        const hasBuildingOnTargetStreet = group.some(([r, c]) => r === targetRow);
        
        if (hasBuildingOnTargetStreet) {
          // Add all cells in this scoring group
          group.forEach(([r, c]) => {
            scoringGroups.add(`${r}-${c}`);
          });
        }
      }
    }

    this.currentScoringGroups.set(scoringGroups);
  }

  /**
   * Clear scoring visualization
   */
  clearScoringVisualization(): void {
    this.currentScoringStreet.set(-1);
    this.currentScoringGroups.set(new Set());
  }

  /**
   * Check if a cell is part of current scoring visualization
   */
  isCellInScoringGroup(row: number, col: number): boolean {
    return this.currentScoringGroups().has(`${row}-${col}`);
  }

  /**
   * Check if a row is the current scoring street
   */
  isRowScoringStreet(row: number): boolean {
    return this.currentScoringStreet() === row;
  }

  /**
   * Gets the current placement instruction text
   */
  getCurrentPlacementText(): string {
    const rolls = this.currentRolls();
    const state = this.placementState();
    const round = this.currentRound();
    
    if (this.gameComplete()) {
      return `Game Complete! Total Score: ${this.getTotalScore()}`;
    }

    if (!rolls || rolls.length < 2) {
      if (this.inPreparationPhase()) {
        return `Preparation Phase - Roll dice to start!`;
      }
      return `Round ${round}/${this.maxRounds} - Roll dice to start!`;
    }

    switch (state) {
      case PlacementState.PREP_FIRST:
        const selectedBuilding = this.selectedBuilding();
        if (!selectedBuilding) {
          return `Preparation - First placement: Column ${rolls[0]} - Select a building first!`;
        }
        return `Preparation - First placement: Column ${rolls[0]} - Place ${this.getBuildingDisplayName(selectedBuilding)}`;
      case PlacementState.PREP_SECOND:
        const selectedBuilding2 = this.selectedBuilding();
        if (!selectedBuilding2) {
          return `Preparation - Second placement: Column ${rolls[1]} - Select a building first!`;
        }
        return `Preparation - Second placement: Column ${rolls[1]} - Place ${this.getBuildingDisplayName(selectedBuilding2)}`;
      case PlacementState.PREP_DOUBLES_FIRST:
        const selectedBuilding3 = this.selectedBuilding();
        if (!selectedBuilding3) {
          return `Preparation - Doubles! First placement: Column ${rolls[0]} - Select a building first!`;
        }
        return `Preparation - Doubles! First placement: Place ${this.getBuildingDisplayName(selectedBuilding3)} in column ${rolls[0]}`;
      case PlacementState.PREP_DOUBLES_SECOND:
        const selectedBuilding4 = this.selectedBuilding();
        if (!selectedBuilding4) {
          return `Preparation - Doubles! Second placement: Column ${rolls[0]} - Select a building first!`;
        }
        return `Preparation - Doubles! Second placement: Place ${this.getBuildingDisplayName(selectedBuilding4)} in column ${rolls[0]}`;
      case PlacementState.FIRST:
        const firstBuilding = this.getBuildingDisplayName(
          getBuildingFromDice(rolls[1]),
        );
        return `Round ${round} - First placement: Column ${rolls[0]} - Place ${firstBuilding}`;
      case PlacementState.SECOND:
        const secondBuilding = this.getBuildingDisplayName(
          getBuildingFromDice(rolls[0]),
        );
        return `Round ${round} - Second placement: Column ${rolls[1]} - Place ${secondBuilding}`;
      case PlacementState.DOUBLES_FIRST:
        const doublesBuilding = this.getBuildingDisplayName(
          getBuildingFromDice(rolls[0]),
        );
        return `Round ${round} - Doubles! Place ${doublesBuilding} in column ${rolls[0]}`;
      case PlacementState.DOUBLES_SQUARE:
        return `Round ${round} - Place Square anywhere on empty space`;
      case PlacementState.COMPLETE:
        if (this.inPreparationPhase()) {
          return 'Preparation complete! Roll dice for next turn.';
        }
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

    // Handle preparation phase states
    if (currentPlacementState === PlacementState.PREP_FIRST) {
      const selectedBuildingValue = this.selectedBuilding();
      if (!selectedBuildingValue) return; // Don't allow placement without selection
      columnDice = rolls[0];
      allowedColumn = columnDice - 1;
      buildingToPlace = selectedBuildingValue;
    } else if (currentPlacementState === PlacementState.PREP_SECOND) {
      const selectedBuildingValue = this.selectedBuilding();
      if (!selectedBuildingValue) return; // Don't allow placement without selection
      columnDice = rolls[1];
      allowedColumn = columnDice - 1;
      buildingToPlace = selectedBuildingValue;
    } else if (currentPlacementState === PlacementState.PREP_DOUBLES_FIRST) {
      const selectedBuildingValue = this.selectedBuilding();
      if (!selectedBuildingValue) return; // Don't allow placement without selection
      columnDice = rolls[0];
      allowedColumn = columnDice - 1;
      buildingToPlace = selectedBuildingValue;
    } else if (currentPlacementState === PlacementState.PREP_DOUBLES_SECOND) {
      const selectedBuildingValue = this.selectedBuilding();
      if (!selectedBuildingValue) return; // Don't allow placement without selection
      columnDice = rolls[0]; // Same column as first placement
      allowedColumn = columnDice - 1;
      buildingToPlace = selectedBuildingValue;
    }
    // Handle regular game states
    else if (currentPlacementState === PlacementState.FIRST) {
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

    // Cell is empty and in correct column: Place the building
    this.board.update((currentBoard) => {
      const newBoard = currentBoard.map((r) => [...r]);
      newBoard[row][col] = buildingToPlace;

      // Update placement state
      if (currentPlacementState === PlacementState.PREP_FIRST) {
        this.placementStateChanged.emit(PlacementState.PREP_SECOND);
        console.log('Now place your second building!');
      } else if (currentPlacementState === PlacementState.PREP_DOUBLES_FIRST) {
        this.placementStateChanged.emit(PlacementState.PREP_DOUBLES_SECOND);
      } else if (currentPlacementState === PlacementState.FIRST) {
        this.placementStateChanged.emit(PlacementState.SECOND);
        console.log('Now place your second building!');
      } else if (currentPlacementState === PlacementState.DOUBLES_FIRST) {
        this.placementStateChanged.emit(PlacementState.DOUBLES_SQUARE);
      } else {
        // Round is complete - trigger scoring (only in regular game phase)
        if (!this.inPreparationPhase()) {
          this.completeRound();
        }
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

    // During preparation phase, must have building selected
    if ((currentPlacementState === PlacementState.PREP_FIRST || 
         currentPlacementState === PlacementState.PREP_SECOND || 
         currentPlacementState === PlacementState.PREP_DOUBLES_FIRST ||
         currentPlacementState === PlacementState.PREP_DOUBLES_SECOND) &&
        !this.selectedBuilding()) {
      return false;
    }

    // Determine allowed column based on placement state
    let allowedColumn: number;

    if (currentPlacementState === PlacementState.PREP_FIRST) {
      // Preparation first placement: first die determines column
      allowedColumn = rolls[0] - 1;
    } else if (currentPlacementState === PlacementState.PREP_SECOND) {
      // Preparation second placement: second die determines column
      allowedColumn = rolls[1] - 1;
    } else if (currentPlacementState === PlacementState.PREP_DOUBLES_FIRST) {
      // Preparation doubles first placement: dice value determines column
      allowedColumn = rolls[0] - 1;
    } else if (currentPlacementState === PlacementState.PREP_DOUBLES_SECOND) {
      // Preparation doubles second placement: same column as first
      allowedColumn = rolls[0] - 1;
    } else if (currentPlacementState === PlacementState.FIRST) {
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
