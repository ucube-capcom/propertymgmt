export interface Complex {
  id: number;
  name: string;
  district: string;
  neighborhood: string;
  building_count?: number;
  unit_count?: number;
}

export interface Building {
  id: number;
  complex_id: number;
  name: string;
}

export interface Unit {
  id: number;
  building_id: number;
  unit_number: string;
  floor: number;
  area: string;
  // Joined fields
  contract_id?: number;
  contract_type?: 'sale' | 'jeonse' | 'monthly' | 'short_term';
  customer_name?: string;
  expiration_date?: string;
}

export interface Contract {
  id: number;
  unit_id: number;
  type: 'sale' | 'jeonse' | 'monthly' | 'short_term';
  price_sale: number;
  price_deposit: number;
  price_rent: number;
  customer_name: string;
  customer_phone: string;
  owner_name: string;
  contract_date: string;
  move_in_date: string;
  expiration_date: string;
  notes: string;
  created_at: string;
}

export type ContractFormData = Omit<Contract, 'id' | 'created_at'>;
