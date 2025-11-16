import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LucideAngularModule } from 'lucide-angular';
import { Buildings } from '../../models/buildings.model';
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, LucideAngularModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  Buildings = Buildings;
  buttonClicked = output<Buildings>();
  selectedBuilding = input<Buildings | null>(null);

  onButtonClicked(action: Buildings): void {
    this.buttonClicked.emit(action);
  }

  isSelected(building: Buildings): boolean {
    return this.selectedBuilding() === building;
  }
}
