import { Component, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { moltendbClient } from '@moltendb-web/angular';

interface StressResult {
  operation: string;
  count: number;
  durationMs: number;
  opsPerSec: number;
}

@Component({
  selector: 'app-stress-test',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './stress-test.html',
  styleUrls: ['./stress-test.scss']
})
export class StressTest {
  private client = moltendbClient();

  isRunning = signal(false);
  isSmallRunning = signal(false);
  currentStep = signal('');
  smallStep = signal('');
  results = signal<StressResult[]>([]);
  smallResults = signal<StressResult[]>([]);
  totalDuration = computed(() =>
    this.results().reduce((sum, r) => sum + r.durationMs, 0)
  );
  smallTotalDuration = computed(() =>
    this.smallResults().reduce((sum, r) => sum + r.durationMs, 0)
  );

  async runStressTest() {
    this.isRunning.set(true);
    this.results.set([]);
    const collection = 'stress_test_data';

    try {
      // ── Write test ────────────────────────────────────────────────────────
      const writeCount = 25000;
      this.currentStep.set(`Writing ${writeCount.toLocaleString()} documents…`);
      const writeData: Record<string, any> = {};
      for (let i = 0; i < writeCount; i++) {
        writeData[`item_${i}`] = {
          index: i,
          value: Math.random() * 25000,
          label: `Item ${i}`,
          active: i % 2 === 0,
          category: ['A', 'B', 'C', 'D'][i % 4],
        };
      }
      const writeStart = performance.now();
      await this.client.collection(collection).set(writeData).exec();
      const writeDuration = performance.now() - writeStart;
      this.addResult(`Bulk Write (${writeCount} fields)`, writeCount, writeDuration);

      // ── Read all test ─────────────────────────────────────────────────────
      this.currentStep.set('Reading all documents…');
      const readStart = performance.now();
      const allDocs = await this.client.collection(collection).get().exec() as any[];
      const readDuration = performance.now() - readStart;
      this.addResult('Read All', allDocs?.length ?? 0, readDuration);

      // ── Filtered read test ────────────────────────────────────────────────
      this.currentStep.set('Running filtered query…');
      const filterStart = performance.now();
      const filtered = await this.client.collection(collection).get()
        .where({ active: true, category: 'A' }).exec() as any[];
      const filterDuration = performance.now() - filterStart;
      this.addResult('Filtered Query (active=true, cat=A)', filtered?.length ?? 0, filterDuration);

      // ── Sorted read test ──────────────────────────────────────────────────
      this.currentStep.set('Running sorted query…');
      const sortStart = performance.now();
      const sorted = await this.client.collection(collection).get()
        .sort([{ field: 'value', order: 'desc' }]).exec() as any[];
      const sortDuration = performance.now() - sortStart;
      this.addResult('Sorted Query (value desc)', sorted?.length ?? 0, sortDuration);

      // ── Update test ───────────────────────────────────────────────────────
      const updateCount = 2500;
      this.currentStep.set(`Updating ${updateCount.toLocaleString()} fields…`);
      const updateData: Record<string, any> = {};
      for (let i = 0; i < updateCount; i++) {
        updateData[`item_${i}`] = { value: Math.random() * 10000, updated: true };
      }
      const updateStart = performance.now();
      await this.client.collection(collection).update(updateData).exec();
      const updateDuration = performance.now() - updateStart;
      this.addResult(`Bulk Update (${updateCount} fields)`, updateCount, updateDuration);

      // ── Delete test ───────────────────────────────────────────────────────
      this.currentStep.set('Deleting all test documents…');
      const deleteStart = performance.now();
      await this.client.collection(collection).delete().drop().exec();
      const deleteDuration = performance.now() - deleteStart;
      this.addResult(`Delete All (${writeCount} docs)`, writeCount, deleteDuration);

      this.currentStep.set('Done ✅');
    } catch (err) {
      console.error('Stress test error:', err);
      this.currentStep.set('Error ❌ — check console');
    } finally {
      this.isRunning.set(false);
    }
  }

  async runSmallStressTest() {
    this.isSmallRunning.set(true);
    this.smallResults.set([]);
    const collection = 'stress_small_data';
    const writeCount = 1000;

    try {
      // ── Write test ────────────────────────────────────────────────────────
      this.smallStep.set(`Writing ${writeCount.toLocaleString()} fields…`);
      const writeData: Record<string, any> = {};
      for (let i = 0; i < writeCount; i++) {
        writeData[`item_${i}`] = {
          index: i,
          value: Math.random() * 1000,
          label: `Item ${i}`,
          active: i % 2 === 0,
          category: ['A', 'B', 'C', 'D'][i % 4],
        };
      }
      const writeStart = performance.now();
      await this.client.collection(collection).set(writeData).exec();
      const writeDuration = performance.now() - writeStart;
      this.addSmallResult(`Write (${writeCount} fields)`, writeCount, writeDuration);

      // ── Read all test ─────────────────────────────────────────────────────
      this.smallStep.set('Reading all documents…');
      const readStart = performance.now();
      const allDocs = await this.client.collection(collection).get().exec() as any[];
      const readDuration = performance.now() - readStart;
      this.addSmallResult('Read All', allDocs?.length ?? 0, readDuration);

      // ── Filtered read test ────────────────────────────────────────────────
      this.smallStep.set('Running filtered query…');
      const filterStart = performance.now();
      const filtered = await this.client.collection(collection).get()
        .where({ active: true, category: 'A' }).exec() as any[];
      const filterDuration = performance.now() - filterStart;
      this.addSmallResult('Filtered Query (active=true, cat=A)', filtered?.length ?? 0, filterDuration);

      // ── Sorted read test ──────────────────────────────────────────────────
      this.smallStep.set('Running sorted query…');
      const sortStart = performance.now();
      const sorted = await this.client.collection(collection).get()
        .sort([{ field: 'value', order: 'desc' }]).exec() as any[];
      const sortDuration = performance.now() - sortStart;
      this.addSmallResult('Sorted Query (value desc)', sorted?.length ?? 0, sortDuration);

      // ── Update test ───────────────────────────────────────────────────────
      const updateCount = 100;
      this.smallStep.set(`Updating ${updateCount} documents…`);
      const updateData: Record<string, any> = {};
      for (let i = 0; i < updateCount; i++) {
        updateData[`item_${i}`] = { value: Math.random() * 10000, updated: true };
      }
      const updateStart = performance.now();
      await this.client.collection(collection).update(updateData).exec();
      const updateDuration = performance.now() - updateStart;
      this.addSmallResult(`Bulk Update (${updateCount} docs)`, updateCount, updateDuration);

      // ── Delete test ───────────────────────────────────────────────────────
      this.smallStep.set('Deleting all test documents…');
      const deleteStart = performance.now();
      await this.client.collection(collection).delete().drop().exec();
      const deleteDuration = performance.now() - deleteStart;
      this.addSmallResult(`Delete All (${writeCount} fields)`, writeCount, deleteDuration);

      this.smallStep.set('Done ✅');
    } catch (err) {
      console.error('Small stress test error:', err);
      this.smallStep.set('Error ❌ — check console');
    } finally {
      this.isSmallRunning.set(false);
    }
  }

  private addResult(operation: string, count: number, durationMs: number) {
    const opsPerSec = count / (durationMs / 1000);
    this.results.update(r => [...r, { operation, count, durationMs, opsPerSec }]);
  }

  private addSmallResult(operation: string, count: number, durationMs: number) {
    const opsPerSec = count / (durationMs / 1000);
    this.smallResults.update(r => [...r, { operation, count, durationMs, opsPerSec }]);
  }

  clearResults() {
    this.results.set([]);
    this.currentStep.set('');
  }

  clearSmallResults() {
    this.smallResults.set([]);
    this.smallStep.set('');
  }
}
