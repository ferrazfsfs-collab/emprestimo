import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storage';
import { AiService } from '../services/ai';
import { Loan, LoanStatus } from '../types';
import { Card, formatCurrency, StatusBadge, Button, formatDate } from '../components/ui';
import { AlertCircle, Calendar, CheckCircle, TrendingUp, UserPlus, Banknote, ChevronRight, Wallet, Eye, EyeOff, Sparkles, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    dueToday: 0,
    amountDueToday: 0,
    amountLate: 0,
    activeLoans: 0
  });
  const [capital, setCapital] = useState(0);
  const [dueTodayLoans, setDueTodayLoans] = useState<Loan[]>([]);
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  
  // AI State
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [showCapital, setShowCapital] = useState(() => {
    const stored = localStorage.getItem('app_show_capital');
    return stored !== 'false';
  });

  useEffect(() => {
    StorageService.updateLoanStatuses();
    const loans = StorageService.getLoans();
    setAllLoans(loans);
    const config = StorageService.getConfig();
    setCapital(config.capitalBalance);

    const today = new Date().toISOString().split('T')[0];

    let dueToday = 0;
    let amountDueToday = 0;
    let amountLate = 0;
    let active = 0;
    const todaysLoans: Loan[] = [];

    loans.forEach(loan => {
      const remaining = loan.totalAmount - (loan.payments?.reduce((acc, p) => acc + p.amount, 0) || 0);
      
      if (loan.status !== LoanStatus.PAID && loan.status !== LoanStatus.CANCELLED && loan.status !== LoanStatus.RENEGOTIATED) {
        active++;
        
        if (loan.dueDate === today) {
          dueToday++;
          amountDueToday += remaining;
          todaysLoans.push(loan);
        }

        if (loan.status === LoanStatus.LATE || (loan.dueDate < today && loan.status === LoanStatus.PENDING)) {
          amountLate += remaining;
        }
      }
    });

    setStats({ dueToday, amountDueToday, amountLate, activeLoans: active });
    setDueTodayLoans(todaysLoans);
  }, []);

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await AiService.analyzePortfolio(allLoans);
    setAiInsight(result);
    setIsAnalyzing(false);
  };

  const toggleCapitalVisibility = () => {
    const newState = !showCapital;
    setShowCapital(newState);
    localStorage.setItem('app_show_capital', String(newState));
  };

  return (
    <div className="space-y-6 animate-fade-in pt-2">
      {/* Capital Card */}
      <div className="bg-slate-900 dark:bg-slate-800 rounded-xl p-5 shadow-lg text-white border border-slate-700 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2 relative z-10">
             <div className="flex items-center gap-3 opacity-90">
                <div className="bg-emerald-500/20 p-2 rounded-lg">
                   <Wallet size={20} className="text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-slate-300">Capital Disponível</span>
             </div>
             <button 
                onClick={toggleCapitalVisibility}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800"
             >
                {showCapital ? <Eye size={20} /> : <EyeOff size={20} />}
             </button>
          </div>
          
          <p className="text-3xl font-bold tracking-tight relative z-10">
            {showCapital ? formatCurrency(capital) : 'R$ •••••'}
          </p>
          
          <div className="mt-2 text-[10px] text-slate-400 relative z-10">
             Plafond atual para novos empréstimos
          </div>

          <div className="absolute -right-6 -bottom-10 opacity-5 pointer-events-none">
             <Banknote size={120} />
          </div>
      </div>

      {/* AI Button Section */}
      <div className="px-1">
        <button 
          onClick={handleAiAnalysis}
          disabled={isAnalyzing}
          className="w-full group relative overflow-hidden bg-gradient-to-r from-emerald-600 to-indigo-600 p-px rounded-xl transition-all active:scale-95 disabled:opacity-70"
        >
          <div className="bg-slate-900 dark:bg-slate-900/90 rounded-[11px] p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 p-2 rounded-lg">
                <Sparkles size={20} className={`text-emerald-400 ${isAnalyzing ? 'animate-spin' : 'group-hover:animate-pulse'}`} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white leading-none">Análise de Carteira IA</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-semibold">Consultoria Inteligente</p>
              </div>
            </div>
            {isAnalyzing ? <Loader2 className="animate-spin text-slate-400" size={18} /> : <ChevronRight className="text-slate-600 group-hover:text-emerald-400" size={18} />}
          </div>
        </button>
      </div>

      {/* AI Insight Modal */}
      {aiInsight && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <Card className="max-w-sm w-full relative overflow-hidden border-t-4 border-emerald-500">
            <button onClick={() => setAiInsight(null)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
              <X size={20} />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-emerald-500" />
              <h3 className="font-bold text-slate-900 dark:text-white">Insights do Consultor IA</h3>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto pr-2 no-scrollbar">
              {aiInsight}
            </div>
            <Button onClick={() => setAiInsight(null)} className="w-full mt-6 h-11 text-sm">Entendido</Button>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
         <Link to="/loans/new" className="col-span-1">
             <Button className="w-full flex justify-center items-center gap-2 text-sm">
               <Banknote size={16} /> Novo Empr.
             </Button>
         </Link>
         <Link to="/clients" className="col-span-1">
             <Button variant="secondary" className="w-full flex justify-center items-center gap-2 text-sm">
               <UserPlus size={16} /> Novo Cliente
             </Button>
         </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-l-4 border-l-blue-500 p-3">
          <div className="flex flex-col">
            <Calendar className="text-blue-500 mb-2" size={24} />
            <p className="text-xs text-slate-500 dark:text-slate-400">Vencem Hoje</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.dueToday}</p>
          </div>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 p-3">
          <div className="flex flex-col">
            <TrendingUp className="text-emerald-500 mb-2" size={24} />
            <p className="text-xs text-slate-500 dark:text-slate-400">A Receber (Hoje)</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(stats.amountDueToday)}</p>
          </div>
        </Card>
        <Card className="border-l-4 border-l-red-500 p-3">
          <div className="flex flex-col">
            <AlertCircle className="text-red-500 mb-2" size={24} />
            <p className="text-xs text-slate-500 dark:text-slate-400">Em Atraso</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.amountLate)}</p>
          </div>
        </Card>
        <Card className="border-l-4 border-l-slate-500 dark:border-l-slate-400 p-3">
          <div className="flex flex-col">
            <CheckCircle className="text-slate-500 dark:text-slate-400 mb-2" size={24} />
            <p className="text-xs text-slate-500 dark:text-slate-400">Empr. Ativos</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.activeLoans}</p>
          </div>
        </Card>
      </div>

      {/* Today's List */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Vencimentos de Hoje</h3>
        {dueTodayLoans.length === 0 ? (
          <Card className="text-center py-6 text-slate-500 dark:text-slate-400 text-sm bg-slate-50 dark:bg-slate-800/50 border-dashed">
            Nenhum pagamento vencendo hoje.
          </Card>
        ) : (
          <div className="space-y-3">
            {dueTodayLoans.map(loan => {
                const client = StorageService.getClients().find(c => c.id === loan.clientId);
                return (
                  <Link to={`/loans/${loan.id}`} key={loan.id} className="block">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 active:bg-slate-50 dark:active:bg-slate-700 flex justify-between items-center transition-colors">
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{client?.name || 'Desconhecido'}</p>
                            <p className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(loan.totalAmount)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <StatusBadge status={loan.status} />
                            <ChevronRight size={16} className="text-slate-400" />
                        </div>
                    </div>
                  </Link>
                );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;