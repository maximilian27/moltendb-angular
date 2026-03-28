import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {provideMoltenDB} from "@moltendb-web/angular";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideMoltenDB({
      name: 'local_test_db',
      workerUrl: '/moltendb-worker.js'
    })
  ]
};
