import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgClass } from '@angular/common';
import { moltendbClient, moltenDbResource } from '@moltendb-web/angular';
import { LAPTOP_SEED } from './laptop-seed';

export interface LaptopRow {
  _key: string;
  brand: string;
  model: string;
  price: number;
  ram_gb: number;
  storage_gb: number;
  storage_type: string;
  display_inch: number;
  resolution: string;
  panel: string;
  refresh_hz: number;
  cpu_brand: string;
  cpu_model: string;
  cpu_cores: number;
  gpu: string;
  battery_wh: number;
  weight_kg: number;
  os: string;
  in_stock: boolean;
  category: string;
  rating: number;
}

export interface ColumnDef {
  key: keyof LaptopRow;
  label: string;
  visible: boolean;
  sortable: boolean;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'brand',        label: 'Brand',       visible: true,  sortable: true },
  { key: 'model',        label: 'Model',       visible: true,  sortable: true },
  { key: 'category',     label: 'Category',    visible: true,  sortable: true },
  { key: 'price',        label: 'Price',       visible: true,  sortable: true },
  { key: 'ram_gb',       label: 'RAM (GB)',    visible: true,  sortable: true },
  { key: 'storage_gb',   label: 'Storage',     visible: true,  sortable: true },
  { key: 'storage_type', label: 'Storage Type',visible: false, sortable: true },
  { key: 'display_inch', label: 'Display"',    visible: true,  sortable: true },
  { key: 'panel',        label: 'Panel',       visible: true,  sortable: true },
  { key: 'refresh_hz',   label: 'Hz',          visible: true,  sortable: true },
  { key: 'cpu_brand',    label: 'CPU Brand',   visible: false, sortable: true },
  { key: 'cpu_model',    label: 'CPU',         visible: true,  sortable: false },
  { key: 'cpu_cores',    label: 'Cores',       visible: false, sortable: true },
  { key: 'gpu',          label: 'GPU',         visible: false, sortable: false },
  { key: 'battery_wh',   label: 'Battery (Wh)',visible: false, sortable: true },
  { key: 'weight_kg',    label: 'Weight (kg)', visible: true,  sortable: true },
  { key: 'os',           label: 'OS',          visible: true,  sortable: true },
  { key: 'in_stock',     label: 'In Stock',    visible: true,  sortable: true },
  { key: 'rating',       label: 'Rating',      visible: true,  sortable: true },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, DecimalPipe, NgClass],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit {
  private client = moltendbClient();

  // ── Filter state ──────────────────────────────────────────────────────────
  searchText    = signal<string>('');
  selectedBrand = signal<string>('all');
  selectedCategory = signal<string>('all');
  selectedOs    = signal<string>('all');
  selectedPanel = signal<string>('all');
  inStockOnly   = signal<boolean>(false);
  minPrice      = signal<number>(0);
  maxPrice      = signal<number>(4000);
  minRam        = signal<number>(0);
  maxRam        = signal<number>(64);
  sortField     = signal<string>('price');
  sortOrder     = signal<'asc' | 'desc'>('asc');

  // ── Column visibility ─────────────────────────────────────────────────────
  columns = signal<ColumnDef[]>(DEFAULT_COLUMNS.map(c => ({ ...c })));
  showColumnPicker = signal<boolean>(false);

  visibleColumns = computed(() => this.columns().filter(c => c.visible));

  // ── All laptops resource (raw data, filtering done client-side for reactivity) ──
  allLaptops = moltenDbResource<LaptopRow[]>('laptops', async (collection) => {
    try {
      const result = await collection.get().exec();
      return result as unknown as LaptopRow[];
    } catch (err: any) {
      if (err.statusCode === 404 || err.error?.includes('No documents')) return [];
      throw err;
    }
  });

  // ── Derived: filtered + sorted rows ──────────────────────────────────────
  filteredLaptops = computed<LaptopRow[]>(() => {
    const rows = this.allLaptops.value() ?? [];
    const search = this.searchText().toLowerCase();
    const brand  = this.selectedBrand();
    const cat    = this.selectedCategory();
    const os     = this.selectedOs();
    const panel  = this.selectedPanel();
    const stock  = this.inStockOnly();
    const minP   = this.minPrice();
    const maxP   = this.maxPrice();
    const minR   = this.minRam();
    const maxR   = this.maxRam();
    const sf     = this.sortField();
    const so     = this.sortOrder();

    let filtered = rows.filter(l => {
      if (search && !`${l.brand} ${l.model} ${l.cpu_model} ${l.gpu}`.toLowerCase().includes(search)) return false;
      if (brand !== 'all' && l.brand !== brand) return false;
      if (cat   !== 'all' && l.category !== cat) return false;
      if (os    !== 'all' && l.os !== os) return false;
      if (panel !== 'all' && l.panel !== panel) return false;
      if (stock && !l.in_stock) return false;
      if (l.price   < minP || l.price   > maxP) return false;
      if (l.ram_gb  < minR || l.ram_gb  > maxR) return false;
      return true;
    });

    filtered = [...filtered].sort((a, b) => {
      const av = (a as any)[sf];
      const bv = (b as any)[sf];
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return so === 'asc' ? cmp : -cmp;
    });

    return filtered;
  });

  // ── Unique values for dropdowns ───────────────────────────────────────────
  brands     = computed(() => [...new Set((this.allLaptops.value() ?? []).map(l => l.brand))].sort());
  categories = computed(() => [...new Set((this.allLaptops.value() ?? []).map(l => l.category))].sort());
  osList     = computed(() => [...new Set((this.allLaptops.value() ?? []).map(l => l.os))].sort());
  panels     = computed(() => [...new Set((this.allLaptops.value() ?? []).map(l => l.panel))].sort());

  // ── Summary stats ─────────────────────────────────────────────────────────
  stats = computed(() => {
    const rows = this.filteredLaptops();
    if (!rows.length) return { count: 0, avgPrice: 0, minPrice: 0, maxPrice: 0, inStock: 0 };
    const prices = rows.map(r => r.price);
    return {
      count:    rows.length,
      avgPrice: Math.round(rows.reduce((s, r) => s + r.price, 0) / rows.length),
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      inStock:  rows.filter(r => r.in_stock).length,
    };
  });

  async ngOnInit(): Promise<void> {
    await this.loadUISettings();
    await this.seedDatabase();
  }

  // ── Sorting ───────────────────────────────────────────────────────────────
  setSort(field: string) {
    if (this.sortField() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortOrder.set('asc');
    }
    this.saveUISettings();
  }

  sortIcon(field: string): string {
    if (this.sortField() !== field) return '↕';
    return this.sortOrder() === 'asc' ? '↑' : '↓';
  }

  // ── Column toggle ─────────────────────────────────────────────────────────
  toggleColumn(key: string) {
    this.columns.update(cols =>
      cols.map(c => c.key === key ? { ...c, visible: !c.visible } : c)
    );
    this.saveUISettings();
  }

  // ── Reset filters ─────────────────────────────────────────────────────────
  resetFilters() {
    this.searchText.set('');
    this.selectedBrand.set('all');
    this.selectedCategory.set('all');
    this.selectedOs.set('all');
    this.selectedPanel.set('all');
    this.inStockOnly.set(false);
    this.minPrice.set(0);
    this.maxPrice.set(4000);
    this.minRam.set(0);
    this.maxRam.set(64);
    this.sortField.set('price');
    this.sortOrder.set('asc');
    this.saveUISettings();
  }

  // ── Persist UI state ──────────────────────────────────────────────────────
  async saveUISettings() {
    const state = {
      searchText:       this.searchText(),
      selectedBrand:    this.selectedBrand(),
      selectedCategory: this.selectedCategory(),
      selectedOs:       this.selectedOs(),
      selectedPanel:    this.selectedPanel(),
      inStockOnly:      this.inStockOnly(),
      minPrice:         this.minPrice(),
      maxPrice:         this.maxPrice(),
      minRam:           this.minRam(),
      maxRam:           this.maxRam(),
      sortField:        this.sortField(),
      sortOrder:        this.sortOrder(),
      columns:          this.columns().map(c => ({ key: c.key, visible: c.visible })),
    };
    await this.client.collection('ui_settings').set({ laptop_filters: state }).exec();
  }

  private async loadUISettings() {
    try {
      const s = await this.client.collection('ui_settings').get().keys('laptop_filters').exec() as any;
      if (!s) return;
      if (s.searchText       !== undefined) this.searchText.set(s.searchText);
      if (s.selectedBrand    !== undefined) this.selectedBrand.set(s.selectedBrand);
      if (s.selectedCategory !== undefined) this.selectedCategory.set(s.selectedCategory);
      if (s.selectedOs       !== undefined) this.selectedOs.set(s.selectedOs);
      if (s.selectedPanel    !== undefined) this.selectedPanel.set(s.selectedPanel);
      if (s.inStockOnly      !== undefined) this.inStockOnly.set(s.inStockOnly);
      if (s.minPrice         !== undefined) this.minPrice.set(s.minPrice);
      if (s.maxPrice         !== undefined) this.maxPrice.set(s.maxPrice);
      if (s.minRam           !== undefined) this.minRam.set(s.minRam);
      if (s.maxRam           !== undefined) this.maxRam.set(s.maxRam);
      if (s.sortField        !== undefined) this.sortField.set(s.sortField);
      if (s.sortOrder        !== undefined) this.sortOrder.set(s.sortOrder);
      if (Array.isArray(s.columns)) {
        const saved: { key: string; visible: boolean }[] = s.columns;
        this.columns.update(cols =>
          cols.map(c => {
            const found = saved.find(sc => sc.key === c.key);
            return found ? { ...c, visible: found.visible } : c;
          })
        );
      }
    } catch (_) { /* 404 on first visit */ }
  }

  private async seedDatabase() {
    try {
      const check = await this.client.collection('laptops').get().count(1).exec() as Array<any>;
      if (check && check.length > 0) return;
    } catch (_) { /* 404 expected on first run */ }

    console.log('Seeding laptop data…');
    await this.client.collection('laptops').set(LAPTOP_SEED as any).exec();
    console.log('Laptop data seeded ✅');
  }

  // ── Template helpers ──────────────────────────────────────────────────────
  cellValue(row: LaptopRow, key: keyof LaptopRow): string {
    const v = row[key];
    if (key === 'price')        return '$' + (v as number).toLocaleString();
    if (key === 'storage_gb')   return (v as number) >= 1000 ? (v as number) / 1000 + ' TB' : v + ' GB';
    if (key === 'display_inch') return v + '"';
    if (key === 'refresh_hz')   return v + ' Hz';
    if (key === 'weight_kg')    return v + ' kg';
    if (key === 'battery_wh')   return v + ' Wh';
    if (key === 'in_stock')     return v ? '✓' : '✗';
    if (key === 'rating')       return '★ ' + v;
    return String(v ?? '');
  }

  cellClass(row: LaptopRow, key: keyof LaptopRow): string {
    if (key === 'in_stock') return row.in_stock ? 'cell-yes' : 'cell-no';
    if (key === 'price') {
      if (row.price < 800)  return 'cell-budget';
      if (row.price > 2500) return 'cell-premium';
      return '';
    }
    if (key === 'rating') {
      if (row.rating >= 4.7) return 'cell-top';
      return '';
    }
    if (key === 'panel' && (row.panel === 'OLED' || row.panel === 'Mini-LED')) return 'cell-oled';
    if (key === 'category') return 'cell-cat-' + row.category;
    return '';
  }
}
