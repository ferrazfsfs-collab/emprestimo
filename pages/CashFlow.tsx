import React, { useEffect, useState } from 'react';
import { StorageService } from '../services/storage';
import { Card, formatCurrency } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LoanStatus } from '../types';

const COLORS = ['#059669', '#EF4444', '#F59E0B', '#3B82F6'];

const CashFlow: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [totals, setTotals] = useState({ received: 0, projected: 0, pending: 0, principal: 0, profitEstimate: 0 });
  const [topClients, setTopClients] = useState<any[]>([]);
  const [lateClients, setLateClients] = useState<any[]>([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const loans = StorageService.getLoans();
    const clients = StorageService.getClients();
    
    setHasData(loans.length > 0);

    let totalReceived = 0;
    let totalProjected = 0; // Principal + Juros
    let totalPending = 0;
    let totalPrincipal = 0; // Apenas Principal (Valor dado)

    // Define only the statuses we want to see in the Pie Chart (Exclude RENEGOTIATED from chart)
    const statusCounts = { [LoanStatus.PAID]: 0, [LoanStatus.LATE]: 0, [LoanStatus.PENDING]: 0 };
    
    const monthlyData = new Map<string, { name: string, entrada: number, saida: number }>();
    
    for (let i = 4; i >= 0; i--) { // Reduced to 5 months for mobile space
        const d = subMonths(new Date(), i);
        const key = format(d, 'yyyy-MM');
        monthlyData.set(key, { name: format(d, 'MMM', { locale: ptBR }), entrada: 0, saida: 0 });
    }

    const clientStats: Record<string, { name: string, loanCount: number, totalLent: number, lateCount: number }> = {};

    loans.forEach(loan => {
        const paid = loan.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
        const remaining = loan.totalAmount - paid;

        totalReceived += paid;
        totalProjected += loan.totalAmount;
        totalPrincipal += loan.amount;
        
        // Exclude RENEGOTIATED from Pending Total
        if(loan.status !== LoanStatus.PAID && loan.status !== LoanStatus.CANCELLED && loan.status !== LoanStatus.RENEGOTIATED) {
            totalPending += remaining;
        }

        // Only count specific statuses for the chart
        if (Object.prototype.hasOwnProperty.call(statusCounts, loan.status)) {
             statusCounts[loan.status as keyof typeof statusCounts]++;
        }

        const loanDate = parseISO(loan.startDate);
        const loanKey = format(loanDate, 'yyyy-MM');
        if (monthlyData.has(loanKey)) monthlyData.get(loanKey)!.saida += loan.amount;

        loan.payments?.forEach(p => {
            const payDate = parseISO(p.date);
            const payKey = format(payDate, 'yyyy-MM');
            if (monthlyData.has(payKey)) monthlyData.get(payKey)!.entrada += p.amount;
        });

        if (!clientStats[loan.clientId]) {
            const clientName = clients.find(c => c.id === loan.clientId)?.name || 'Desconhecido';
            clientStats[loan.clientId] = { name: clientName, loanCount: 0, totalLent: 0, lateCount: 0 };
        }
        clientStats[loan.clientId].loanCount++;
        clientStats[loan.clientId].totalLent += loan.amount;
        
        // FIX: Only LoanStatus.LATE counts as a delay. RENEGOTIATED is NOT a delay.
        if (loan.status === LoanStatus.LATE) {
            clientStats[loan.clientId].lateCount++;
        }
    });

    const profitEstimate = totalProjected - totalPrincipal;
    setTotals({ 
      received: totalReceived, 
      projected: totalProjected, 
      pending: totalPending, 
      principal: totalPrincipal,
      profitEstimate 
    });
    
    // Convert counts to array for Recharts
    setStatusData(Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key as keyof typeof statusCounts] })).filter(d => d.value > 0));
    
    setData(Array.from(monthlyData.values()));

    setTopClients(Object.values(clientStats).sort((a, b) => b.totalLent - a.totalLent).slice(0, 3));
    setLateClients(Object.values(clientStats).filter(c => c.lateCount > 0).sort((a, b) => b.lateCount - a.lateCount).slice(0, 3));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in pb-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Relatórios</h1>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
             <div className="bg-blue-600 text-white rounded-lg shadow-sm p-3">
                 <p className="opacity-80 text-xs">Total Emprestado</p>
                 <p className="text-lg font-bold">{formatCurrency(totals.principal)}</p>
             </div>
             <div className="bg-emerald-600 text-white rounded-lg shadow-sm p-3">
                 <p className="opacity-80 text-xs">Total Recebido</p>
                 <p className="text-lg font-bold">{formatCurrency(totals.received)}</p>
             </div>
             <div className="bg-slate-800 text-white rounded-lg shadow-sm p-3 border border-slate-700">
                 <p className="opacity-80 text-xs">Saldo Pendente</p>
                 <p className="text-lg font-bold">{formatCurrency(totals.pending)}</p>
             </div>
             <div className="bg-indigo-600 text-white rounded-lg shadow-sm p-3">
                 <p className="opacity-80 text-xs">Lucro Estimado</p>
                 <p className="text-lg font-bold">{formatCurrency(totals.profitEstimate)}</p>
             </div>
        </div>

        {/* Charts */}
        <div className="space-y-4">
            <Card title="Fluxo (5 Meses)" className="h-64">
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.3} />
                            <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fill: '#94a3b8', fontSize: 10}} axisLine={false} tickLine={false} />
                            <Tooltip 
                                formatter={(value) => formatCurrency(value as number)} 
                                contentStyle={{ fontSize: '12px', backgroundColor: '#1e293b', border: 'none', color: '#f8fafc' }} 
                            />
                            <Bar dataKey="entrada" name="Entrada" fill="#059669" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="saida" name="Saída" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        Sem dados suficientes para o gráfico.
                    </div>
                )}
            </Card>

            <Card title="Status da Carteira" className="h-64">
                 {statusData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        Nenhum empréstimo ativo.
                    </div>
                 ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#f8fafc', fontSize: '12px' }} />
                            <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{fontSize: '11px', color: '#94a3b8'}}/>
                        </PieChart>
                    </ResponsiveContainer>
                 )}
            </Card>
        </div>

        {/* Simple Lists */}
        <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-colors">
                <h3 className="font-bold text-slate-800 dark:text-white mb-3 text-sm">Top 3 Volume de Empréstimo</h3>
                <div className="space-y-3">
                    {topClients.length === 0 ? (
                         <p className="text-xs text-slate-400 text-center py-2">Sem dados de volume.</p>
                    ) : (
                        topClients.map((c, i) => (
                            <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 dark:border-slate-700 pb-2 last:border-0 last:pb-0">
                                <span className="text-slate-900 dark:text-slate-100">{c.name}</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(c.totalLent)}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-colors">
                <h3 className="font-bold text-slate-800 dark:text-white mb-3 text-sm">Top 3 Atrasos</h3>
                <div className="space-y-3">
                    {lateClients.length === 0 ? (
                         <p className="text-xs text-slate-400 text-center py-2">Nenhum cliente em atraso.</p>
                    ) : (
                        lateClients.map((c, i) => (
                            <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 dark:border-slate-700 pb-2 last:border-0 last:pb-0">
                                <span className="text-slate-900 dark:text-slate-100">{c.name}</span>
                                <span className="font-bold text-red-600 dark:text-red-400">{c.lateCount} atrasos</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default CashFlow;