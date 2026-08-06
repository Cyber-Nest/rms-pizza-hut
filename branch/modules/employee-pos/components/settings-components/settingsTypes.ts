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

export type TabType = 'main_settings' | 'tax_fees' | 'terminal_setup' | 'till_setup' | 'store_timings' | 'store_timings_update' | 'holidays';
