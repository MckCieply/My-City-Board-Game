import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-scoreboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scoreboard.component.html',
  styleUrl: './scoreboard.component.scss',
})
export class ScoreboardComponent {
  // Inputs
  footerScores = input<number[]>([]);
  bonusStageRounds = input<number[]>([]);
  plazaBonus = input<number>(0);
  
  // Outputs
  playAgain = output<void>();

  /**
   * Calculate total score from all rounds (without plaza bonus)
   */
  getRoundsTotal(): number {
    return this.footerScores().reduce((sum, score) => sum + score, 0);
  }

  /**
   * Calculate total score including plaza bonus
   */
  getTotalScore(): number {
    return this.getRoundsTotal() + this.plazaBonus();
  }

  /**
   * Check if a round is a bonus stage round
   */
  isBonusRound(roundIndex: number): boolean {
    return this.bonusStageRounds().includes(roundIndex + 1);
  }

  /**
   * Emit play again event
   */
  onPlayAgain(): void {
    this.playAgain.emit();
  }
}
