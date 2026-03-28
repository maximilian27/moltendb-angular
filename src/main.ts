import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

// npm install ./public/moltendb-web/packages/core/moltendb-web-core-
// 1.0.0-rc.1.tgz
// npm install ./public/moltendb-web/packages/query/moltendb-web-query-1.0.0-rc.1.tgz
// npm install ./public/moltendb-web/packages/angular/dist/moltendb-web-angular-0.1.0-rc.1.tgz
