import { Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Buildings, getBuildingDisplayName } from '../../models/buildings.model';

@Component({
  selector: 'app-game-footer',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './game-footer.component.html',
  styleUrl: './game-footer.component.scss',
})
export class GameFooterComponent {
  // Input properties
  footerScores = input<number[]>([]);
  currentRound = input<number>(0);
  bonusStageRounds = input<number[]>([]);
  bonusStageBuildings = input<Map<number, Buildings>>(new Map());
  totalScore = input<number>(0);

  /**
   * Helper method to create array for footer columns
   */
  getFooterColumns(): number[] {
    return Array.from({ length: 9 }, (_, i) => i);
  }

  /**
   * Checks if a round is a bonus stage round
   */
  isBonusStageRound(roundNumber: number): boolean {
    return this.bonusStageRounds().includes(roundNumber);
  }

  /**
   * Gets the building used in a specific bonus stage
   */
  getBonusStageBuilding(roundNumber: number): Buildings | null {
    if (!this.isBonusStageRound(roundNumber)) return null;
    
    const roundBuildings = this.bonusStageBuildings();
    return roundBuildings.get(roundNumber) || null;
  }

  /**
   * Gets the display name for a building
   */
  getBuildingDisplayName(building: Buildings): string {
    return getBuildingDisplayName(building);
  }
}