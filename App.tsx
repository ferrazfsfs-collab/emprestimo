import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Banknote, PieChart, Settings as SettingsIcon } from 'lucide-react';
import { StorageService } from './services/storage';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Loans from './pages/Loans';
import LoanDetails from './pages/LoanDetails';
import CashFlow from './pages/CashFlow';
import Settings from './pages/Settings';
import Login from './pages/Login';

const BottomNavItem: React.FC<{ to: string; icon: React.ElementType; label: string }> = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  return (
    <Link 
      to={to} 
      className={`flex flex-col items-center justify-center w-full py-2 transition-colors active:scale-95 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
    >
      <Icon size={24} className={isActive ? 'fill-emerald-100 dark:fill-emerald-900' : ''} strokeWidth={isActive ? 2.5 : 2} />
      <span className="text-[10px] font-medium mt-1">{label}</span>
    </Link>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(true);

  useEffect(() => {
    // Initialize Theme
    const storedTheme = localStorage.getItem('app_theme');
    if (storedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Check auth and config
    const config = StorageService.getConfig();

    if (!config.securityPin) {
      setRequiresAuth(false);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (requiresAuth && !isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-24 pt-16 transition-colors duration-200 selection:bg-emerald-100 dark:selection:bg-emerald-900">
        
        {/* Mobile Header Fixed */}
        <header className="fixed top-0 left-0 right-0 bg-slate-900 dark:bg-slate-950 text-white z-50 px-4 h-16 flex items-center shadow-md border-b border-slate-800 dark:border-slate-900 gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
                <Banknote size={20} />
            </div>
            <div className="overflow-hidden">
                 <h1 className="font-bold text-lg tracking-wide leading-none truncate">Controle de Empréstimos</h1>
                 <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold truncate">Sistema de Gestão</p>
            </div>
        </header>

        {/* Main Content */}
        <main className="p-4 max-w-md mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/loans/new" element={<Loans />} /> 
            <Route path="/loans/:id" element={<LoanDetails />} />
            <Route path="/cashflow" element={<CashFlow />} />
            <Route path="/settings" element={<Settings onLogout={handleLogout} />} />
          </Routes>
        </main>

        {/* Bottom Navigation Bar Fixed */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 pb-safe transition-colors duration-200">
          <div className="flex justify-around items-center h-16 max-w-md mx-auto">
            <BottomNavItem to="/" icon={LayoutDashboard} label="Início" />
            <BottomNavItem to="/clients" icon={Users} label="Clientes" />
            <BottomNavItem to="/loans" icon={Banknote} label="Empréstimos" />
            <BottomNavItem to="/cashflow" icon={PieChart} label="Caixa" />
            <BottomNavItem to="/settings" icon={SettingsIcon} label="Config" />
          </div>
        </nav>

      </div>
    </HashRouter>
  );
};

export default App;