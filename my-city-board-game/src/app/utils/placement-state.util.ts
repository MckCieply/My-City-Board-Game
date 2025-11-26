import { PlacementState } from '../models/placement-state.model';

/**
 * Utility functions for checking placement state types
 */

export function isPreparationPhase(state: PlacementState): boolean {
  return state === PlacementState.PREP_FIRST ||
         state === PlacementState.PREP_SECOND ||
         state === PlacementState.PREP_DOUBLES_FIRST ||
         state === PlacementState.PREP_DOUBLES_SECOND;
}

export function isBonusStage(state: PlacementState): boolean {
  return state === PlacementState.BONUS;
}

export function isDoublesState(state: PlacementState): boolean {
  return state === PlacementState.DOUBLES_FIRST ||
         state === PlacementState.DOUBLES_SQUARE ||
         state === PlacementState.PREP_DOUBLES_FIRST ||
         state === PlacementState.PREP_DOUBLES_SECOND;
}

export function isFirstPlacement(state: PlacementState): boolean {
  return state === PlacementState.FIRST ||
         state === PlacementState.DOUBLES_FIRST ||
         state === PlacementState.PREP_FIRST ||
         state === PlacementState.PREP_DOUBLES_FIRST;
}

export function isSecondPlacement(state: PlacementState): boolean {
  return state === PlacementState.SECOND ||
         state === PlacementState.DOUBLES_SQUARE ||
         state === PlacementState.PREP_SECOND ||
         state === PlacementState.PREP_DOUBLES_SECOND;
}
