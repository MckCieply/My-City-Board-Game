/**
 * Game configuration interface
 * Contains all constant values used throughout the game
 */
export interface GameConfig {
  rows: number;
  cols: number;
  maxRounds: number;
  bonusStageRounds: number[];
  rowLabels: string[];
  colLabels: string[];
  pointMatrix: number[][];
}

/**
 * Default game configuration
 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  rows: 5,
  cols: 6,
  maxRounds: 9,
  bonusStageRounds: [3, 6, 9],
  rowLabels: ['(3, 4)', '(5, 6)', '(7)', '(8, 9)', '(10, 11)'],
  colLabels: ['1', '2', '3', '4', '5', '6'],
  pointMatrix: [
    [3, 0, 2, 2, 0, 3], // Row 0: (3, 4)
    [0, 1, 0, 0, 1, 0], // Row 1: (5, 6)
    [2, 0, 1, 1, 0, 2], // Row 2: (7)
    [0, 1, 0, 0, 1, 0], // Row 3: (8, 9)
    [3, 0, 2, 2, 0, 3], // Row 4: (10, 11)
  ],
};
