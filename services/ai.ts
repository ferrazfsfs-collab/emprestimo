import { GoogleGenAI } from "@google/genai";
import { Loan, LoanStatus } from "../types";

export const AiService = {
  analyzePortfolio: async (loans: Loan[]) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const stats = {
        total: loans.length,
        emAberto: loans.filter(l => l.status === LoanStatus.PENDING).length,
        atrasados: loans.filter(l => l.status === LoanStatus.LATE).length,
        pagos: loans.filter(l => l.status === LoanStatus.PAID).length,
        valorTotal: loans.reduce((acc, l) => acc + l.totalAmount, 0),
        valorRestante: loans.reduce((acc, l) => {
          const paid = l.payments?.reduce((pAcc, p) => pAcc + p.amount, 0) || 0;
          return acc + (l.totalAmount - paid);
        }, 0)
      };

      const prompt = `Como um consultor financeiro especialista em microcrédito, analise estes dados de uma carteira de empréstimos e dê 3 dicas práticas e curtas para o gestor:
      - Total de Empréstimos: ${stats.total}
      - Em Aberto: ${stats.emAberto}
      - Em Atraso: ${stats.atrasados}
      - Valor Total na Rua: R$ ${stats.valorRestante.toFixed(2)}
      - Taxa de Inadimplência: ${((stats.atrasados / stats.total) * 100 || 0).toFixed(1)}%
      
      Responda em português de forma motivadora e profissional.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
      });

      return response.text || "Não foi possível gerar a análise no momento.";
    } catch (error) {
      console.error("AI Analysis Error:", error);
      return "Erro ao conectar com a inteligência artificial. Verifique se a API Key está configurada corretamente no Netlify.";
    }
  }
};