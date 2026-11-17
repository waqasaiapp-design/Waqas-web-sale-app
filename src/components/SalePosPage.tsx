import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Store,
  ShoppingCart,
  Search,
  ScanBarcode,
  User,
  Users,
  Plus,
  Minus,
  Trash2,
  Package,
  Layers,
  Clock,
  Pause,
  ChevronRight,
  ChevronDown,
  X,
  CreditCard,
  Banknote,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  History,
  Grid,
  FileText,
  AlertCircle,
  CheckCircle2,
  Settings,
  ArrowLeft,
  Printer,
  Share2,
  Edit,
  Maximize2,
  Minimize2,
  Calendar,
  DollarSign,
  Filter,
  RefreshCw,
  LayoutGrid,
} from 'lucide-react';
import {
  Product,
  CartItem,
  POSMode,
  StoreBranding,
  UserProfile,
  DeviceInfo,
  CategoryInfo,
  SaleTransaction,
  Customer,
  HeldBill,
  PaymentMethod,
} from '../types/pos';
import { formatRs } from '../data/defaultProducts';
import { ProductGraphic } from './ProductGraphic';
import {
  safeStr,
  buildMobileCategoryList,
  getOldSaleMobileVisibleProducts,
  removeLastCartItem,
} from '../utils/oldSaleHelpers';

interface SalePosPageProps {
  products: Product[];
  categories: CategoryInfo[];
  cart: CartItem[];
  mode: POSMode;
  totalQty: number;
  subtotal: number;
  discount: number;
  taxAmount?: number;
  grandTotal: number;
  heldBillsCount: number;
  heldBills?: HeldBill[];
  onResumeHeldBill?: (bill: HeldBill) => void;
  onDeleteHeldBill?: (billId: string) => void;
  branding: StoreBranding;
  currentUser: UserProfile;
  currentDevice: DeviceInfo;
  transactions: SaleTransaction[];
  customers?: Customer[];
  onAddToCart: (product: Product, qty?: number) => void;
  onUpdateCartQty: (itemId: string, newQty: number) => void;
  onUpdateCartPrice?: (itemId: string, newPrice: number) => void;
  onUpdateDiscount?: (amt: number) => void;
  onUpdateTax?: (amt: number) => void;
  onRemoveCartItem: (itemId: string) => void;
  onClearCart: () => void;
  onSwitchMode: (mode: POSMode) => void;
  onOpenCheckout: (preSelectedMethod?: PaymentMethod) => void;
  onOpenCartDrawer?: () => void;
  onHoldBill: () => void;
  onOpenHeldBills: () => void;
  onOpenScanner: () => void;
  onOpenAddProduct: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onNavigate: (page: string) => void;
  onViewReceipt?: (tx: SaleTransaction) => void;
  onDeleteTransaction?: (invoiceNumber: string) => void;
  onEditTransaction?: (tx: SaleTransaction) => void;
  onSwitchToNewSale?: () => void;
  onLoadSeedProducts?: () => void;
  onResetAllZero?: () => void;
  onQuickAddCustomer?: (customer: Customer) => void;
  onConfirmCheckout?: (details: {
    method: PaymentMethod;
    cashTendered?: number;
    changeDue?: number;
    cardBank?: string;
    cardRef?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    note?: string;
  }) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (catId: string) => void;
  statusMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
}

// POS Error Boundary to guarantee resilience
class PosErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SalePosPage Error Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white rounded-3xl p-8 max-w-md shadow-xl border border-red-100">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              سیل اسکرین کو ریفریش کریں (Screen Recovered)
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              ایک عارضی ایرر کو بحال کر دیا گیا ہے۔ براہ کرم نیچے ریفریش کا بٹن دبائیں۔
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-3 bg-[#16a34a] hover:bg-green-700 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2"
            >
              ریفریش کریں (Refresh POS)
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const SalePosPage: React.FC<SalePosPageProps> = (props) => {
  return (
    <PosErrorBoundary>
      <SalePosPageInternal {...props} />
    </PosErrorBoundary>
  );
};

const SalePosPageInternal: React.FC<SalePosPageProps> = ({
  products,
  categories,
  cart,
  mode,
  totalQty,
  subtotal,
  discount,
  grandTotal,
  heldBills = [],
  onResumeHeldBill,
  onDeleteHeldBill,
  transactions,
  customers = [],
  onAddToCart,
  onUpdateCartQty,
  onRemoveCartItem,
  onClearCart,
  onSwitchMode,
  onOpenCheckout,
  onOpenCartDrawer,
  onHoldBill,
  onOpenScanner,
  onOpenAddProduct,
  onOpenHistory,
  onOpenSettings,
  onNavigate,
  onViewReceipt,
  onDeleteTransaction,
  onEditTransaction,
  onSwitchToNewSale,
  onLoadSeedProducts,
  onResetAllZero,
  onQuickAddCustomer,
  onConfirmCheckout,
  searchQuery,
  setSearchQuery,
  setSelectedCategory,
}) => {
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {}
  };

  // Local UI States
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'GENERAL'>('ALL');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isInternalHeldBillsOpen, setIsInternalHeldBillsOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  const [confirmingDeleteBillId, setConfirmingDeleteBillId] = useState<string | null>(null);
  const [showConfirmClearCart, setShowConfirmClearCart] = useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

  // Mobile Old Sale States (starts empty until user searches or selects category / ALL ITEMS)
  const [mobileSelectedCategory, setMobileSelectedCategory] = useState<string | null>(null);
  const [isMobileBillsModalOpen, setIsMobileBillsModalOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState('');
  const [mobilePaymentFilter] = useState<'All' | 'cash' | 'credit' | 'card' | 'digital'>('All');
  const [mobileDateFilter, setMobileDateFilter] = useState<'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'>('All');
  const [mobileCustomDate, setMobileCustomDate] = useState('');
  const [selectedMobileTx, setSelectedMobileTx] = useState<SaleTransaction | null>(null);
  const [confirmingDeleteInvoiceNo, setConfirmingDeleteInvoiceNo] = useState<string | null>(null);
  const [mobileShareNotice, setMobileShareNotice] = useState<string | null>(null);

  const mobileCategoryPills = useMemo(
    () => buildMobileCategoryList(products, categories),
    [products, categories]
  );

  const mobileProductDisplay = useMemo(
    () => getOldSaleMobileVisibleProducts(products, searchQuery, mobileSelectedCategory),
    [products, searchQuery, mobileSelectedCategory]
  );

  // Filtered transactions for Mobile Invoices Tab
  const mobileFilteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (mobileSearch.trim()) {
        const q = mobileSearch.toLowerCase().trim();
        const matchInv = (tx.invoiceNumber || '').toLowerCase().includes(q);
        const matchCust = (tx.customerName || '').toLowerCase().includes(q);
        const matchItems = tx.items?.some((it) => (it.product?.name || '').toLowerCase().includes(q));
        if (!matchInv && !matchCust && !matchItems) return false;
      }
      if (mobilePaymentFilter !== 'All' && tx.paymentMethod !== mobilePaymentFilter) {
        return false;
      }
      if (mobileDateFilter !== 'All') {
        const now = new Date();
        const txDate = new Date(tx.dateTime);
        if (!isNaN(txDate.getTime())) {
          const diffDays = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
          if (mobileDateFilter === 'Today' && diffDays !== 0) return false;
          if (mobileDateFilter === 'Yesterday' && diffDays !== 1) return false;
          if (mobileDateFilter === 'This Week' && diffDays > 7) return false;
          if (mobileDateFilter === 'This Month' && diffDays > 30) return false;
          if (mobileDateFilter === 'Custom' && mobileCustomDate) {
            const iso = txDate.toISOString().split('T')[0];
            if (iso !== mobileCustomDate) return false;
          }
        }
      }
      return true;
    });
  }, [transactions, mobileSearch, mobilePaymentFilter, mobileDateFilter, mobileCustomDate]);

  const mobileTotalSalesAmount = useMemo(() => {
    return mobileFilteredTransactions.reduce((acc, tx) => acc + (tx.grandTotal || 0), 0);
  }, [mobileFilteredTransactions]);

  // Quick Customer State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustBalance, setNewCustBalance] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Calculations for cash tendered
  const cashReceivedNum = parseFloat(cashTendered) || 0;
  const remainingOrChange = cashReceivedNum > 0 ? grandTotal - cashReceivedNum : grandTotal;

  // Real purchase price for active selected product
  const activeProductCost = useMemo(() => {
    if (cart.length > 0) {
      const last = cart[cart.length - 1];
      const match = products.find((p) => p.id === last.product.id) || last.product;
      return match.costPrice || 0;
    }
    return 0;
  }, [cart, products]);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Safe search and category filtering
  const safeQuery = safeStr(searchQuery).toLowerCase();
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Text Search match
      if (safeQuery) {
        const b = safeStr(p?.barcode).toLowerCase();
        const s = safeStr(p?.sku).toLowerCase();
        const n = safeStr(p?.name).toLowerCase();
        const u = safeStr(p?.urduName).toLowerCase();
        const c = safeStr(p?.category).toLowerCase();
        const matchesQuery =
          b.includes(safeQuery) ||
          s.includes(safeQuery) ||
          n.includes(safeQuery) ||
          u.includes(safeQuery) ||
          c.includes(safeQuery);
        if (!matchesQuery) return false;
      }

      // 2. Filter Pills
      if (selectedFilter === 'GENERAL') {
        const cat = safeStr(p?.category).toLowerCase();
        return cat.includes('general') || cat.includes('grocery') || cat.includes('household');
      }

      return true;
    });
  }, [products, safeQuery, selectedFilter]);

  // Audio chimes
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  const playErrorSound = () => {
    try {
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  };

  // Barcode Submission (Enter Key & Hardware Scanner)
  const handleBarcodeSubmit = (rawInput?: string) => {
    const query = safeStr(rawInput !== undefined ? rawInput : searchQuery).toLowerCase();
    if (!query) return;

    // 1. Exact Barcode Match
    let match = products.find((p) => safeStr(p?.barcode).toLowerCase() === query);

    // 2. Exact SKU Match
    if (!match) {
      match = products.find((p) => safeStr(p?.sku).toLowerCase() === query);
    }

    // 3. Exact Name Match
    if (!match) {
      match = products.find((p) => safeStr(p?.name).toLowerCase() === query);
    }

    // 4. Single Partial Search Match
    if (!match && filteredProducts.length === 1) {
      match = filteredProducts[0];
    }

    if (match) {
      playBeep();
      onAddToCart(match, 1);
      setSearchQuery('');
      searchInputRef.current?.focus();
    } else {
      playErrorSound();
    }
  };

  // Global Hardware Barcode Listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') &&
        target !== searchInputRef.current
      ) {
        return;
      }

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 2) {
          e.preventDefault();
          handleBarcodeSubmit(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        if (diff > 120) buffer = '';
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [products, searchQuery, filteredProducts]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeSubmit();
    }
  };

  // Customer Creation
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const balance = parseFloat(newCustBalance) || 0;
    if (onQuickAddCustomer) {
      onQuickAddCustomer({
        id: `cust-${Date.now()}`,
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        address: newCustAddress.trim() || undefined,
        previousBalance: balance,
        createdAt: new Date().toLocaleDateString('en-GB'),
      });
    }
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustBalance('');
    setIsCustomerModalOpen(false);
  };

  // Checkout Handler
  const handleCheckoutClick = () => {
    if (cart.length === 0) return;
    if (onConfirmCheckout) {
      const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
      onConfirmCheckout({
        method: selectedPaymentMethod,
        cashTendered: cashReceivedNum > 0 ? cashReceivedNum : grandTotal,
        changeDue: cashReceivedNum > grandTotal ? cashReceivedNum - grandTotal : 0,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.phone,
      });
    } else {
      onOpenCheckout(selectedPaymentMethod);
    }
  };

  // Handle Hold Bill Action (Hold active cart or open held bills list if empty)
  const handleHoldBillAction = () => {
    if (cart.length > 0) {
      onHoldBill();
    } else {
      setIsInternalHeldBillsOpen(true);
    }
  };

  const handleResumeBillInternal = (bill: HeldBill) => {
    if (onResumeHeldBill) {
      onResumeHeldBill(bill);
      setIsInternalHeldBillsOpen(false);
    }
  };

  const handleConfirmDeleteBill = (billId: string) => {
    if (onDeleteHeldBill) {
      onDeleteHeldBill(billId);
    }
    setConfirmingDeleteBillId(null);
  };

  const handleDeleteLastCartItem = () => {
    if (cart.length === 0) return;
    const remaining = removeLastCartItem(cart);
    const removed = cart.find((item) => !remaining.some((r) => r.id === item.id));
    if (removed) {
      onRemoveCartItem(removed.id);
    }
  };

  return (
    <div className="flex-1 min-h-full w-full bg-[#f4f6f9] lg:bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* Confirmation Modal if navigating back with active cart */}
      {showConfirmLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Active Sale in Progress</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  You have {cart.length} item(s) in your sale cart. Do you want to park/hold this bill before leaving?
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onHoldBill();
                  setShowConfirmLeave(false);
                  onNavigate('Home');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Pause className="w-4 h-4 fill-white" />
                <span>Hold Bill & Return to Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmLeave(false);
                  onNavigate('Home');
                }}
                className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-all"
              >
                Leave Without Holding
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmLeave(false)}
                className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
              >
                Stay on Sale Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TOP APP HEADER (DESKTOP ONLY - MOBILE MATCHES CLEAN REFERENCE SCREENSHOT)
         ========================================================================= */}
      <header className="hidden lg:block w-full px-3 sm:px-6 py-2.5 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Back Button + Green Store Icon + WAQAS MART Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Prominent Visible Back Button */}
            <button
              type="button"
              onClick={() => {
                if (cart.length > 0) {
                  setShowConfirmLeave(true);
                } else {
                  onNavigate('Home');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white active:scale-95 text-xs font-black shadow-xs transition-all cursor-pointer"
              title="Return to Dashboard (ڈیش بورڈ واپس جائیں)"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.6]" />
              <span>Back to Home (واپسی)</span>
            </button>

            <div className="w-9 h-9 rounded-xl bg-[#16a34a] text-white flex items-center justify-center shadow-sm shrink-0">
              <Store className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-none">
                  WAQAS MART
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md border border-emerald-200">
                  Touch POS (Old Sale)
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block mt-0.5">
                Full-Screen POS Workstation • مستقل فل سکرین کاؤنٹر
              </p>
            </div>
          </div>

          {/* Right Action Icons: (+) Add Product, History Clock, Orange Pause/Hold, Fullscreen, Chevron */}
          <div className="flex items-center gap-2">
            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter 100% Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className="hidden sm:inline text-[11px]">{isFullscreen ? 'Normal' : 'Fullscreen'}</span>
            </button>

            {/* (+) Add Product Button */}
            <button
              type="button"
              onClick={onOpenAddProduct}
              className="w-8 h-8 rounded-full border-2 border-emerald-500 text-emerald-600 flex items-center justify-center hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer"
              title="Add Product"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* History Clock Button */}
            <button
              type="button"
              onClick={onOpenHistory}
              className="w-8 h-8 rounded-full border border-slate-300 text-slate-700 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
              title="Transaction History / آرڈرز تاریخ"
            >
              <History className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>

            {/* Orange Pause / Hold Button */}
            <button
              type="button"
              onClick={handleHoldBillAction}
              className="w-8 h-8 rounded-full bg-[#f97316] hover:bg-orange-600 active:scale-95 text-white flex items-center justify-center shadow-xs transition-all cursor-pointer relative"
              title="Hold Bill / بل روکیں"
            >
              <Pause className="w-3.5 h-3.5 fill-white" />
              {heldBills.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-orange-600 text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-orange-500 shadow-xs">
                  {heldBills.length}
                </span>
              )}
            </button>

            {/* Next / Switcher Arrow */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                className="w-8 h-8 rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all cursor-pointer"
                title="More POS Options"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Options Dropdown */}
              {isMoreMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      WAQAS MART POS
                    </p>
                    <p className="text-xs font-bold text-slate-800">Software Options</p>
                  </div>
                  {onSwitchToNewSale && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onSwitchToNewSale();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center justify-between"
                    >
                      <span>New Sale Spreadsheet POS</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onLoadSeedProducts && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onLoadSeedProducts();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Load 15 Real Picture Items</span>
                    </button>
                  )}
                  {onResetAllZero && (
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onResetAllZero();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset All Records to Zero</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsInternalHeldBillsOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>View Held Bills (ہولڈ شدہ بل)</span>
                    <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {heldBills.length}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Settings & Receipt Designer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================================
          1. DESKTOP WORKSTATION: PRESERVED 100% UNTOUCHED (FOR DESKTOP & LAPTOP)
         ========================================================================= */}
      <div className="hidden lg:grid flex-1 min-h-0 w-full px-5 lg:px-6 my-2 grid-cols-12 gap-4 items-stretch overflow-hidden">
        {/* ============================================================== */}
        {/* LEFT COLUMN: CATALOG, SEARCH, FILTERS & PRODUCT GRID           */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 h-full overflow-hidden space-y-2">
          {/* Mode Switcher Tabs Capsule (Sale | Purchase | Return Mode) */}
          <div className="bg-[#e2e8f0]/60 p-1.5 rounded-2xl flex items-center justify-between gap-1 border border-slate-200/50">
            <button
              type="button"
              onClick={() => onSwitchMode('sale')}
              className={`flex-1 py-2 px-3 text-center text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'sale'
                  ? 'bg-[#16a34a] text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              Sale
            </button>

            <button
              type="button"
              onClick={() => {
                onSwitchMode('purchase');
                onNavigate('Purchase Entry');
              }}
              className={`flex-1 py-2 px-3 text-center text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'purchase'
                  ? 'bg-[#16a34a] text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              Purchase
            </button>

            <button
              type="button"
              onClick={() => {
                onSwitchMode('return');
                onNavigate('Sale Returns');
              }}
              className={`flex-1 py-2 px-3 text-center text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'return'
                  ? 'bg-[#16a34a] text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              Return Mode
            </button>
          </div>

          {/* Barcode & Product Search Bar */}
          <div className="relative flex items-center bg-white rounded-2xl sm:rounded-full border border-slate-200/90 shadow-xs px-4 py-2.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or Scan Barcode..."
              className="w-full text-sm font-medium text-slate-800 placeholder-slate-400 bg-transparent outline-none pr-3"
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 mr-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenScanner}
              className="p-1.5 text-[#16a34a] hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Scan with Camera / Barcode Scanner"
            >
              <ScanBarcode className="w-6 h-6 stroke-[2.2]" />
            </button>
          </div>

          {/* Item Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setSelectedFilter('ALL')}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                selectedFilter === 'ALL'
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              ALL ITEMS
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter('GENERAL')}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                selectedFilter === 'GENERAL'
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              ALL ITEMS (GENERAL)
            </button>

            {categories.slice(0, 6).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className="px-4 py-2 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0 cursor-pointer"
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Mobile Cart Preview (Shown only on small screens when cart has items) */}
          <div className="lg:hidden">
            {cart.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs mb-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Active Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                    </span>
                  </div>
                  {showConfirmClearCart ? (
                    <div className="flex items-center gap-1.5 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                      <span className="text-[10px] font-bold text-red-700">Clear all?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onClearCart();
                          setShowConfirmClearCart(false);
                        }}
                        className="px-2 py-0.5 text-[10px] font-black bg-red-600 text-white rounded cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmClearCart(false)}
                        className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirmClearCart(true)}
                      className="text-[11px] font-black text-red-600 hover:text-red-700 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>All Del ({cart.length})</span>
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto mt-1">
                  {cart.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between text-xs gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 truncate">{item.product.name}</div>
                        <div className="text-[10px] text-slate-400">
                          Rs. {item.unitPrice.toFixed(0)} × {item.quantity} = Rs.{' '}
                          {item.lineTotal.toFixed(0)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity <= 1) onRemoveCartItem(item.id);
                            else onUpdateCartQty(item.id, item.quantity - 1);
                          }}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold active:scale-90 cursor-pointer"
                          title="Decrease Qty"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={item.quantity}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > 0) {
                              onUpdateCartQty(item.id, val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="w-14 text-center font-black text-slate-900 bg-white border border-slate-300 rounded-lg px-1 py-0.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          title="Type any quantity (e.g. 5, 20, 50, 100, 500, 1000)"
                        />
                        <button
                          type="button"
                          onClick={() => onUpdateCartQty(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold active:scale-90 cursor-pointer"
                          title="Increase Qty"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveCartItem(item.id)}
                          className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center ml-1 active:scale-90 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                      Customer
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-1"
                    >
                      <option value="">Walk-in Customer (کیش)</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                      Cash Tendered
                    </label>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder={grandTotal > 0 ? grandTotal.toFixed(0) : '0'}
                      className="w-full text-xs font-bold text-right bg-slate-50 border border-slate-200 rounded-lg p-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Products Catalog Grid */}
          <main className="w-full flex-1 min-h-0 overflow-y-auto pr-1">
            {products.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-slate-200">
                <div className="w-24 h-24 text-slate-300 flex items-center justify-center mb-2">
                  <ShoppingCart className="w-20 h-20 stroke-[1.2]" />
                </div>
                <p className="text-slate-500 font-medium text-base mt-2 mb-5">
                  No products available. Add products to begin.
                </p>
                <button
                  type="button"
                  onClick={onOpenAddProduct}
                  className="px-6 py-2.5 bg-[#16a34a] hover:bg-green-700 active:scale-95 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add Product</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((p) => {
                  const cartMatch = cart.find((c) => c.product.id === p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => onAddToCart(p, 1)}
                      className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                    >
                      <div>
                        <div className="w-full h-28 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden mb-2 relative">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <ProductGraphic product={p} className="w-14 h-14" />
                          )}
                          {cartMatch && (
                            <span className="absolute top-1.5 right-1.5 bg-[#16a34a] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                              {cartMatch.quantity} in cart
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-xs text-slate-900 line-clamp-2 leading-tight group-hover:text-emerald-700">
                          {p.name}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span className="truncate">{p.category}</span>
                          <span className={p.stock < 0 ? 'text-red-600 font-bold' : 'text-slate-500 font-semibold'}>
                            Stock: {p.stock}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">
                          Rs. {p.price.toFixed(0)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(p, 1);
                          }}
                          className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-[#16a34a] text-emerald-700 hover:text-white flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: DESKTOP ACTIVE CART & CHECKOUT TERMINAL          */}
        {/* ============================================================== */}
        <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col min-h-0 h-full overflow-hidden">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-md flex flex-col h-full min-h-0 overflow-hidden">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm leading-tight">Sales Cart</h3>
                  <p className="text-[11px] text-slate-400">
                    {cart.length} {cart.length === 1 ? 'item' : 'items'} • Total Qty: {totalQty}
                  </p>
                </div>
              </div>

              {cart.length > 0 && (
                showConfirmClearCart ? (
                  <div className="flex items-center gap-1.5 bg-red-50 px-2 py-1 rounded-xl border border-red-200">
                    <span className="text-[10px] font-bold text-red-700">Clear all?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClearCart();
                        setShowConfirmClearCart(false);
                      }}
                      className="px-2 py-0.5 text-[10px] font-black bg-red-600 text-white rounded cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmClearCart(false)}
                      className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmClearCart(true)}
                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Cart</span>
                  </button>
                )
              )}
            </div>

            {/* Cart Items Table */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 my-2 pr-1 space-y-1">
              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                  <ShoppingCart className="w-12 h-12 stroke-[1.2] text-slate-300 mb-2" />
                  <p className="font-bold text-xs text-slate-600">Your Cart is Empty</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click or scan items to add to this sale.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">{item.product.name}</div>
                      <div className="text-[10px] text-slate-400">
                        Rs. {item.unitPrice.toFixed(0)} × {item.quantity} = <strong className="text-emerald-700">Rs. {item.lineTotal.toFixed(0)}</strong>
                      </div>
                    </div>

                    {/* Direct Quantity Entry (type 50, 100, 500, etc.) */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity <= 1) onRemoveCartItem(item.id);
                          else onUpdateCartQty(item.id, item.quantity - 1);
                        }}
                        className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold active:scale-90 cursor-pointer"
                        title="Decrease Qty"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.quantity}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            onUpdateCartQty(item.id, val);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="w-14 text-center font-black text-slate-900 bg-white border border-slate-300 rounded-lg px-1 py-0.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        title="Direct numeric quantity (e.g. 5, 20, 50, 100, 500)"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateCartQty(item.id, item.quantity + 1)}
                        className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold active:scale-90 cursor-pointer"
                        title="Increase Qty"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveCartItem(item.id)}
                        className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center ml-1 active:scale-90 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer Selector & Cash Received */}
            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Customer / کھاتہ دار
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2"
                  >
                    <option value="">Walk-in Customer (کیش)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="mt-4 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                  title="Add New Customer"
                >
                  + New
                </button>
              </div>

              {/* Payment Method Pills */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('cash')}
                  className={`py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer ${
                    selectedPaymentMethod === 'cash'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('card')}
                  className={`py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer ${
                    selectedPaymentMethod === 'card'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('credit')}
                  className={`py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer ${
                    selectedPaymentMethod === 'credit'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Credit</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Cash Received
                  </label>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={grandTotal > 0 ? grandTotal.toFixed(0) : '0'}
                    className="w-full text-xs font-bold text-right bg-slate-50 border border-slate-200 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Change / Due
                  </label>
                  <div className="w-full text-xs font-black text-right bg-slate-100 border border-slate-200 rounded-xl p-2 text-slate-800">
                    Rs. {remainingOrChange > 0 ? remainingOrChange.toFixed(0) : '0'}
                  </div>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-800">Rs. {subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount:</span>
                    <span>-Rs. {discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-black text-base pt-1 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-emerald-700">Rs. {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Hold Bill & Checkout Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleHoldBillAction}
                  className="py-3 px-3 rounded-2xl bg-orange-100 hover:bg-orange-200 text-orange-800 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Pause className="w-4 h-4 fill-orange-700" />
                  <span>{cart.length > 0 ? 'Hold Bill' : `Held Bills (${heldBills.length})`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCheckoutClick}
                  disabled={cart.length === 0}
                  className={`py-3 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all ${
                    cart.length > 0
                      ? 'bg-[#16a34a] hover:bg-green-700 active:scale-95 text-white cursor-pointer'
                      : 'bg-[#a7f3d0] text-emerald-800 cursor-not-allowed opacity-90'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Checkout (F10)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. DEDICATED MOBILE PORTRAIT LAYOUT FOR OLD SALE (REFERENCE DESIGN MATCH)
         ========================================================================= */}
      <div className="lg:hidden flex-1 flex flex-col min-h-0 h-full bg-[#f4f6f9] overflow-hidden">
        {/* Top Controls Container */}
        <div className="px-3 pt-3 pb-2 space-y-2.5 shrink-0">
          {/* 1. Mode Switcher Capsule: Sale | Purchase | Return Mode */}
          <div className="bg-[#e2e8f0]/80 p-1 rounded-2xl flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => onSwitchMode('sale')}
              className={`flex-1 py-2.5 px-2 min-h-[42px] text-center text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'sale'
                  ? 'bg-[#16a34a] text-white shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sale
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchMode('purchase');
                onNavigate('Purchase Entry');
              }}
              className={`flex-1 py-2.5 px-2 min-h-[42px] text-center text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'purchase'
                  ? 'bg-[#16a34a] text-white shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Purchase
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchMode('return');
                onNavigate('Sale Returns');
              }}
              className={`flex-1 py-2.5 px-2 min-h-[42px] text-center text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'return'
                  ? 'bg-[#16a34a] text-white shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Return Mode
            </button>
          </div>

          {/* 2. Search / Barcode Input + Green Scanner Icon */}
          <div className="flex items-center bg-white rounded-2xl border border-slate-200/90 shadow-xs px-3.5 py-2 focus-within:border-[#16a34a] focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or Scan Barcode..."
              className="w-full text-sm font-medium text-slate-800 placeholder-slate-400 bg-transparent outline-none pr-2 min-h-[36px]"
              aria-label="Search or Scan Barcode"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1.5 mr-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onOpenScanner}
              className="p-1.5 text-[#16a34a] hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Scan Barcode"
              aria-label="Scan Barcode"
            >
              <ScanBarcode className="w-6 h-6 stroke-[2.2]" />
            </button>
          </div>

          {/* 3. Category Pills Row (ALL ITEMS + Genuine Saved Categories Only) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => {
                setMobileSelectedCategory('ALL ITEMS');
                setSelectedCategory('ALL ITEMS');
              }}
              className={`px-4 py-2 min-h-[38px] rounded-full text-xs font-black uppercase tracking-wide transition-all cursor-pointer shrink-0 ${
                mobileSelectedCategory === 'ALL ITEMS'
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'bg-[#0f172a] text-white/95 opacity-90 hover:opacity-100'
              }`}
            >
              ALL ITEMS
            </button>

            {mobileCategoryPills.map((catName) => {
              const isSelected = mobileSelectedCategory === catName;
              return (
                <button
                  key={catName}
                  type="button"
                  onClick={() => {
                    setMobileSelectedCategory(catName);
                    setSelectedCategory(catName);
                  }}
                  className={`px-4 py-2 min-h-[38px] rounded-full text-xs font-bold uppercase tracking-wide transition-all cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-[#16a34a] text-white border-[#16a34a] shadow-xs'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {catName}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Product Display Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2">
          {!mobileProductDisplay.shouldDisplayProducts ? (
            <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center px-6 py-8">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center mb-3 text-slate-400">
                <Search className="w-7 h-7 stroke-[1.7]" />
              </div>
              <p className="text-sm font-bold text-slate-700">
                No Products Found — Search or select a category to view products.
              </p>
            </div>
          ) : mobileProductDisplay.visibleProducts.length === 0 ? (
            <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center px-6 py-8">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center mb-3 text-slate-400">
                <Package className="w-7 h-7 stroke-[1.7]" />
              </div>
              <p className="text-sm font-bold text-slate-700">No Products Found</p>
              <p className="text-xs text-slate-500 mt-1">
                Search or select another category to view products.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-2">
              {mobileProductDisplay.visibleProducts.map((p) => {
                const cartMatch = cart.find((c) => c.product.id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onAddToCart(p, 1)}
                    className={`bg-white rounded-2xl p-2.5 shadow-xs transition-all cursor-pointer flex flex-col justify-between text-center relative overflow-hidden active:scale-[0.98] ${
                      cartMatch
                        ? 'border-2 border-[#16a34a] shadow-sm'
                        : 'border border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    {cartMatch && (
                      <span className="absolute top-2 right-2 z-10 min-w-[24px] h-6 px-1.5 rounded-full bg-[#16a34a] text-white text-[11px] font-black flex items-center justify-center shadow-sm">
                        {cartMatch.quantity}
                      </span>
                    )}

                    <div className="w-full h-28 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden mb-2">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ProductGraphic product={p} className="w-14 h-14" />
                      )}
                    </div>

                    <h4 className="text-xs font-extrabold text-slate-900 line-clamp-2 leading-snug">
                      {p.name}
                    </h4>
                    <p
                      className={`text-[11px] font-bold mt-0.5 tabular-nums ${
                        cartMatch ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      Rs. {Number(p.price || 0).toFixed(0)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Compact Utility Action Strip (Hold Bill, Held Bills, Delete One, Clear Cart, Bills) */}
        <div className="px-3 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={onHoldBill}
            disabled={cart.length === 0}
            className="px-3 py-1.5 min-h-[36px] rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Hold Bill</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInternalHeldBillsOpen(true)}
            className="px-3 py-1.5 min-h-[36px] rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-orange-600" />
            <span>Held ({heldBills.length})</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteLastCartItem}
            disabled={cart.length === 0}
            className="px-3 py-1.5 min-h-[36px] rounded-xl bg-white hover:bg-red-50 border border-slate-200 text-slate-700 hover:text-red-700 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-40"
          >
            <Minus className="w-3.5 h-3.5 text-red-500" />
            <span>Delete One</span>
          </button>

          {showConfirmClearCart ? (
            <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-xl border border-red-200 shrink-0 min-h-[36px]">
              <button
                type="button"
                onClick={() => {
                  onClearCart();
                  setShowConfirmClearCart(false);
                }}
                className="px-2 py-0.5 text-[10px] font-black bg-red-600 text-white rounded-lg cursor-pointer"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmClearCart(false)}
                className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => cart.length > 0 && setShowConfirmClearCart(true)}
              disabled={cart.length === 0}
              className="px-3 py-1.5 min-h-[36px] rounded-xl bg-white hover:bg-red-50 border border-slate-200 text-red-600 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Cart</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMobileBillsModalOpen(true)}
            className="px-3 py-1.5 min-h-[36px] rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-blue-700 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Bills ({transactions.length})</span>
          </button>
        </div>

        {/* 6. Floating Summary Card: TOTAL QTY / Rs. / Checkout */}
        <div className="mx-3 mb-4 bg-white rounded-2xl border border-slate-200/90 shadow-lg px-4 py-3 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => (onOpenCartDrawer ? onOpenCartDrawer() : null)}
            className="text-left cursor-pointer"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
              TOTAL QTY: {totalQty}
            </span>
            <span className="text-xl font-black text-slate-900 tabular-nums leading-tight block mt-0.5">
              Rs. {grandTotal.toFixed(0)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (cart.length === 0) return;
              onOpenCheckout(selectedPaymentMethod);
            }}
            disabled={cart.length === 0}
            className={`px-7 py-3 min-h-[44px] rounded-xl font-black text-sm transition-all shadow-sm ${
              cart.length > 0
                ? 'bg-[#16a34a] hover:bg-green-700 text-white active:scale-95 cursor-pointer'
                : 'bg-[#16a34a]/75 text-white cursor-not-allowed'
            }`}
          >
            Checkout
          </button>
        </div>

        {/* 7. Bottom Navigation Bar (HOME | LEDGERS | Raised Green POS Button | PRODUCTS | SETTINGS) */}
        <nav className="bg-white border-t border-slate-200 h-16 px-2 flex items-center justify-around relative shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={() => {
              if (cart.length > 0) {
                setShowConfirmLeave(true);
              } else {
                onNavigate('Home');
              }
            }}
            className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <LayoutGrid className="w-5 h-5 stroke-[1.9]" />
            <span className="text-[10px] font-bold uppercase mt-1 tracking-wide">HOME</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('Customer Ledgers')}
            className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <Users className="w-5 h-5 stroke-[1.9]" />
            <span className="text-[10px] font-bold uppercase mt-1 tracking-wide">LEDGERS</span>
          </button>

          {/* Center Raised Green POS Button */}
          <button
            type="button"
            onClick={() => (onOpenCartDrawer ? onOpenCartDrawer() : onOpenCheckout(selectedPaymentMethod))}
            className="flex flex-col items-center justify-end min-w-[64px] pb-1 cursor-pointer relative"
            aria-label="Open Cart Drawer"
          >
            <div className="w-14 h-14 -mt-7 rounded-full bg-[#16a34a] hover:bg-green-700 text-white flex items-center justify-center shadow-lg border-4 border-white relative transition-transform active:scale-95">
              <ShoppingCart className="w-6 h-6 stroke-[2.2]" />
              {totalQty > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
                  {totalQty}
                </span>
              )}
            </div>
            <span className="text-[10px] font-black uppercase mt-0.5 tracking-wide text-blue-600">
              POS
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('Total Stock')}
            className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <Package className="w-5 h-5 stroke-[1.9]" />
            <span className="text-[10px] font-bold uppercase mt-1 tracking-wide">PRODUCTS</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <Settings className="w-5 h-5 stroke-[1.9]" />
            <span className="text-[10px] font-bold uppercase mt-1 tracking-wide">SETTINGS</span>
          </button>
        </nav>
      </div>

      {/* =========================================================================
          MODAL: MOBILE SAVED BILLS / INVOICE SEARCH, EDIT, PRINT & DELETE
         ========================================================================= */}
      {isMobileBillsModalOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-100 flex flex-col">
          <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Saved Invoices ({mobileFilteredTransactions.length})</h3>
                <p className="text-[11px] text-emerald-700 font-bold">Total: {formatRs(mobileTotalSalesAmount)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedMobileTx(null);
                setIsMobileBillsModalOpen(false);
              }}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {selectedMobileTx ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedMobileTx(null)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Invoices</span>
                </button>
                <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                  #{selectedMobileTx.invoiceNumber}
                </span>
              </div>

              {mobileShareNotice && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold text-center">
                  {mobileShareNotice}
                </div>
              )}

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-sm text-slate-900">
                      {selectedMobileTx.customerName || 'Walk-in Customer'}
                    </h4>
                    <p className="text-[11px] text-slate-500">{selectedMobileTx.dateTime}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                    {selectedMobileTx.paymentMethod}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 pt-2 border-t border-slate-100">
                  {selectedMobileTx.items.map((it, idx) => (
                    <div key={it.id || idx} className="py-2 flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-900 truncate">{it.product.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {it.quantity} × {formatRs(it.unitPrice)}
                        </p>
                      </div>
                      <span className="font-mono font-black text-slate-900 shrink-0">
                        {formatRs(it.lineTotal || it.quantity * it.unitPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
                  {selectedMobileTx.discount > 0 && (
                    <div className="flex justify-between text-amber-700 font-bold">
                      <span>Discount:</span>
                      <span>-{formatRs(selectedMobileTx.discount)}</span>
                    </div>
                  )}
                  {selectedMobileTx.taxAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax:</span>
                      <span>{formatRs(selectedMobileTx.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-emerald-700">{formatRs(selectedMobileTx.grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onViewReceipt && onViewReceipt(selectedMobileTx)}
                  className="py-3 px-3 min-h-[44px] rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onEditTransaction) {
                      onEditTransaction(selectedMobileTx);
                      setSelectedMobileTx(null);
                      setIsMobileBillsModalOpen(false);
                    }
                  }}
                  className="py-3 px-3 min-h-[44px] rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const summary = `WAQAS MART\nInvoice: #${selectedMobileTx.invoiceNumber}\nDate: ${selectedMobileTx.dateTime}\nCustomer: ${selectedMobileTx.customerName || 'Walk-in'}\nTotal: Rs. ${selectedMobileTx.grandTotal}\nPayment: ${selectedMobileTx.paymentMethod}`;
                    try {
                      if (navigator.share) {
                        await navigator.share({ title: `Invoice #${selectedMobileTx.invoiceNumber}`, text: summary });
                      } else if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(summary);
                        setMobileShareNotice('Invoice details copied!');
                        setTimeout(() => setMobileShareNotice(null), 2500);
                      }
                    } catch {}
                  }}
                  className="py-3 px-3 min-h-[44px] rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
                {confirmingDeleteInvoiceNo === selectedMobileTx.invoiceNumber ? (
                  <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-200">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteTransaction?.(selectedMobileTx.invoiceNumber);
                        setConfirmingDeleteInvoiceNo(null);
                        setSelectedMobileTx(null);
                      }}
                      className="flex-1 py-2 bg-red-600 text-white text-xs font-black rounded-lg cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteInvoiceNo(null)}
                      className="px-2 py-2 bg-white text-slate-600 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDeleteInvoiceNo(selectedMobileTx.invoiceNumber)}
                    className="py-3 px-3 min-h-[44px] rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={mobileSearch}
                  onChange={(e) => setMobileSearch(e.target.value)}
                  placeholder="Search Invoice #, Customer, or Product..."
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {mobileSearch && (
                  <button
                    type="button"
                    onClick={() => setMobileSearch('')}
                    className="absolute right-2.5 top-2.5 p-1 text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {(['All', 'Today', 'Yesterday', 'This Week', 'This Month', 'Custom'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setMobileDateFilter(filter)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 cursor-pointer ${
                      mobileDateFilter === filter
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {mobileDateFilter === 'Custom' && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2 text-xs">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={mobileCustomDate}
                    onChange={(e) => setMobileCustomDate(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-700 outline-none"
                  />
                </div>
              )}

              {mobileFilteredTransactions.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-bold text-sm text-slate-700">No Invoices Found</p>
                </div>
              ) : (
                <div className="space-y-2 pb-6">
                  {mobileFilteredTransactions.map((tx) => (
                    <div
                      key={tx.invoiceNumber}
                      onClick={() => setSelectedMobileTx(tx)}
                      className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          #{tx.invoiceNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">{tx.dateTime}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 truncate max-w-[180px]">
                          {tx.customerName || 'Walk-in Customer'}
                        </span>
                        <span className="font-black text-slate-900 font-mono">{formatRs(tx.grandTotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: DEDICATED OLD SALE HELD BILLS LIST (REOPEN & DELETE CONFIRMATION)
         ========================================================================= */}
      {isInternalHeldBillsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Pause className="w-4 h-4 fill-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    ہولڈ شدہ بلز (Held Bills)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Total {heldBills.length} {heldBills.length === 1 ? 'bill on hold' : 'bills on hold'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsInternalHeldBillsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {heldBills.length === 0 ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                <Pause className="w-12 h-12 text-slate-300 mb-3" />
                <p className="font-bold text-sm text-slate-700">کوئی ہولڈ بل موجود نہیں ہے</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  کارٹ میں اشیاء شامل کرنے کے بعد "Hold Bill" کا بٹن دبائیں تاکہ بل کو عارضی طور پر روکا جا سکے۔
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto divide-y divide-slate-100 flex-1 pr-1 space-y-2">
                {heldBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="p-3 bg-slate-50 hover:bg-orange-50/50 rounded-2xl border border-slate-200/80 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-slate-900">
                            {bill.holdNumber || bill.id}
                          </span>
                          <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            HELD
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{bill.createdAt}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">
                            {bill.customerName || 'Walk-in Customer'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-black text-slate-900">
                          Rs. {bill.grandTotal.toFixed(0)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                    </div>

                    {/* Items preview pills */}
                    <div className="flex flex-wrap gap-1 text-[10px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                      {bill.items.map((it, idx) => (
                        <span key={idx} className="bg-slate-50 px-1.5 py-0.5 rounded font-medium">
                          {it.product.name} × {it.quantity}
                        </span>
                      ))}
                    </div>

                    {/* Action buttons: Resume / Reopen & In-UI Delete Confirmation */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60">
                      {confirmingDeleteBillId === bill.id ? (
                        <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-xl border border-red-200">
                          <span className="text-[11px] font-bold text-red-700">Delete this bill?</span>
                          <button
                            type="button"
                            onClick={() => handleConfirmDeleteBill(bill.id)}
                            className="px-2.5 py-1 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-2xs cursor-pointer"
                          >
                            Yes, Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteBillId(null)}
                            className="px-2 py-1 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteBillId(bill.id)}
                          className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-1 border border-red-200 cursor-pointer"
                          title="Delete this held bill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete (ختم کریں)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleResumeBillInternal(bill)}
                        className="px-4 py-1.5 text-xs font-black bg-[#16a34a] hover:bg-green-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Reopen / Resume Bill (کھولیں)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInternalHeldBillsOpen(false)}
                className="px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close (بند کریں)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: QUICK ADD CUSTOMER
         ========================================================================= */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  نیا کسٹمر شامل کریں (Add Customer)
                </h3>
              </div>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Muhammad Ali"
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Opening Balance (Rs.)
                </label>
                <input
                  type="number"
                  step="any"
                  value={newCustBalance}
                  onChange={(e) => setNewCustBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#16a34a] hover:bg-green-700 text-white rounded-xl shadow-sm"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
