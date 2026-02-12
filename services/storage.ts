import { Client, Loan, Payment, LoanStatus, RiskLevel, AppConfig } from '../types';

const CLIENTS_KEY = 'app_clients';
const LOANS_KEY = 'app_loans';
const CONFIG_KEY = 'app_config';

// Seed data helper
const seedData = () => {
  if (!localStorage.getItem(CLIENTS_KEY)) {
    const clients: Client[] = [
      { id: '1', name: 'Maria Silva', phone: '11999990000', notes: 'Cliente pontual', createdAt: new Date().toISOString() },
      { id: '2', name: 'João Santos', phone: '11988887777', notes: 'Novo cliente', createdAt: new Date().toISOString() },
    ];
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  }
  if (!localStorage.getItem(CONFIG_KEY)) {
    // Default PIN is 1234 for new installs
    const config: AppConfig = { 
      capitalBalance: 10000, 
      initialized: true, 
      securityPin: '1234',
      currency: 'BRL',
      companyName: 'Fersami SU',
      supportPhone: '949054619'
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }
};

export const StorageService = {
  // Config / Capital / Security
  getConfig: (): AppConfig => {
    seedData();
    const data = localStorage.getItem(CONFIG_KEY);
    const config = data ? JSON.parse(data) : { capitalBalance: 0, initialized: false };
    // Ensure currency exists for old installs
    if (!config.currency) config.currency = 'BRL';
    if (!config.companyName) config.companyName = 'Fersami SU';
    if (!config.supportPhone) config.supportPhone = '949054619';
    return config;
  },

  updateCapital: (newBalance: number) => {
    const config = StorageService.getConfig();
    config.capitalBalance = newBalance;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  },

  saveCompanyInfo: (name: string, phone: string) => {
    const config = StorageService.getConfig();
    config.companyName = name;
    config.supportPhone = phone;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  },

  adjustCapital: (amountToAdd: number) => {
    const config = StorageService.getConfig();
    config.capitalBalance += amountToAdd;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  },

  setCurrency: (currency: string) => {
    const config = StorageService.getConfig();
    config.currency = currency as any;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  },

  validatePin: (inputPin: string): boolean => {
    const config = StorageService.getConfig();
    // If no PIN is set, allow access (or validate true)
    if (!config.securityPin) return true;
    return config.securityPin === inputPin;
  },

  setPin: (newPin: string | undefined) => {
    const config = StorageService.getConfig();
    config.securityPin = newPin;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  },

  // Clients
  getClients: (): Client[] => {
    seedData();
    const data = localStorage.getItem(CLIENTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveClient: (client: Client) => {
    const clients = StorageService.getClients();
    const index = clients.findIndex(c => c.id === client.id);
    if (index >= 0) {
      clients[index] = client;
    } else {
      clients.push(client);
    }
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  },

  deleteClient: (clientId: string) => {
    // 1. Remove Client
    const clients = StorageService.getClients().filter(c => c.id !== clientId);
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));

    // 2. Remove associated Loans (Cascade delete to prevent orphans)
    const loans = StorageService.getLoans().filter(l => l.clientId !== clientId);
    localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
  },

  calculateClientRisk: (clientId: string): RiskLevel => {
    const loans = StorageService.getLoans().filter(l => l.clientId === clientId);
    if (loans.length === 0) return RiskLevel.LOW;

    let lateCount = 0;
    loans.forEach(loan => {
      // Only count explicit LATE status. Renegotiated loans are NOT delays.
      if (loan.status === LoanStatus.LATE) {
        lateCount++;
      }
    });

    if (lateCount === 0) return RiskLevel.LOW;
    if (lateCount <= 2) return RiskLevel.MEDIUM;
    return RiskLevel.HIGH;
  },

  // Loans
  getLoans: (): Loan[] => {
    const data = localStorage.getItem(LOANS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveLoan: (loan: Loan) => {
    const loans = StorageService.getLoans();
    const index = loans.findIndex(l => l.id === loan.id);
    
    if (index >= 0) {
      loans[index] = loan;
    } else {
      loans.push(loan);
      // If it's a NEW loan (not an update to existing), deduct from capital
      StorageService.adjustCapital(-loan.amount);
    }
    
    localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
  },

  updateLoanStatuses: () => {
    const loans = StorageService.getLoans();
    const today = new Date().toISOString().split('T')[0];
    let changed = false;

    const updatedLoans = loans.map(loan => {
      if (loan.status === LoanStatus.PENDING && loan.dueDate < today) {
        changed = true;
        return { ...loan, status: LoanStatus.LATE };
      }
      return loan;
    });

    if (changed) {
      localStorage.setItem(LOANS_KEY, JSON.stringify(updatedLoans));
    }
  },

  // Payments
  addPayment: (loanId: string, payment: Payment) => {
    const loans = StorageService.getLoans();
    const loanIndex = loans.findIndex(l => l.id === loanId);
    
    if (loanIndex >= 0) {
      const loan = loans[loanIndex];
      loan.payments = [...(loan.payments || []), payment];

      // Add money back to capital
      StorageService.adjustCapital(payment.amount);

      const totalPaid = loan.payments.reduce((acc, p) => acc + p.amount, 0);
      
      // Update status if fully paid
      if (totalPaid >= loan.totalAmount - 0.1) { // tolerance for float
        loan.status = LoanStatus.PAID;
      } else if (loan.status === LoanStatus.LATE && totalPaid > 0) {
        // Optional: Could change to PENDING if partial payment covers the delay
      }

      loans[loanIndex] = loan;
      localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
    }
  },

  // DATA EXPORT/IMPORT (Server Simulation)
  exportDatabase: (): string => {
    const data = {
      clients: JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]'),
      loans: JSON.parse(localStorage.getItem(LOANS_KEY) || '[]'),
      config: JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'),
      timestamp: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  },

  importDatabase: (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      
      // Basic validation
      if (!Array.isArray(data.clients) || !Array.isArray(data.loans) || !data.config) {
        throw new Error("Formato de arquivo inválido.");
      }

      localStorage.setItem(CLIENTS_KEY, JSON.stringify(data.clients));
      localStorage.setItem(LOANS_KEY, JSON.stringify(data.loans));
      localStorage.setItem(CONFIG_KEY, JSON.stringify(data.config));
      
      return true;
    } catch (e) {
      console.error("Import error:", e);
      return false;
    }
  }
};