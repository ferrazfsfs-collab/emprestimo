import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-colors duration-200 ${className}`}>
    {title && <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">{title}</h3>}
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' }> = ({ children, variant = 'primary', className = '', ...props }) => {
  // Mobile Optimization: min-height 44px (h-11) for touch targets
  const baseStyle = "px-4 h-12 rounded-lg font-medium transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";
  
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 border border-transparent shadow-sm shadow-emerald-500/20",
    secondary: "bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600 focus:ring-slate-700 shadow-sm",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm shadow-red-500/20",
    outline: "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:ring-slate-400 bg-transparent"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, className = '', ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">{label}</label>
    {/* Mobile Optimization: text-base (16px) prevents iOS zoom on focus. h-12 makes it easier to tap. inputMode helps mobile keyboards. */}
    <input 
      className={`w-full px-4 h-12 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-colors text-base ${className}`} 
      inputMode={props.type === 'number' ? 'decimal' : 'text'}
      {...props} 
    />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, className = '', ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">{label}</label>
    <div className="relative">
      <select 
        className={`w-full pl-4 pr-10 h-12 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors appearance-none text-base ${className}`} 
        {...props} 
      >
        {children}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
      </div>
    </div>
  </div>
);

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let color = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  switch (status) {
    case 'Em Aberto': color = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'; break;
    case 'Pago': color = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'; break;
    case 'Atrasado': color = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'; break;
    case 'Renegociado': color = 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'; break;
  }
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-opacity-80 dark:bg-opacity-60 ${color}`}>
      {status}
    </span>
  );
};

export const formatCurrency = (value: number) => {
  // Try to read config directly to avoid prop drilling, falls back safely
  let currency = 'BRL';
  let locale = 'pt-BR';

  try {
    const data = localStorage.getItem('app_config');
    if (data) {
      const config = JSON.parse(data);
      if (config.currency) currency = config.currency;
    }
  } catch (e) {
    // ignore
  }

  // Set Locale based on Currency for proper formatting
  if (currency === 'USD') locale = 'en-US';
  if (currency === 'EUR') locale = 'pt-PT';
  if (currency === 'MZN') locale = 'pt-MZ';
  if (currency === 'AOA') locale = 'pt-AO';

  return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(value);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
};