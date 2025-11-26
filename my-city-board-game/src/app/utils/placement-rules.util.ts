import { Board } from '../models/board.model';
import { Buildings, getBuildingFromDice } from '../models/buildings.model';
import { PlacementState } from '../models/placement-state.model';

/**
 * Pure utility functions for placement rules and validation
 * No state, only business logic
 */

/**
 * Checks if a column is completely full
 */
function isColumnFull(board: Board, col: number): boolean {
  for (let row = 0; row < board.length; row++) {
    if (board[row][col] === null) {
      return false;
    }
  }
  return true;
}

/**
 * Counts empty spaces in a column
 */
function countEmptySpaces(board: Board, col: number): number {
  let count = 0;
  for (let row = 0; row < board.length; row++) {
    if (board[row][col] === null) {
      count++;
    }
  }
  return count;
}

/**
 * Gets adjacent columns when the target column is full
 * Returns columns with more empty spaces, or both if equal
 */
function getAdjacentColumns(board: Board, targetCol: number, totalCols: number): number[] {
  const leftCol = targetCol - 1;
  const rightCol = targetCol + 1;
  
  const hasLeft = leftCol >= 0;
  const hasRight = rightCol < totalCols;
  
  if (!hasLeft && !hasRight) {
    return []; // No adjacent columns (edge case)
  }
  
  if (!hasLeft) {
    return [rightCol]; // Only right exists
  }
  
  if (!hasRight) {
    return [leftCol]; // Only left exists
  }
  
  // Both exist, check which has more empty spaces
  const leftEmpty = countEmptySpaces(board, leftCol);
  const rightEmpty = countEmptySpaces(board, rightCol);
  
  if (leftEmpty > rightEmpty) {
    return [leftCol];
  } else if (rightEmpty > leftEmpty) {
    return [rightCol];
  } else {
    // Equal empty spaces, player can choose
    return [leftCol, rightCol];
  }
}

/**
 * Determines the allowed columns for a placement based on state and rolls
 * Returns array of allowed column indices, or null if any column is allowed
 * If target column is full, returns adjacent columns based on empty space count
 */
export function getAllowedColumns(
  state: PlacementState,
  rolls: number[],
  board: Board,
  totalCols: number = 6
): number[] | null {
  if (rolls.length < 2) return null;

  let targetColumn: number | null = null;

  switch (state) {
    case PlacementState.PREP_FIRST:
      targetColumn = rolls[0] - 1;
      break;
    case PlacementState.PREP_SECOND:
      targetColumn = rolls[1] - 1;
      break;
    case PlacementState.PREP_DOUBLES_FIRST:
    case PlacementState.PREP_DOUBLES_SECOND:
      targetColumn = rolls[0] - 1;
      break;
    case PlacementState.FIRST:
      targetColumn = rolls[0] - 1;
      break;
    case PlacementState.SECOND:
      targetColumn = rolls[1] - 1;
      break;
    case PlacementState.DOUBLES_FIRST:
      targetColumn = rolls[0] - 1;
      break;
    case PlacementState.DOUBLES_SQUARE:
      return null; // Any column allowed
    default:
      return null;
  }

  if (targetColumn === null) {
    return null;
  }

  // Check if target column is full
  if (isColumnFull(board, targetColumn)) {
    // Return adjacent columns
    return getAdjacentColumns(board, targetColumn, totalCols);
  }

  // Target column has space, only allow that column
  return [targetColumn];
}



/**
 * Determines which building should be placed based on state, rolls, and selection
 * @returns Building to place or null if invalid
 */
export function getBuildingToPlace(
  state: PlacementState,
  rolls: number[],
  selectedBuilding?: Buildings | null
): Buildings | null {
  if (rolls.length < 2 && state !== PlacementState.BONUS) return null;

  // Preparation phase states require selected building
  if (
    state === PlacementState.PREP_FIRST ||
    state === PlacementState.PREP_SECOND ||
    state === PlacementState.PREP_DOUBLES_FIRST ||
    state === PlacementState.PREP_DOUBLES_SECOND
  ) {
    return selectedBuilding || null;
  }

  // Bonus stage requires selected building
  if (state === PlacementState.BONUS) {
    return selectedBuilding || null;
  }

  // Regular game states use dice to determine building
  switch (state) {
    case PlacementState.FIRST:
      return getBuildingFromDice(rolls[1]);
    case PlacementState.SECOND:
      return getBuildingFromDice(rolls[0]);
    case PlacementState.DOUBLES_FIRST:
      return getBuildingFromDice(rolls[0]);
    case PlacementState.DOUBLES_SQUARE:
      return Buildings.SQUARE;
    default:
      return null;
  }
}

/**
 * Checks if a cell can be clicked/placed based on all game rules
 */
export function canPlaceInCell(
  row: number,
  col: number,
  state: PlacementState,
  rolls: number[] | null,
  board: Board,
  selectedBuilding: Buildings | null | undefined,
  currentTurnPlacements: Set<string>,
  availableBonusBuildings: Buildings[],
  totalCols: number = 6
): boolean {
  // Bonus stage has special rules (doesn't need dice)
  if (state === PlacementState.BONUS) {
    if (!selectedBuilding) return false;
    if (!availableBonusBuildings.includes(selectedBuilding)) return false;

    const cellKey = `${row}-${col}`;
    return board[row][col] === null || currentTurnPlacements.has(cellKey);
  }

  // Regular phases need dice rolled
  if (!rolls || rolls.length < 2) return false;

  // Can't place if both placements are complete
  if (state === PlacementState.COMPLETE) return false;

  // Check if cell is occupied by a previous turn building
  const cellKey = `${row}-${col}`;
  if (board[row][col] !== null) {
    if (!currentTurnPlacements.has(cellKey)) {
      return false; // Can't replace buildings from previous turns
    }
  }

  // Preparation phases need building selected
  if (
    (state === PlacementState.PREP_FIRST ||
      state === PlacementState.PREP_SECOND ||
      state === PlacementState.PREP_DOUBLES_FIRST ||
      state === PlacementState.PREP_DOUBLES_SECOND) &&
    !selectedBuilding
  ) {
    return false;
  }

  // Check column restriction with full column fallback logic
  const allowedColumns = getAllowedColumns(state, rolls, board, totalCols);
  if (allowedColumns !== null && !allowedColumns.includes(col)) {
    return false;
  }

  return true;
}

/**
 * Determines the next placement state after a placement is made
 */
export function getNextPlacementState(
  currentState: PlacementState,
  firstTurnPlaced: boolean,
  secondTurnPlaced: boolean
): PlacementState {
  switch (currentState) {
    case PlacementState.PREP_FIRST:
      return PlacementState.PREP_SECOND;

    case PlacementState.PREP_DOUBLES_FIRST:
      return PlacementState.PREP_DOUBLES_SECOND;

    case PlacementState.FIRST:
      // Check if both turns are complete after marking first as placed
      if (secondTurnPlaced) {
        return PlacementState.COMPLETE;
      }
      return PlacementState.SECOND;

    case PlacementState.SECOND:
      // Check if both turns are complete after marking second as placed
      if (firstTurnPlaced) {
        return PlacementState.COMPLETE;
      }
      return PlacementState.FIRST;

    case PlacementState.DOUBLES_FIRST:
      // Check if both turns are complete after marking first as placed
      if (secondTurnPlaced) {
        return PlacementState.COMPLETE;
      }
      return PlacementState.DOUBLES_SQUARE;

    case PlacementState.DOUBLES_SQUARE:
      // Check if both turns are complete after marking second as placed
      if (firstTurnPlaced) {
        return PlacementState.COMPLETE;
      }
      return PlacementState.DOUBLES_FIRST;

    case PlacementState.PREP_SECOND:
      // Check if first turn was placed before completing prep phase
      if (firstTurnPlaced) {
        return PlacementState.COMPLETE;
      }
      return PlacementState.PREP_FIRST;

    case PlacementState.PREP_DOUBLES_SECOND:
      // Check if first turn was placed before completing prep phase
      if (firstTurnPlaced) {
        return PlacementState.COMPLETE;
      }
      return PlacementState.PREP_DOUBLES_FIRST;

    default:
      return currentState;
  }
}

/**
 * Checks if the current state should trigger turn tracking
 * (FIRST, SECOND, DOUBLES_FIRST, DOUBLES_SQUARE, and PREP states track individual turns)
 */
export function shouldTrackTurnPlacement(state: PlacementState): boolean {
  return state === PlacementState.FIRST || 
         state === PlacementState.SECOND ||
         state === PlacementState.DOUBLES_FIRST ||
         state === PlacementState.DOUBLES_SQUARE ||
         state === PlacementState.PREP_FIRST ||
         state === PlacementState.PREP_SECOND ||
         state === PlacementState.PREP_DOUBLES_FIRST ||
         state === PlacementState.PREP_DOUBLES_SECOND;
}
