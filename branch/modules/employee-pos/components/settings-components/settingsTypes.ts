export interface Terminal {
  _id: string;
  realDevices: 'Yes' | 'No';
  terminalName: string;
  terminalId: string;
  apiToken: string;
  storeId: string;
  createdDate: string;
  updatedDate: string;
  createdBy: string;
}

export interface Till {
  tillNo: string;
  tillName: string;
  createdDate: string;
}

export interface StoreTiming {
  day: string;
  startTime: string;
  endTime: string;
  isHoliday: 'Yes' | 'No';
}

export interface TimingUpdate {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: boolean;
  createdDate: string;
}

export interface Holiday {
  startDate: string;
  endDate: string;
  status: boolean;
  createdDate: string;
}

export interface TaxFeesSettings {
  deliveryFee: string | number;
  gstTaxRate: string | number;
  pstTaxRate: string | number;
  hstTaxRate: string | number;
}

export type TabType = 'main_settings' | 'tax_fees' | 'terminal_setup' | 'till_setup' | 'store_timings' | 'store_timings_update' | 'holidays' | 'kitchen_stations';

// ── Kitchen Station Configuration Types ─────────────────────────
export type StationId = 'make_table' | 'cut_station' | 'wings_station';
export type ItemType = 'pizza' | 'wings';

export interface StationConfig {
  id: StationId;
  label: string;
  isEnabled: boolean;
  handlesItemTypes: ItemType[];
  nextStation: string | null; // 'cut_station' | null
  autoPrint: {
    pizza: boolean;
    wings: boolean;
  };
}

export interface KitchenSettings {
  presetMode: '3_station' | '2_station' | '1_station' | 'custom';
  stations: StationConfig[];
}

// Default 3-station config — matches current hardcoded kitchen behavior
export const DEFAULT_KITCHEN_SETTINGS: KitchenSettings = {
  presetMode: '3_station',
  stations: [
    { id: 'make_table',    label: 'Make Station',  isEnabled: true,  handlesItemTypes: ['pizza'],         nextStation: 'cut_station', autoPrint: { pizza: false, wings: false } },
    { id: 'cut_station',   label: 'Cut Station',   isEnabled: true,  handlesItemTypes: ['pizza'],         nextStation: null,          autoPrint: { pizza: true,  wings: false } },
    { id: 'wings_station', label: 'Wings Station', isEnabled: true,  handlesItemTypes: ['wings'],         nextStation: null,          autoPrint: { pizza: false, wings: true  } },
  ],
};

