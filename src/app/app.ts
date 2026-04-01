import {Component, OnInit, signal} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { moltendbClient, moltenDbResource } from "@moltendb-web/angular";

interface DealView {
  _key: string;
  amount: number;
  status: 'lead' | 'negotiation' | 'won' | 'lost';
  company?: { name: string; industry: string; };
}

interface PipelineMetrics {
  totalRevenue: number;
  avgDealSize: number;
  activeDealsCount: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit {
  private client = moltendbClient();

  // UI State
  minAmount = signal<number>(0);
  selectedStatus = signal<string>('all');
  selectedIndustry = signal<string>('all');
  async saveUISettings() {
    const state = {
      minAmount: this.minAmount(),
      selectedStatus: this.selectedStatus(),
      selectedIndustry: this.selectedIndustry()
    };

    await this.client.collection('ui_settings').set({
      crm_filters: state
    }).exec();

    console.log('UI State persisted to MoltenDB');
  }

  // 1. Filtered Deals Resource
  filteredDeals = moltenDbResource<DealView[]>('deals', async (collection) => {
    try {
      let query = collection.get()
          .joins([{ alias: 'company', from: 'companies', on: 'company_id' }])
          .where({ amount: { $gte: this.minAmount() } });

      if (this.selectedStatus() !== 'all') {
        query = query.where({ status: this.selectedStatus() });
      }

      if (this.selectedIndustry() !== 'all') {
        query = query.where({ 'company.industry': this.selectedIndustry() });
      }

      const result = await query.sort([{ field: 'amount', order: 'desc' }]).exec();
      return result as unknown as DealView[];
    } catch (err: any) {
      // If the DB is empty/missing, return empty array instead of throwing
      if (err.statusCode === 404 || err.error?.includes('No documents')) {
        return [];
      }
      throw err;
    }
  });

  // 2. Metrics Resource
  metrics = moltenDbResource<PipelineMetrics>('deals', async (collection) => {
    try {
      const wonDeals = await collection.get()
          .where({ status: 'won' })
          .exec() as unknown as DealView[];

      const totalRevenue = wonDeals.reduce((acc, deal) => acc + (deal.amount || 0), 0);

      return {
        totalRevenue,
        avgDealSize: wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0,
        activeDealsCount: wonDeals.length
      };
    } catch (err: any) {
      return { totalRevenue: 0, avgDealSize: 0, activeDealsCount: 0 };
    }
  });

  async ngOnInit(): Promise<void> {
    // 3. Load UI state BEFORE seeding or fetching
    await this.loadUISettings();

    await this.seedDatabase();
  }

  private async loadUISettings() {
    try {
      const settings = await this.client.collection('ui_settings').get().keys('crm_filters').exec() as any;

      if (settings && settings.minAmount !== undefined) {
        const { minAmount, selectedStatus, selectedIndustry } = settings;

        this.minAmount.set(minAmount);
        this.selectedStatus.set(selectedStatus);
        this.selectedIndustry.set(selectedIndustry);

        console.log('UI State restored:', settings.crm_filters);
      }
    } catch (e) {
      // 404 expected on very first visit
    }
  }

  private async seedDatabase() {
    try {
      // Check if we have data
      const check = await this.client.collection('deals').get().count(1).exec() as Array<any>;
      if (check && check.length > 0) return;
    } catch (e) {
      // 404 is expected on first run
    }

    console.log('Seeding CRM data...');

    await this.client.collection('companies').set({
      comp1: { name: 'Acme Corp', industry: 'software' },
      comp2: { name: 'Globex', industry: 'manufacturing' }, 
      comp3: { name: 'Soylent Corp', industry: 'finance' }
    }).exec();

    await this.client.collection('deals').set({
      deal1: { company_id: 'comp1', amount: 50000, status: 'won' },
      deal2: { company_id: 'comp2', amount: 120000, status: 'won' },
      deal3: { company_id: 'comp3', amount: 25000, status: 'negotiation' },
      deal4: { company_id: 'comp1', amount: 15000, status: 'lead' }
    }).exec();
  }
}