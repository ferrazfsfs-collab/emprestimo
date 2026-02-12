import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { PdfService } from '../services/pdf';
import { Loan, LoanStatus, PaymentFrequency, Client } from '../types';
import { Card, Button, Input, Select, formatCurrency, StatusBadge, formatDate } from '../components/ui';
import { Link } from 'react-router-dom';
import { Calculator, Plus, ChevronRight, User, AlertTriangle, FileText } from 'lucide-react';

const Loans: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [capital, setCapital] = useState(0);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // New Loan Form State
  const [form, setForm] = useState({
    clientId: '',
    amount: '',
    interestRate: '10', // Default 10%
    termDays: '30',
    frequency: PaymentFrequency.SINGLE,
    notes: ''
  });

  const [simulation, setSimulation] = useState({
    total: 0,
    interest: 0,
    installmentValue: 0,
    installments: 1
  });

  useEffect(() => {
    setLoans(StorageService.getLoans());
    setClients(StorageService.getClients());
    setCapital(StorageService.getConfig().capitalBalance);
  }, []);

  // Calculator Logic
  useEffect(() => {
    const principal = parseFloat(form.amount) || 0;
    const rate = parseFloat(form.interestRate) || 0;
    const interest = principal * (rate / 100);
    const total = principal + interest;
    let installments = 1;
    if (form.frequency === PaymentFrequency.WEEKLY) installments = 4;
    if (form.frequency === PaymentFrequency.BIWEEKLY) installments = 2;
    const installmentValue = total / installments;

    setSimulation({ total, interest, installmentValue, installments });
  }, [form.amount, form.interestRate, form.frequency]);

  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId || !form.amount) return;
    
    const amount = parseFloat(form.amount);
    if (amount > capital) {
        alert("Capital insuficiente para realizar este empréstimo.");
        return;
    }

    const startDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(startDate.getDate() + parseInt(form.termDays));

    const newLoan: Loan = {
      id: crypto.randomUUID(),
      clientId: form.clientId,
      amount: amount,
      interestRate: parseFloat(form.interestRate),
      totalAmount: simulation.total,
      startDate: startDate.toISOString(),
      dueDate: dueDate.toISOString(),
      frequency: form.frequency,
      installments: simulation.installments,
      status: LoanStatus.PENDING,
      payments: [],
      notes: form.notes
    };

    StorageService.saveLoan(newLoan);
    setLoans(StorageService.getLoans());
    setCapital(StorageService.getConfig().capitalBalance); // Update local capital state
    setIsCreating(false);
    setForm({ ...form, amount: '', notes: '' });
  };

  const filteredLoans = loans.filter(l => filterStatus === 'ALL' || l.status === filterStatus);
  const insufficientFunds = (parseFloat(form.amount) || 0) > capital;

  const handleDownloadPDF = () => {
    PdfService.generateLoansReport(filteredLoans, clients, filterStatus);
  };

  if (isCreating) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Novo Empréstimo</h1>
            <Button variant="outline" onClick={() => setIsCreating(false)} className="text-sm px-4 h-10">Cancelar</Button>
        </div>
        
        <div className="flex items-center justify-between bg-slate-900 dark:bg-slate-800 text-white p-4 rounded-xl text-sm border border-slate-700 shadow-lg">
             <span className="text-slate-300">Capital Disponível</span>
             <span className="font-bold text-emerald-400 text-lg">{formatCurrency(capital)}</span>
        </div>

        <form onSubmit={handleCreateLoan} className="space-y-4 pb-4">
            <Card>
                <div className="space-y-4">
                    <Select label="Cliente *" required value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})}>
                        <option value="">Selecione...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>

                    <div className="relative">
                        <Input 
                            label="Valor (R$)" 
                            type="number" 
                            inputMode="decimal"
                            step="0.01"
                            required 
                            value={form.amount} 
                            onChange={e => setForm({...form, amount: e.target.value})}
                            className={`text-lg font-semibold ${insufficientFunds ? "border-red-500 focus:ring-red-500 text-red-600 dark:text-red-400" : ""}`}
                            placeholder="0.00"
                        />
                        {insufficientFunds && (
                            <div className="flex items-center gap-1 text-red-600 text-xs mt-1 absolute right-0 -bottom-6 bg-red-50 px-2 py-1 rounded">
                                <AlertTriangle size={12} /> Saldo insuficiente
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <Input 
                            label="Taxa (%)" 
                            type="number" 
                            inputMode="decimal"
                            step="0.1"
                            required 
                            value={form.interestRate} 
                            onChange={e => setForm({...form, interestRate: e.target.value})}
                        />
                         <Input 
                            label="Prazo (Dias)" 
                            type="number" 
                            inputMode="numeric"
                            required 
                            value={form.termDays} 
                            onChange={e => setForm({...form, termDays: e.target.value})}
                        />
                    </div>
                     <Select label="Frequência" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value as PaymentFrequency})}>
                        {Object.values(PaymentFrequency).map(f => <option key={f} value={f}>{f}</option>)}
                    </Select>
                </div>
            </Card>

            <Card className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2 text-sm">
                    <Calculator size={16} /> Resumo Simulação
                </h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Emprestado</span>
                        <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(parseFloat(form.amount) || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Juros</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">+{formatCurrency(simulation.interest)}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-base mt-2">
                        <span className="font-bold text-slate-800 dark:text-white">Total a Receber</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-500 text-lg">{formatCurrency(simulation.total)}</span>
                    </div>
                </div>
            </Card>

            <Button type="submit" className="w-full h-14 text-lg font-bold shadow-lg shadow-emerald-500/20" disabled={insufficientFunds}>
                Confirmar Empréstimo
            </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Empréstimos</h1>
        <div className="flex gap-3">
            <Button onClick={handleDownloadPDF} variant="outline" className="w-12 h-12 rounded-full p-0 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300" title="Baixar Relatório PDF">
                <FileText size={22} />
            </Button>
            <Button onClick={() => setIsCreating(true)} className="w-12 h-12 rounded-full p-0 flex items-center justify-center shadow-lg bg-emerald-600">
                <Plus size={28} />
            </Button>
        </div>
      </div>

      {/* Mobile Scrollable Filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 pt-1 no-scrollbar -mx-4 px-4 scroll-touch">
         {['ALL', 'Em Aberto', 'Pago', 'Atrasado', 'Renegociado'].map(status => (
             <button 
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-5 h-9 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap shadow-sm transition-all active:scale-95 flex-shrink-0 ${filterStatus === status ? 'bg-slate-800 dark:bg-slate-700 text-white ring-2 ring-slate-800 dark:ring-slate-600' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
             >
                {status === 'ALL' ? 'Todos' : status}
             </button>
         ))}
      </div>

      <div className="space-y-3 pb-4">
        {filteredLoans.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                 <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-3">
                     <FileText size={24} className="opacity-50"/>
                 </div>
                 <p>Nenhum empréstimo encontrado.</p>
             </div>
        ) : (
            filteredLoans.map(loan => {
                const client = clients.find(c => c.id === loan.clientId);
                const paid = loan.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
                const remaining = loan.totalAmount - paid;
                
                return (
                    <Link to={`/loans/${loan.id}`} key={loan.id} className="block group">
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 group-active:scale-[0.98] transition-all relative overflow-hidden">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-100 dark:bg-slate-700 w-10 h-10 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-base block">{client?.name}</span>
                                        <span className="text-xs text-slate-400">Vence em {formatDate(loan.dueDate)}</span>
                                    </div>
                                </div>
                                <StatusBadge status={loan.status} />
                            </div>
                            
                            <div className="flex justify-between items-end mt-2 pt-3 border-t border-slate-50 dark:border-slate-700">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Saldo Restante</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(remaining)}</p>
                                </div>
                                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                                    Total: {formatCurrency(loan.totalAmount)}
                                    <ChevronRight size={14} />
                                </div>
                            </div>
                        </div>
                    </Link>
                );
            })
        )}
      </div>
    </div>
  );
};

export default Loans;