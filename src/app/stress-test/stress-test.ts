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
  isBatchRunning = signal(false);
  currentStep = signal('');
  batchStep = signal('');
  results = signal<StressResult[]>([]);
  batchResults = signal<StressResult[]>([]);
  totalDuration = computed(() =>
    this.results().reduce((sum, r) => sum + r.durationMs, 0)
  );
  batchTotalDuration = computed(() =>
    this.batchResults().reduce((sum, r) => sum + r.durationMs, 0)
  );

  async runStressTest() {
    this.isRunning.set(true);
    this.results.set([]);
    const collection = 'stress_test_data';

    try {
      // ── Write test ────────────────────────────────────────────────────────
      const writeCount = 1000;
      this.currentStep.set(`Writing ${writeCount.toLocaleString()} documents…`);
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
      this.addResult('Bulk Write (1000 docs)', writeCount, writeDuration);

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
      const updateCount = 100;
      this.currentStep.set(`Updating ${updateCount} documents…`);
      const updateData: Record<string, any> = {};
      for (let i = 0; i < updateCount; i++) {
        updateData[`item_${i}`] = { value: Math.random() * 10000, updated: true };
      }
      const updateStart = performance.now();
      await this.client.collection(collection).update(updateData).exec();
      const updateDuration = performance.now() - updateStart;
      this.addResult(`Bulk Update (${updateCount} docs)`, updateCount, updateDuration);

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

  async runBatchStressTest() {
    this.isBatchRunning.set(true);
    this.batchResults.set([]);
    const collection = 'stress_batch_data';
    const batchCount = 10;
    const batchSize = 1000;
    const totalCount = batchCount * batchSize;

    try {
      // ── Batch Write test ──────────────────────────────────────────────────
      this.batchStep.set(`Batch writing ${batchCount} × ${batchSize.toLocaleString()} documents…`);
      const writeStart = performance.now();
      for (let b = 0; b < batchCount; b++) {
        this.batchStep.set(`Batch writing… batch ${b + 1}/${batchCount}`);
        const writeData: Record<string, any> = {};
        for (let i = 0; i < batchSize; i++) {
          const idx = b * batchSize + i;
          writeData[`item_${idx}`] = {
            index: idx,
            value: Math.random() * 1000,
            label: `Item ${idx}`,
            active: idx % 2 === 0,
            category: ['A', 'B', 'C', 'D'][idx % 4],
          };
        }
        await this.client.collection(collection).set(writeData).exec();
      }
      const writeDuration = performance.now() - writeStart;
      this.addBatchResult(`Batch Write (${batchCount}×${batchSize} docs)`, totalCount, writeDuration);

      // ── Read all test ─────────────────────────────────────────────────────
      this.batchStep.set('Reading all documents…');
      const readStart = performance.now();
      const allDocs = await this.client.collection(collection).get().exec() as any[];
      const readDuration = performance.now() - readStart;
      this.addBatchResult('Read All', allDocs?.length ?? 0, readDuration);

      // ── Filtered read test ────────────────────────────────────────────────
      this.batchStep.set('Running filtered query…');
      const filterStart = performance.now();
      const filtered = await this.client.collection(collection).get()
        .where({ active: true, category: 'A' }).exec() as any[];
      const filterDuration = performance.now() - filterStart;
      this.addBatchResult('Filtered Query (active=true, cat=A)', filtered?.length ?? 0, filterDuration);

      // ── Sorted read test ──────────────────────────────────────────────────
      this.batchStep.set('Running sorted query…');
      const sortStart = performance.now();
      const sorted = await this.client.collection(collection).get()
        .sort([{ field: 'value', order: 'desc' }]).exec() as any[];
      const sortDuration = performance.now() - sortStart;
      this.addBatchResult('Sorted Query (value desc)', sorted?.length ?? 0, sortDuration);

      // ── Update test ───────────────────────────────────────────────────────
      const updateCount = 1000;
      this.batchStep.set(`Updating ${updateCount} documents…`);
      const updateData: Record<string, any> = {};
      for (let i = 0; i < updateCount; i++) {
        updateData[`item_${i}`] = { value: Math.random() * 10000, updated: true };
      }
      const updateStart = performance.now();
      await this.client.collection(collection).update(updateData).exec();
      const updateDuration = performance.now() - updateStart;
      this.addBatchResult(`Bulk Update (${updateCount} docs)`, updateCount, updateDuration);

      // ── Delete test ───────────────────────────────────────────────────────
      this.batchStep.set('Deleting all test documents…');
      const deleteStart = performance.now();
      await this.client.collection(collection).delete().drop().exec();
      const deleteDuration = performance.now() - deleteStart;
      this.addBatchResult(`Delete All (${totalCount} docs)`, totalCount, deleteDuration);

      this.batchStep.set('Done ✅');
    } catch (err) {
      console.error('Batch stress test error:', err);
      this.batchStep.set('Error ❌ — check console');
    } finally {
      this.isBatchRunning.set(false);
    }
  }

  private addResult(operation: string, count: number, durationMs: number) {
    const opsPerSec = count / (durationMs / 1000);
    this.results.update(r => [...r, { operation, count, durationMs, opsPerSec }]);
  }

  private addBatchResult(operation: string, count: number, durationMs: number) {
    const opsPerSec = count / (durationMs / 1000);
    this.batchResults.update(r => [...r, { operation, count, durationMs, opsPerSec }]);
  }

  clearResults() {
    this.results.set([]);
    this.currentStep.set('');
  }

  clearBatchResults() {
    this.batchResults.set([]);
    this.batchStep.set('');
  }
}
