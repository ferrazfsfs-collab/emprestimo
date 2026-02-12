export enum RiskLevel {
  LOW = 'Baixo',
  MEDIUM = 'Médio',
  HIGH = 'Alto',
}

export enum LoanStatus {
  PENDING = 'Em Aberto',
  PAID = 'Pago',
  LATE = 'Atrasado',
  RENEGOTIATED = 'Renegociado',
  CANCELLED = 'Cancelado',
}

export enum PaymentFrequency {
  SINGLE = 'Parcela Única',
  WEEKLY = 'Semanal',
  BIWEEKLY = 'Quinzenal',
  MONTHLY = 'Mensal',
}

export type CurrencyCode = 'BRL' | 'USD' | 'EUR' | 'MZN' | 'AOA';

export interface Client {
  id: string;
  name: string;
  phone: string;
  document?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  type: 'PARTIAL' | 'FULL';
  notes?: string;
}

export interface Loan {
  id: string;
  clientId: string;
  amount: number; // Principal
  interestRate: number; // Percentage
  totalAmount: number; // Principal + Interest
  startDate: string;
  dueDate: string; // Or next due date if installments
  frequency: PaymentFrequency;
  installments: number; // 1 for single
  status: LoanStatus;
  payments: Payment[];
  notes?: string;
  originalLoanId?: string; // If renegociated
}

export interface CashFlowStats {
  totalLent: number;
  totalReceived: number;
  projectedProfit: number;
}

export interface AppConfig {
  capitalBalance: number;
  initialized: boolean;
  securityPin?: string; // Optional: If set, requires login
  currency?: CurrencyCode;
  companyName?: string;
  supportPhone?: string;
  logo?: string; // Base64 encoded image
}