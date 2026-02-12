import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storage';
import { Card, Button, Input, Select, formatCurrency } from '../components/ui';
import { Wallet, Save, Moon, Sun, Lock, LogOut, Database, Download, Upload, Globe, Building2, PhoneCall, Headphones } from 'lucide-react';
import { CurrencyCode } from '../types';

interface SettingsProps {
  onLogout?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onLogout }) => {
  const [capital, setCapital] = useState(0);
  const [editCapital, setEditCapital] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('BRL');
  
  // Company Info State
  const [companyName, setCompanyName] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  
  // Security State
  const [hasPin, setHasPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  
  // File Upload Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const config = StorageService.getConfig();
    setCapital(config.capitalBalance);
    setEditCapital(config.capitalBalance.toString());
    setHasPin(!!config.securityPin);
    setCurrency(config.currency || 'BRL');
    setCompanyName(config.companyName || 'Fersami SU');
    setSupportPhone(config.supportPhone || '949054619');

    // Check theme
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true);
    }
  }, []);

  const handleSaveCapital = (e: React.FormEvent) => {
    e.preventDefault();
    const newVal = parseFloat(editCapital);
    if (!isNaN(newVal)) {
        StorageService.updateCapital(newVal);
        setCapital(newVal);
        setIsEditing(false);
    }
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    // Apenas o nome da empresa é editável agora
    StorageService.saveCompanyInfo(companyName, supportPhone);
    setIsEditingCompany(false);
    window.dispatchEvent(new Event('configUpdate'));
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value as CurrencyCode;
    setCurrency(newCurrency);
    StorageService.setCurrency(newCurrency);
    window.location.reload();
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length === 4) {
      StorageService.setPin(newPin);
      setHasPin(true);
      setIsSettingPin(false);
      setNewPin('');
    } else {
      alert("O PIN deve ter 4 dígitos.");
    }
  };

  const handleRemovePin = () => {
    if (window.confirm("Deseja remover o bloqueio por PIN? Qualquer pessoa poderá abrir o app.")) {
      StorageService.setPin(undefined);
      setHasPin(false);
    }
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.setItem('app_theme', 'light');
      setIsDark(false);
    } else {
      html.classList.add('dark');
      localStorage.setItem('app_theme', 'dark');
      setIsDark(true);
    }
  };

  const handleBackup = () => {
    const dataStr = StorageService.exportDatabase();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `backup_emprestimos_${new Date().toISOString().slice(0,10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileObj = e.target.files && e.target.files[0];
    if (!fileObj) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const json = event.target?.result as string;
        if (json) {
            if (window.confirm("ATENÇÃO: Isso irá substituir todos os dados atuais pelos dados do arquivo. Deseja continuar?")) {
                const success = StorageService.importDatabase(json);
                if (success) {
                    alert("Dados restaurados com sucesso! O aplicativo será recarregado.");
                    window.location.reload();
                } else {
                    alert("Erro ao importar arquivo. Verifique se é um backup válido.");
                }
            }
        }
    };
    reader.readAsText(fileObj);
    e.target.value = ''; 
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        <div className="flex justify-between items-center">
             <h1 className="text-xl font-bold text-slate-900 dark:text-white">Configurações</h1>
             {onLogout && hasPin && (
               <Button variant="danger" onClick={onLogout} className="text-xs px-3 py-1 flex items-center gap-1">
                 <LogOut size={14} /> Sair
               </Button>
             )}
        </div>

        {/* Company Data - Apenas nome editável */}
        <Card title="Dados da Empresa">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400">
                    <Building2 size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{companyName}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Personalize o nome exibido no app</p>
                </div>
            </div>

            {isEditingCompany ? (
                <form onSubmit={handleSaveCompany} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <Input label="Nome da Empresa" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                    <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => setIsEditingCompany(false)} className="flex-1">Cancelar</Button>
                        <Button type="submit" className="flex-1">Salvar</Button>
                    </div>
                </form>
            ) : (
                <Button onClick={() => setIsEditingCompany(true)} variant="outline" className="w-full text-sm">Editar Nome</Button>
            )}
        </Card>

        {/* Currency Settings */}
        <Card title="Moeda e Região">
           <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-400">
                    <Globe size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Moeda Principal</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Define o símbolo e formatação</p>
                </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-4 text-sm">
                Exemplo de formatação: <b>{formatCurrency(1250.50)}</b>
            </div>
            <Select label="Selecione a Moeda" value={currency} onChange={handleCurrencyChange}>
                <option value="BRL">Real Brasileiro (BRL - R$)</option>
                <option value="USD">Dólar Americano (USD - $)</option>
                <option value="EUR">Euro (EUR - €)</option>
                <option value="MZN">Metical Moçambicano (MZN - MT)</option>
                <option value="AOA">Kwanza Angolano (AOA - Kz)</option>
            </Select>
        </Card>

        {/* Security */}
        <Card title="Segurança">
            <div className="flex items-center gap-4 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasPin ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                    <Lock size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Bloqueio por PIN</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {hasPin ? 'App protegido por senha' : 'App sem proteção'}
                    </p>
                </div>
            </div>
            {isSettingPin ? (
              <form onSubmit={handleSavePin} className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <Input label="Novo PIN (4 dígitos)" type="number" pattern="\d*" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value.slice(0, 4))} placeholder="0000" />
                <div className="flex gap-2">
                  <Button variant="outline" type="button" onClick={() => setIsSettingPin(false)} className="flex-1">Cancelar</Button>
                  <Button type="submit" className="flex-1">Salvar</Button>
                </div>
              </form>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => setIsSettingPin(true)} variant="outline" className="flex-1 text-sm">{hasPin ? 'Alterar PIN' : 'Criar PIN'}</Button>
                {hasPin && (
                  <Button onClick={handleRemovePin} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20">Remover</Button>
                )}
              </div>
            )}
        </Card>

        {/* Data Management */}
        <Card title="Gestão de Dados (Backup)">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                    <Database size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Servidor Local</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Salve ou transfira seus dados</p>
                </div>
            </div>
            <div className="flex gap-3">
                <Button onClick={handleBackup} className="flex-1 flex items-center justify-center gap-2 text-sm bg-slate-800 dark:bg-slate-700"><Download size={16} /> Backup</Button>
                <Button onClick={handleRestoreClick} variant="outline" className="flex-1 flex items-center justify-center gap-2 text-sm border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400"><Upload size={16} /> Restaurar</Button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
            </div>
        </Card>

        {/* Theme Toggle */}
        <Card>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-indigo-900 text-indigo-300' : 'bg-amber-100 text-amber-600'}`}>
                        {isDark ? <Moon size={20} /> : <Sun size={20} />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Aparência</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Alternar entre claro e escuro</p>
                    </div>
                </div>
                <button onClick={toggleTheme} className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${isDark ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
            </div>
        </Card>

        {/* Fundo de Negócio */}
        <Card title="Fundo de Negócio (Plafond)">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-slate-900 dark:bg-slate-700 flex items-center justify-center text-white"><Wallet size={24} /></div>
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Saldo Atual</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(capital)}</p>
                </div>
            </div>
            {isEditing ? (
                <form onSubmit={handleSaveCapital} className="space-y-4">
                     <Input label="Definir Novo Saldo" type="number" step="0.01" value={editCapital} onChange={(e) => setEditCapital(e.target.value)} />
                     <div className="flex gap-2">
                         <Button variant="outline" onClick={() => setIsEditing(false)} type="button">Cancelar</Button>
                         <Button type="submit" className="flex items-center gap-2"><Save size={16} /> Salvar Alteração</Button>
                     </div>
                </form>
            ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline">Ajustar Saldo Manualmente</Button>
            )}
        </Card>

        {/* SEÇÃO DE APOIO FIXA NO FINAL */}
        <div className="mt-8 p-6 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-center animate-fade-in">
            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Headphones size={24} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Apoio ao Consumidor</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Precisa de ajuda com o sistema?</p>
            
            <div className="mt-4 flex flex-col items-center gap-1">
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{supportPhone}</p>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Fersami SU</p>
            </div>
        </div>

        <div className="text-center text-[10px] text-slate-400 mt-6 pb-4">
            Versão 1.5.0 • Desenvolvido com Gemini IA
        </div>
    </div>
  );
};

export default Settings;