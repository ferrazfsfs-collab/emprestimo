import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { PdfService } from '../services/pdf';
import { Loan, LoanStatus, Payment, Client } from '../types';
import { Card, Button, Input, formatCurrency, formatDate, StatusBadge } from '../components/ui';
import { ArrowLeft, Check, AlertTriangle, Clock, Wallet, FileText, Share2, DollarSign } from 'lucide-react';

const LoanDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  
  // Payment Modal State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  // Profit Distribution Modal State
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [totalProfit, setTotalProfit] = useState(0);
  const [reinvestAmount, setReinvestAmount] = useState('');

  // Renegotiation State
  const [showRenegotiate, setShowRenegotiate] = useState(false);
  const [renegotiateDays, setRenegotiateDays] = useState('30');
  const [renegotiateRate, setRenegotiateRate] = useState('5'); // Extra fee

  useEffect(() => {
    if (id) {
        const loans = StorageService.getLoans();
        const found = loans.find(l => l.id === id);
        if (found) {
            setLoan(found);
            const clients = StorageService.getClients();
            setClient(clients.find(c => c.id === found.clientId) || null);
        } else {
            navigate('/loans');
        }
    }
  }, [id, navigate]);

  const handleAddPayment = () => {
    if (!loan || !paymentAmount) return;
    
    // Status check BEFORE update
    const loansBefore = StorageService.getLoans();
    const loanBefore = loansBefore.find(l => l.id === loan.id);
    const wasPaid = loanBefore?.status === LoanStatus.PAID;

    const payment: Payment = {
        id: crypto.randomUUID(),
        loanId: loan.id,
        amount: parseFloat(paymentAmount),
        date: new Date().toISOString(),
        type: 'PARTIAL'
    };

    StorageService.addPayment(loan.id, payment);
    
    // Refresh loan data to check status AFTER update
    const loans = StorageService.getLoans();
    const updated = loans.find(l => l.id === id);
    if(updated) {
        setLoan(updated);
        
        // Trigger Profit Logic if it JUST became paid
        if (!wasPaid && updated.status === LoanStatus.PAID) {
            const profit = updated.totalAmount - updated.amount;
            setTotalProfit(profit);
            setReinvestAmount(profit.toFixed(2)); // Default to full reinvestment
            setShowProfitModal(true);
        }
    }
    
    setShowPayment(false);
    setPaymentAmount('');
  };

  const handleConfirmProfit = () => {
    // Logic: 
    // StorageService.addPayment already added the FULL amount (Principal + Interest) to the Capital.
    // If the user wants to withdraw some profit (NOT reinvest), we need to subtract that amount.
    // WithdrawAmount = TotalProfit - ReinvestAmount
    
    const reinvest = parseFloat(reinvestAmount) || 0;
    const withdraw = totalProfit - reinvest;

    if (withdraw > 0) {
        StorageService.adjustCapital(-withdraw); // Remove the profit taken by user
    }
    
    setShowProfitModal(false);
  };

  const handleRenegotiate = () => {
    if (!loan || !client) return;

    // 1. Mark old loan as Renegotiated
    const updatedOldLoan = { ...loan, status: LoanStatus.RENEGOTIATED };
    StorageService.saveLoan(updatedOldLoan);

    // 2. Calculate new total
    const paid = loan.payments.reduce((acc, p) => acc + p.amount, 0);
    const remainingPrincipal = loan.totalAmount - paid;
    
    const additionalInterest = remainingPrincipal * (parseFloat(renegotiateRate) / 100);
    const newTotal = remainingPrincipal + additionalInterest;

    const startDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(startDate.getDate() + parseInt(renegotiateDays));

    // 3. Create new Loan
    const newLoan: Loan = {
        id: crypto.randomUUID(),
        clientId: client.id,
        amount: remainingPrincipal, // Technically the debt becomes the principal
        interestRate: parseFloat(renegotiateRate),
        totalAmount: newTotal,
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
        frequency: loan.frequency,
        installments: 1, // Reset to single for simplicity in this logic
        status: LoanStatus.PENDING,
        payments: [],
        notes: `Renegociação do empréstimo anterior.`,
        originalLoanId: loan.id
    };

    StorageService.saveLoan(newLoan);
    // Correction: Since saveLoan deducted the amount from capital, but no physical cash left the safe, add it back.
    StorageService.adjustCapital(newLoan.amount);

    navigate(`/loans/${newLoan.id}`);
  };

  const handleDownloadStatement = () => {
    if (loan && client) {
      PdfService.generateLoanStatement(loan, client);
    }
  };

  const handleShareStatement = () => {
    if (loan && client) {
      PdfService.shareLoanStatement(loan, client);
    }
  };

  if (!loan || !client) return <div>Carregando...</div>;

  const totalPaid = loan.payments.reduce((acc, p) => acc + p.amount, 0);
  const remaining = loan.totalAmount - totalPaid;
  const progress = Math.min((totalPaid / loan.totalAmount) * 100, 100);

  return (
    <div className="space-y-4 animate-fade-in">
        {/* Navigation & Header Actions */}
        <div className="flex justify-between items-center mb-2">
            <Button variant="outline" onClick={() => navigate('/loans')} className="flex items-center gap-2 dark:border-slate-600 dark:text-slate-300 pl-2 pr-3 h-10">
                <ArrowLeft size={18} /> Voltar
            </Button>
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleDownloadStatement} className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 px-3 h-10" title="Baixar PDF">
                    <FileText size={18} />
                </Button>
                <Button onClick={handleShareStatement} className="flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 px-3 h-10">
                    <Share2 size={18} /> <span className="hidden xs:inline">Enviar</span>
                </Button>
            </div>
        </div>

        {/* Profit Distribution Modal */}
        {showProfitModal && (
            <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
                    <div className="flex flex-col items-center mb-4 text-center">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-full text-emerald-600 dark:text-emerald-400 mb-3">
                            <Wallet size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Empréstimo Quitado!</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">O lucro total deste negócio foi de <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">{formatCurrency(totalProfit)}</span>.</p>
                    </div>

                    <div className="mb-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quanto deseja reinvestir no Plafond?</label>
                        <Input 
                            label="" 
                            type="number"
                            inputMode="decimal"
                            value={reinvestAmount}
                            onChange={(e) => setReinvestAmount(e.target.value)}
                            max={totalProfit}
                            className="mb-0 text-center text-lg font-bold"
                        />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 text-center">
                         Retirada pessoal: <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totalProfit - (parseFloat(reinvestAmount)||0))}</span>
                    </p>

                    <Button onClick={handleConfirmProfit} className="w-full text-lg shadow-lg shadow-emerald-500/20">Confirmar Distribuição</Button>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="md:col-span-2 space-y-6">
                <Card className="relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{client.name}</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">ID: #{loan.id.slice(0,6).toUpperCase()}</p>
                        </div>
                        <StatusBadge status={loan.status} />
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6">
                        <div className="flex justify-between text-xs mb-2">
                             <span className="text-slate-500 dark:text-slate-400">Progresso de pagamento</span>
                             <span className="font-bold text-emerald-600 dark:text-emerald-400">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Total Acordado</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatCurrency(loan.totalAmount)}</p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
                            <p className="text-[10px] text-red-600 dark:text-red-400 uppercase font-bold tracking-wider">Restante</p>
                            <p className="text-lg font-bold text-red-700 dark:text-red-400">{formatCurrency(remaining)}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">Já Pago</p>
                            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(totalPaid)}</p>
                        </div>
                         <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Vencimento</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatDate(loan.dueDate)}</p>
                        </div>
                    </div>

                    {/* Action Buttons - Stacked on Mobile */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {loan.status !== LoanStatus.PAID && loan.status !== LoanStatus.RENEGOTIATED && (
                            <>
                                <Button onClick={() => setShowPayment(true)} className="flex-1 flex items-center justify-center gap-2 h-14 text-lg shadow-lg shadow-emerald-500/20">
                                    <DollarSign size={20} strokeWidth={3} /> Receber Pagamento
                                </Button>
                                <Button onClick={() => setShowRenegotiate(true)} variant="secondary" className="flex-1 flex items-center justify-center gap-2 h-14">
                                    <Clock size={20} /> Renegociar
                                </Button>
                            </>
                        )}
                    </div>
                </Card>

                <Card title="Histórico">
                    {loan.payments.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                            <p className="text-slate-400 text-sm">Nenhum pagamento registrado.</p>
                        </div>
                    ) : (
                         <div className="space-y-3">
                             {loan.payments.map((p) => (
                                 <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                     <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                             <Check size={14} strokeWidth={3} />
                                         </div>
                                         <div>
                                             <p className="text-sm font-bold text-slate-900 dark:text-white">Pagamento {p.type === 'FULL' ? 'Total' : 'Parcial'}</p>
                                             <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(p.date)}</p>
                                         </div>
                                     </div>
                                     <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(p.amount)}</span>
                                 </div>
                             ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Actions / Side Panel (Modals for Mobile/Desktop) */}
            <div className="space-y-6">
                 {/* Payment Modal / Sheet */}
                 {showPayment && (
                     <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4">
                         <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 shadow-2xl animate-slide-up sm:animate-scale-in">
                            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 sm:hidden"></div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full text-emerald-600 dark:text-emerald-400"><DollarSign size={20} /></div>
                                Novo Pagamento
                            </h3>
                            
                            <div className="mb-6">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Valor Recebido</p>
                                <Input 
                                    label="" 
                                    type="number" 
                                    inputMode="decimal"
                                    step="0.01"
                                    value={paymentAmount} 
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    placeholder="0,00"
                                    className="text-2xl font-bold text-center h-16"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setShowPayment(false)} className="flex-1 h-14">Cancelar</Button>
                                <Button onClick={handleAddPayment} className="flex-1 h-14 text-lg">Confirmar</Button>
                            </div>
                         </div>
                     </div>
                 )}

                 {/* Renegotiate Modal / Sheet */}
                 {showRenegotiate && (
                     <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4">
                         <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 shadow-2xl animate-slide-up sm:animate-scale-in">
                            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 sm:hidden"></div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full text-orange-600 dark:text-orange-400"><Clock size={20} /></div>
                                Renegociar
                            </h3>

                            <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-sm text-orange-800 dark:text-orange-300 flex gap-3 leading-relaxed">
                                <AlertTriangle size={24} className="shrink-0 mt-0.5" />
                                <p>O empréstimo atual será encerrado e um novo será criado com o saldo devedor de <b>{formatCurrency(remaining)}</b> somado aos juros abaixo.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <Input 
                                    label="Dias Adicionais" 
                                    type="number"
                                    inputMode="numeric" 
                                    value={renegotiateDays} 
                                    onChange={e => setRenegotiateDays(e.target.value)}
                                />
                                <Input 
                                    label="Juros Extra (%)" 
                                    type="number" 
                                    inputMode="decimal"
                                    value={renegotiateRate} 
                                    onChange={e => setRenegotiateRate(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setShowRenegotiate(false)} className="flex-1 h-14">Cancelar</Button>
                                <Button variant="secondary" onClick={handleRenegotiate} className="flex-1 h-14">Confirmar</Button>
                            </div>
                         </div>
                     </div>
                 )}
            </div>
        </div>
    </div>
  );
};

export default LoanDetails;