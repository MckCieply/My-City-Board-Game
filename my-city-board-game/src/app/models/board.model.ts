import { Buildings } from './buildings.model';

/**
 * Represents a single cell on the game board
 * Can contain a building or be null (empty)
 */
export type Cell = Buildings | null;

/**
 * Represents the game board as a 2D array of cells
 */
export type Board = Cell[][];

/**
 * Represents a position on the board
 */
export interface CellPosition {
  row: number;
  col: number;
}

/**
 * Represents a cell key for tracking (e.g., "2-3" for row 2, col 3)
 */
export type CellKey = string;
