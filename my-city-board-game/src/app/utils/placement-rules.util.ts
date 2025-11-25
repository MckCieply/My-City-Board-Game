import { Board } from '../models/board.model';
import { Buildings, getBuildingFromDice } from '../models/buildings.model';
import { PlacementState } from '../models/placement-state.model';

/**
 * Pure utility functions for placement rules and validation
 * No state, only business logic
 */

/**
 * Determines the allowed column for a placement based on state and rolls
 * @returns column index (0-5) or null if any column is allowed
 */
export function getAllowedColumn(
  state: PlacementState,
  rolls: number[]
): number | null {
  if (rolls.length < 2) return null;

  switch (state) {
    case PlacementState.PREP_FIRST:
      return rolls[0] - 1;
    case PlacementState.PREP_SECOND:
      return rolls[1] - 1;
    case PlacementState.PREP_DOUBLES_FIRST:
    case PlacementState.PREP_DOUBLES_SECOND:
      return rolls[0] - 1;
    case PlacementState.FIRST:
      return rolls[0] - 1;
    case PlacementState.SECOND:
      return rolls[1] - 1;
    case PlacementState.DOUBLES_FIRST:
      return rolls[0] - 1;
    case PlacementState.DOUBLES_SQUARE:
      return null; // Any column allowed
    default:
      return null;
  }
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
  availableBonusBuildings: Buildings[]
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

  // Check column restriction
  const allowedColumn = getAllowedColumn(state, rolls);
  if (allowedColumn !== null && col !== allowedColumn) {
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
      return PlacementState.DOUBLES_SQUARE;

    case PlacementState.PREP_SECOND:
    case PlacementState.PREP_DOUBLES_SECOND:
    case PlacementState.DOUBLES_SQUARE:
      return PlacementState.COMPLETE;

    default:
      return currentState;
  }
}

/**
 * Checks if the current state should trigger turn tracking
 * (Only FIRST and SECOND states track individual turns)
 */
export function shouldTrackTurnPlacement(state: PlacementState): boolean {
  return state === PlacementState.FIRST || state === PlacementState.SECOND;
}
