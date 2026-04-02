import { Routes } from '@angular/router';
import { LaptopTable } from './laptop-table/laptop-table';
import { StressTest } from './stress-test/stress-test';

export const routes: Routes = [
  { path: '', redirectTo: 'laptops', pathMatch: 'full' },
  { path: 'laptops', component: LaptopTable },
  { path: 'stress-test', component: StressTest },
];
