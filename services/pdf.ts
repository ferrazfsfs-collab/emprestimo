import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Loan, Client } from '../types';
import { formatCurrency, formatDate } from '../components/ui';

// Helper to fix TS issues with jspdf-autotable in browser ESM
const applyAutoTable = (doc: any, options: any) => {
  (autoTable as any)(doc, options);
};

// Internal helper to build the PDF document
const buildLoanStatementDoc = (loan: Loan, client: Client) => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');
    
    // --- Header Section ---
    const startY = 20;

    // Document Title
    doc.setFontSize(20);
    doc.setTextColor(5, 150, 105);
    doc.setFont(undefined, 'bold');
    doc.text('Extrato de Empréstimo', 105, startY, { align: 'center' });
    doc.setFont(undefined, 'normal');

    // Client Info Box
    const boxY = startY + 10;
    doc.setDrawColor(200);
    doc.setFillColor(245, 247, 250);
    doc.rect(14, boxY, 182, 35, 'FD');

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Cliente: ${client.name}`, 20, boxY + 10);
    doc.setFontSize(10);
    doc.text(`Telefone: ${client.phone}`, 20, boxY + 18);
    doc.text(`Emissão: ${today}`, 150, boxY + 10);
    doc.text(`ID: #${loan.id.slice(0, 6).toUpperCase()}`, 150, boxY + 18);

    // Loan Details
    const paid = loan.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
    const remaining = loan.totalAmount - paid;

    applyAutoTable(doc, {
      startY: boxY + 45,
      head: [['Detalhe', 'Valor']],
      body: [
        ['Valor Emprestado (Principal)', formatCurrency(loan.amount)],
        ['Taxa de Juros', `${loan.interestRate}%`],
        ['Total Acordado (Com Juros)', formatCurrency(loan.totalAmount)],
        ['Vencimento', formatDate(loan.dueDate)],
        ['Status Atual', loan.status]
      ],
      theme: 'plain',
      styles: { cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', width: 80 } }
    });

    // Payments History
    doc.text('Histórico de Pagamentos', 14, (doc as any).lastAutoTable.finalY + 15);

    const paymentRows = loan.payments?.map(p => [
      formatDate(p.date),
      p.type === 'FULL' ? 'Quitação' : 'Parcial',
      formatCurrency(p.amount)
    ]) || [];

    if (paymentRows.length > 0) {
      applyAutoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Data', 'Tipo', 'Valor']],
        body: paymentRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] } // Slate-900
      });
    } else {
       doc.setFontSize(10);
       doc.setTextColor(100);
       doc.text('Nenhum pagamento registrado até o momento.', 14, (doc as any).lastAutoTable.finalY + 25);
    }

    // Summary Box
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    
    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(0.5);
    doc.rect(120, finalY, 76, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('Total Pago:', 125, finalY + 10);
    doc.text(formatCurrency(paid), 190, finalY + 10, { align: 'right' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Saldo Devedor:', 125, finalY + 22);
    doc.setTextColor(220, 38, 38); // Red
    doc.text(formatCurrency(remaining), 190, finalY + 22, { align: 'right' });
    
    return doc;
};

export const PdfService = {
  generateLoansReport: (loans: Loan[], clients: Client[], filterStatus: string) => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');
    
    // --- Header Section ---
    const startY = 20;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text('Relatório de Empréstimos', 14, startY);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${today}`, 14, startY + 6);
    doc.text(`Filtro: ${filterStatus === 'ALL' ? 'Todos' : filterStatus}`, 14, startY + 11);

    // Table Data
    const tableBody = loans.map(loan => {
      const client = clients.find(c => c.id === loan.clientId);
      const paid = loan.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
      const remaining = loan.totalAmount - paid;

      return [
        client?.name || 'Desconhecido',
        formatCurrency(loan.amount),
        formatCurrency(loan.totalAmount),
        formatCurrency(remaining),
        formatDate(loan.dueDate),
        loan.status
      ];
    });

    applyAutoTable(doc, {
      startY: startY + 20,
      head: [['Cliente', 'Emprestado (Princ.)', 'Total (C/ Juros)', 'Restante', 'Vencimento', 'Status']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }, // Emerald-600
      styles: { fontSize: 8 },
    });

    // Totals Footer
    const totalPrincipal = loans.reduce((acc, l) => acc + l.amount, 0);
    const totalExpected = loans.reduce((acc, l) => acc + l.totalAmount, 0);

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Total Emprestado (Principal): ${formatCurrency(totalPrincipal)}`, 14, finalY);
    doc.text(`Total a Receber (C/ Juros): ${formatCurrency(totalExpected)}`, 14, finalY + 6);
    doc.text(`Quantidade: ${loans.length} registros`, 14, finalY + 12);

    doc.save(`relatorio_emprestimos_${today.replace(/\//g, '-')}.pdf`);
  },

  generateLoanStatement: (loan: Loan, client: Client) => {
    const doc = buildLoanStatementDoc(loan, client);
    doc.save(`extrato_${client.name.replace(/\s+/g, '_')}.pdf`);
  },

  shareLoanStatement: async (loan: Loan, client: Client) => {
    const doc = buildLoanStatementDoc(loan, client);
    const blob = doc.output('blob');
    const filename = `Extrato_${client.name.replace(/\s+/g, '_')}.pdf`;
    const file = new File([blob], filename, { type: 'application/pdf' });

    const paid = loan.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
    const remaining = loan.totalAmount - paid;
    const message = `Olá ${client.name}, segue o extrato do seu empréstimo.\nTotal Pago: ${formatCurrency(paid)}\nSaldo Restante: ${formatCurrency(remaining)}`;

    // Try Web Share API (Mobile native share)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
       try {
          await navigator.share({
            files: [file],
            title: 'Extrato de Empréstimo',
            text: message
          });
       } catch (error) {
          console.error('Erro ao compartilhar:', error);
       }
    } else {
       // Fallback for Desktop: Download file + Open WhatsApp Web Text
       doc.save(filename);
       const whatsappUrl = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message + '\n(O arquivo PDF foi baixado no seu dispositivo, por favor anexe-o aqui.)')}`;
       window.open(whatsappUrl, '_blank');
    }
  }
};