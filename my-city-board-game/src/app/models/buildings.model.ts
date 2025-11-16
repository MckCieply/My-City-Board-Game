export enum Buildings {
  // Nr 1 i 4
  HOUSE = 'house',
  // Nr 3 i 6
  LAKE = 'waves',
  // Nr 2 i 5
  FOREST = 'tree-deciduous',
  SQUARE = 'flag-triangle-right',
}

/**
 * Determines which building can be placed based on dice value
 * @param diceValue The value of the dice (1-6)
 * @returns The building type that corresponds to the dice value
 */
export function getBuildingFromDice(diceValue: number): Buildings {
  switch (diceValue) {
    case 1:
    case 4:
      return Buildings.HOUSE;
    case 3:
    case 6:
      return Buildings.LAKE;
    case 2:
    case 5:
      return Buildings.FOREST;
    default:
      throw new Error(`Invalid dice value: ${diceValue}`);
  }
}

/**
 * Gets the display name for a building enum value
 * @param building The building enum value
 * @returns The user-friendly display name
 */
export function getBuildingDisplayName(building: Buildings): string {
  switch (building) {
    case Buildings.HOUSE:
      return 'House';
    case Buildings.LAKE:
      return 'Lake';
    case Buildings.FOREST:
      return 'Forest';
    case Buildings.SQUARE:
      return 'Square';
    default:
      return 'Building';
  }
}
