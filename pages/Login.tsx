import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { Lock, ArrowRight, Delete } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (StorageService.validatePin(pin)) {
      onLogin();
    } else {
      setError(true);
      setPin('');
    }
  };

  // Auto submit when 4 digits entered
  React.useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-emerald-500/20">
          <Lock size={32} />
        </div>
        <h1 className="text-2xl font-bold text-white">Controle de Empréstimos</h1>
        <p className="text-slate-400 mt-2">Digite seu código de acesso</p>
      </div>

      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div 
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              pin.length > i 
                ? 'bg-emerald-500 scale-110' 
                : 'bg-slate-700'
            } ${error ? 'bg-red-500 animate-pulse' : ''}`}
          />
        ))}
      </div>
      
      {error && <p className="text-red-400 text-sm mb-4 font-medium">Código incorreto. Tente novamente.</p>}

      <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handleNumberClick(num.toString())}
            className="h-16 w-16 rounded-full bg-slate-800 text-white text-xl font-medium hover:bg-slate-700 active:bg-emerald-600 active:scale-95 transition-all mx-auto flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        <div className="h-16 w-16"></div> {/* Spacer */}
        <button
          onClick={() => handleNumberClick('0')}
          className="h-16 w-16 rounded-full bg-slate-800 text-white text-xl font-medium hover:bg-slate-700 active:bg-emerald-600 active:scale-95 transition-all mx-auto flex items-center justify-center"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="h-16 w-16 rounded-full hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors mx-auto flex items-center justify-center"
        >
          <Delete size={24} />
        </button>
      </div>

      <div className="mt-8 text-xs text-slate-500">
        PIN Padrão: 1234
      </div>
    </div>
  );
};

export default Login;