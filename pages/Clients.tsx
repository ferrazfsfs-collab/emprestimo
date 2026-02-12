
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { Client, RiskLevel } from '../types';
import { Card, Button, Input, formatDate } from '../components/ui';
import { Search, Plus, User, Trash2, AlertTriangle, MessageCircle, MessageSquare, Phone, X, ChevronRight, FileText, Hash, MoreVertical } from 'lucide-react';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [contactClient, setContactClient] = useState<Client | null>(null);
  
  // Form State
  const [newClient, setNewClient] = useState<Partial<Client>>({});

  useEffect(() => {
    setClients(StorageService.getClients());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.phone) return;

    const client: Client = {
      id: crypto.randomUUID(),
      name: newClient.name,
      phone: newClient.phone,
      document: newClient.document,
      notes: newClient.notes,
      createdAt: new Date().toISOString(),
    };

    StorageService.saveClient(client);
    setClients(StorageService.getClients());
    setShowForm(false);
    setNewClient({});
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setClientToDelete(id);
  };

  const handleContactClick = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setContactClient(client);
  };

  const confirmDelete = () => {
    if (clientToDelete) {
        StorageService.deleteClient(clientToDelete);
        setClients(prev => prev.filter(c => c.id !== clientToDelete));
        setClientToDelete(null);
    }
  };

  const handleSendWhatsApp = () => {
    if (!contactClient) return;
    const phone = contactClient.phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${contactClient.name}, tudo bem?`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    setContactClient(null);
  };

  const handleSendSMS = () => {
    if (!contactClient) return;
    const phone = contactClient.phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${contactClient.name}, tudo bem?`);
    window.open(`sms:${phone}?body=${message}`, '_self');
    setContactClient(null);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clientes</h1>
        <Button onClick={() => setShowForm(!showForm)} className="rounded-full w-12 h-12 p-0 flex items-center justify-center shadow-lg bg-emerald-600">
           {showForm ? <X size={24} /> : <Plus size={24} />}
        </Button>
      </div>

      {/* Modal de Exclusão */}
      {clientToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                <div className="text-center mb-6">
                    <div className="bg-red-50 dark:bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center text-red-600 mx-auto mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Excluir Cliente?</h3>
                    <p className="text-slate-500 text-sm mt-2">Isso removerá permanentemente o cliente e seus empréstimos.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setClientToDelete(null)} className="flex-1">Cancelar</Button>
                    <Button variant="danger" onClick={confirmDelete} className="flex-1">Excluir</Button>
                </div>
            </div>
        </div>
      )}

      {/* Action Sheet de Contato */}
      {contactClient && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-[2rem] sm:rounded-2xl p-6 shadow-2xl animate-slide-up sm:animate-scale-in">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 sm:hidden"></div>
                <div className="text-center mb-8">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{contactClient.name}</h3>
                    <p className="text-slate-500 font-medium">{contactClient.phone}</p>
                </div>
                <div className="space-y-3">
                    <button onClick={handleSendWhatsApp} className="w-full flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl font-bold transition-all active:scale-95">
                        <div className="flex items-center gap-3">
                            <MessageCircle size={22} /> WhatsApp
                        </div>
                        <ChevronRight size={18} />
                    </button>
                    <button onClick={handleSendSMS} className="w-full flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl font-bold transition-all active:scale-95">
                        <div className="flex items-center gap-3">
                            <MessageSquare size={22} /> SMS
                        </div>
                        <ChevronRight size={18} />
                    </button>
                    <a href={`tel:${contactClient.phone}`} className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all active:scale-95">
                        <div className="flex items-center gap-3">
                            <Phone size={22} /> Ligar
                        </div>
                        <ChevronRight size={18} />
                    </a>
                    <Button variant="outline" onClick={() => setContactClient(null)} className="w-full h-14 mt-2">Fechar</Button>
                </div>
            </div>
        </div>
      )}

      {showForm && (
        <Card title="Cadastrar Cliente" className="animate-fade-in border-l-4 border-l-emerald-500">
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Nome Completo" required value={newClient.name || ''} onChange={e => setNewClient({...newClient, name: e.target.value})} placeholder="Ex: João Silva" />
            <Input label="Telemóvel" required type="tel" value={newClient.phone || ''} onChange={e => setNewClient({...newClient, phone: e.target.value})} placeholder="9XX XXX XXX" />
            <Input label="Documento (Opcional)" value={newClient.document || ''} onChange={e => setNewClient({...newClient, document: e.target.value})} placeholder="BI / NUIT" />
            <Input label="Notas" value={newClient.notes || ''} onChange={e => setNewClient({...newClient, notes: e.target.value})} placeholder="Observações importantes..." />
            <Button type="submit" className="w-full h-12">Salvar Cliente</Button>
          </form>
        </Card>
      )}

      {/* Busca */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Pesquisar por nome ou telefone..." 
          className="w-full pl-12 pr-4 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* LISTA DE CLIENTES */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <User size={48} className="mx-auto mb-4 opacity-10" />
            <p className="font-medium">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredClients.map(client => {
              const risk = StorageService.calculateClientRisk(client.id);
              const riskStyles = {
                [RiskLevel.LOW]: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/30', bar: 'bg-emerald-500' },
                [RiskLevel.MEDIUM]: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800/30', bar: 'bg-amber-500' },
                [RiskLevel.HIGH]: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800/30', bar: 'bg-red-500' }
              };
              const style = riskStyles[risk];

              return (
                <div 
                  key={client.id} 
                  className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group active:bg-slate-100 dark:active:bg-slate-800"
                  onClick={(e) => handleContactClick(e, client)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Indicador de Risco (Barra Lateral) */}
                    <div className={`w-1 h-8 rounded-full ${style.bar} opacity-60`}></div>
                    
                    {/* Avatar / Inicial */}
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* Informações principais */}
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate pr-2 leading-tight">
                        {client.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {client.phone}
                      </p>
                    </div>
                  </div>

                  {/* Lado Direito: Risco e Botões */}
                  <div className="flex items-center gap-3">
                    <span className={`hidden xs:block text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${style.bg} ${style.text} ${style.border}`}>
                      {risk}
                    </span>
                    
                    <button 
                      onClick={(e) => handleDeleteClick(e, client.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                    
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold pb-10">
        Total: {filteredClients.length} Clientes
      </div>
    </div>
  );
};

export default Clients;
