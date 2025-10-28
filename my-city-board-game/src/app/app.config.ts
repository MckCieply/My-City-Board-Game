import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';

import {
  Check,
  House,
  LucideAngularModule,
  Plus,
  TreeDeciduous,
  Waves,
} from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    importProvidersFrom(
      LucideAngularModule.pick({ Plus, Check, House, TreeDeciduous, Waves }),
    ),
  ],
};
