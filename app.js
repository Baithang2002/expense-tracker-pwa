/**
 * FINANCE MANAGER - PRO EDITION CORE ENGINE
 * Complete Framework Restructuring featuring Reactive Proxies & Atomic Render Pipes
 */

const STORAGE_KEY = "finance-manager-v2-state";
const DB_NAME = "FinanceManagerDB_Pro";
const DB_VERSION = 2;
const STORE_NAME = "operationalStateStore";

const CURRENCY_FORMATS = {
  INR: { locale: "en-IN", currency: "INR" },
  USD: { locale: "en-US", currency: "USD" },
  EUR: { locale: "en-IE", currency: "EUR" },
  GBP: { locale: "en-GB", currency: "GBP" },
  JPY: { locale: "ja-JP", currency: "JPY" },
  AUD: { locale: "en-AU", currency: "AUD" },
};

// Isolated Application Elements Selection Map
const elements = {
  views: document.querySelectorAll(".view"),
  navButtons: document.querySelectorAll(".system-navigation-hub [data-nav]"),
  searchToggle: document.querySelector("#searchToggle"),
  searchPanel: document.querySelector("#searchPanel"),
  globalSearch: document.querySelector("#globalSearch"),
  installButton: document.querySelector("#installButton"),
  currentBalance: document.querySelector("#currentBalance"),
  totalIncome: document.querySelector("#totalIncome"),
  totalExpenses: document.querySelector("#totalExpenses"),
  activeBudgetSelect: document.querySelector("#activeBudgetSelect"),
  budgetOverview: document.querySelector("#budgetOverview"),
  recentTransactions: document.querySelector("#recentTransactions"),
  typeTabs: document.querySelector("#typeTabs"),
  quickFilter: document.querySelector("#quickFilter"),
  fromDate: document.querySelector("#fromDate"),
  toDate: document.querySelector("#toDate"),
  categoryFilter: document.querySelector("#categoryFilter"),
  budgetFilter: document.querySelector("#budgetFilter"),
  clearFilters: document.querySelector("#clearFilters"),
  filteredCount: document.querySelector("#filteredCount"),
  transactionList: document.querySelector("#transactionList"),
  analyticsBudgetSelect: document.querySelector("#analyticsBudgetSelect"),
  analyticsIncome: document.querySelector("#analyticsIncome"),
  analyticsExpense: document.querySelector("#analyticsExpense"),
  analyticsNet: document.querySelector("#analyticsNet"),
  expenseChart: document.querySelector("#expenseChart"),
  chartHint: document.querySelector("#chartHint"),
  categoryBreakdown: document.querySelector("#categoryBreakdown"),
  monthlyBars: document.querySelector("#monthlyBars"),
  budgetCards: document.querySelector("#budgetCards"),
  categoryCards: document.querySelector("#categoryCards"),
  openCategoryButton: document.querySelector("#openCategoryButton"),
  backupButton: document.querySelector("#backupButton"),
  restoreInput: document.querySelector("#restoreInput"),
  resetBudgetButton: document.querySelector("#resetBudgetButton"),
  themeSelect: document.querySelector("#themeSelect"),
  currencySelect: document.querySelector("#currencySelect"),
  storageUsage: document.querySelector("#storageUsage"),
  resetAllDataButton: document.querySelector("#resetAllDataButton"),
  transactionDialog: document.querySelector("#transactionDialog"),
  transactionForm: document.querySelector("#transactionForm"),
  transactionDialogTitle: document.querySelector("#transactionDialogTitle"),
  transactionId: document.querySelector("#transactionId"),
  transactionType: document.querySelector("#transactionType"),
  transactionAmount: document.querySelector("#transactionAmount"),
  transactionDescription: document.querySelector("#transactionDescription"),
  transactionDateTime: document.querySelector("#transactionDateTime"),
  transactionBudget: document.querySelector("#transactionBudget"),
  transactionCategory: document.querySelector("#transactionCategory"),
  transactionNotes: document.querySelector("#transactionNotes"),
  transactionReceipt: document.querySelector("#transactionReceipt"),
  saveTransactionButton: document.querySelector("#saveTransactionButton"),
  budgetDialog: document.querySelector("#budgetDialog"),
  budgetDialogTitle: document.querySelector("#budgetDialogTitle"),
  budgetId: document.querySelector("#budgetId"),
  budgetName: document.querySelector("#budgetName"),
  budgetLimit: document.querySelector("#budgetLimit"),
  saveBudgetButton: document.querySelector("#saveBudgetButton"),
  categoryDialog: document.querySelector("#categoryDialog"),
  categoryDialogTitle: document.querySelector("#categoryDialogTitle"),
  categoryId: document.querySelector("#categoryId"),
  categoryName: document.querySelector("#categoryName"),
  categoryType: document.querySelector("#categoryType"),
  categoryIcon: document.querySelector("#categoryIcon"),
  categoryColor: document.querySelector("#categoryColor"),
  saveCategoryButton: document.querySelector("#saveCategoryButton"),
  categoryForm: document.querySelector("#categoryForm"),
  receiptDialog: document.querySelector("#receiptDialog"),
  receiptImage: document.querySelector("#receiptImage"),
  toast: document.querySelector("#toast"),
  loading: document.querySelector("#loading"),
  dropzonePrompt: document.querySelector(".dropzone-prompt"),
};

// Global Execution Variables
let state = null;
let activeView = "home";
let analyticsBudgetId = "all";
let deferredInstallPrompt = null;

let filters = {
  type: "all",
  quick: "all",
  from: "",
  to: "",
  categoryId: "all",
  budgetIds: [],
  search: "",
};

// ── HIGH END ARCHITECTURE: REACTIVE STATE PROXIES ──────────────────
function makeReactive(targetObject, propagationCallback) {
  const handler = {
    get(target, property, receiver) {
      if (typeof target[property] === "object" && target[property] !== null) {
        return makeReactive(target[property], propagationCallback);
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      const isSuccess = Reflect.set(target, property, value, receiver);
      if (isSuccess) {
        propagationCallback();
      }
      return isSuccess;
    }
  };
  return new Proxy(targetObject, handler);
}

// ── TELEMETRY & TACTILE DATA ENGINES ────────────────────────────────
function triggerTactileFeedback() {
  if ("vibrate" in navigator) {
    navigator.vibrate(14); // Precise high-end device micro haptic
  }
}

function getCurrencyFormatter() {
  const currentCode = state?.preferredCurrency || "INR";
  const configuration = CURRENCY_FORMATS[currentCode] || CURRENCY_FORMATS.INR;
  return new Intl.NumberFormat(configuration.locale, {
    style: "currency",
    currency: configuration.currency,
    maximumFractionDigits: 2,
  });
}

function formatCurrencyValue(amount) {
  return getCurrencyFormatter().format(amount);
}

function roundMoney(amount) {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

function parseAmount(value) {
  return Number(String(value).replace(/[₹$,€£¥\s]/g, ""));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function computeSum(valuesArray) {
  return Math.round((valuesArray.reduce((acc, curr) => acc + curr, 0) + Number.EPSILON) * 100) / 100;
}

function exportAmount(amount) {
  const code = state?.preferredCurrency || "INR";
  const cfg = CURRENCY_FORMATS[code] || CURRENCY_FORMATS.INR;
  return `${code} ${roundMoney(amount).toLocaleString(cfg.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function createUUID(prefix) {
  const generatedId = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${generatedId}`;
}

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function escapeOutputHtml(string) {
  return String(string).replace(/[&<>"']/g, match => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[match]));
}

// ── INDEXEDDB PERSISTENT DRIVER LAYERS ──────────────────────────────
function accessDB() {
  return new Promise((resolve, reject) => {
    const databaseRequest = indexedDB.open(DB_NAME, DB_VERSION);
    databaseRequest.onupgradeneeded = event => {
      const instance = event.target.result;
      if (!instance.objectStoreNames.contains(STORE_NAME)) {
        instance.createObjectStore(STORE_NAME);
      }
    };
    databaseRequest.onsuccess = event => resolve(event.target.result);
    databaseRequest.onerror = event => reject(event.target.error);
  });
}

function retrievePersistedState() {
  return accessDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const query = store.get("applicationState");
      query.onsuccess = () => resolve(query.result);
      query.onerror = () => reject(query.error);
    });
  });
}

function commitStateToStorage(stateData) {
  return accessDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const query = store.put(JSON.parse(JSON.stringify(stateData)), "applicationState");
      query.onsuccess = () => resolve();
      query.onerror = () => reject(query.error);
    });
  });
}

// ── BACKWARD-COMPATIBLE MIGRATION PIPELINE ─────────────────────────
async function executeMigrationSequence() {
  // 1. Check legacy IndexedDB (v1)
  try {
    const legacyDb = await new Promise((resolve) => {
      const req = indexedDB.open("FinanceManagerDB", 1);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    });
    if (legacyDb) {
      if (legacyDb.objectStoreNames.contains("stateStore")) {
        const legacyData = await new Promise((resolve) => {
          const tx = legacyDb.transaction("stateStore", "readonly");
          const store = tx.objectStore("stateStore");
          const query = store.get("appState");
          query.onsuccess = () => resolve(query.result);
          query.onerror = () => resolve(null);
        });
        if (legacyData) {
          await commitStateToStorage(legacyData);
          legacyDb.close();
          indexedDB.deleteDatabase("FinanceManagerDB");
          console.log("IndexedDB (v1) successfully migrated to Pro Edition!");
          return;
        }
      }
      legacyDb.close();
    }
  } catch (e) {
    console.warn("Legacy DB migration bypassed:", e);
  }

  // 2. Check legacy localStorage keys
  try {
    const legacyLocal = localStorage.getItem("finance-manager-v1") || localStorage.getItem("expense-tracker-state-v1");
    if (legacyLocal) {
      const parsed = JSON.parse(legacyLocal);
      if (parsed && (parsed.transactions || parsed.expenses)) {
        const normalized = normalizeIncomingState(parsed);
        await commitStateToStorage(normalized);
        localStorage.removeItem("finance-manager-v1");
        console.log("LocalStorage successfully migrated to Pro Edition!");
      }
    }
  } catch (e) {
    console.warn("Legacy LocalStorage migration bypassed:", e);
  }
}

// ── STATE NORMALIZATION PIPE ───────────────────────────────────────
function normalizeIncomingState(rawInput) {
  const fallbackBudgets = [
    { id: "personal", name: "Personal Spending", limit: 0, archived: false },
    { id: "family", name: "Savings Target", limit: 0, archived: false }
  ];
  const fallbackCategories = [
    { id: "food", name: "Food & Dining", type: "expense", icon: "🍽", color: "#e66a3f" },
    { id: "shopping", name: "Shopping", type: "expense", icon: "🛍", color: "#8b5cf6" },
    { id: "bills", name: "Bills & Utilities", type: "expense", icon: "⚡", color: "#f59e0b" },
    { id: "salary", name: "Salary Income", type: "income", icon: "💼", color: "#10b981" },
    { id: "others", name: "Others", type: "both", icon: "📦", color: "#6b7280" }
  ];

  const budgets = Array.isArray(rawInput?.budgets) && rawInput.budgets.length ? rawInput.budgets : fallbackBudgets;
  const categories = Array.isArray(rawInput?.categories) && rawInput.categories.length ? rawInput.categories : fallbackCategories;

  return {
    activeBudgetId: budgets[0].id,
    preferredCurrency: rawInput?.preferredCurrency || "INR",
    themePreference: rawInput?.themePreference || "system",
    budgets: budgets.map(b => ({
      id: b.id || createUUID("b"),
      name: b.name || "Budget Group",
      limit: Number(b.limit) || 0,
      archived: !!b.archived
    })),
    categories: categories.map(c => ({
      id: c.id || createUUID("c"),
      name: c.name || "Category",
      type: c.type || "both",
      icon: c.icon || "📦",
      color: c.color || "#059669"
    })),
    transactions: Array.isArray(rawInput?.transactions) ? rawInput.transactions.map(t => ({
      id: t.id || createUUID("tx"),
      type: t.type === "income" ? "income" : "expense",
      amount: Number(t.amount) || 0,
      description: t.description || "Imported Transaction",
      dateTime: t.dateTime || nowLocalInput(),
      categoryId: t.categoryId || "others",
      budgetId: t.budgetId || budgets[0].id,
      notes: t.notes || "",
      receiptData: t.receiptData || ""
    })) : []
  };
}

// ── CLIENT-SIDE RECEIPT PHOTO COMPRESSION ─────────────────────────
function readReceipt(file) {
  if (file.type && !file.type.startsWith("image/")) {
    return Promise.reject(new Error("File is not an image."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const compressedData = canvas.toDataURL("image/jpeg", 0.7);
        resolve({ receiptName: file.name, receiptData: compressedData });
      };
      img.onerror = () => reject(new Error("Failed to load image for compression."));
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

// ── DATA TRANSFORMATIONS & FINANCIAL PIPES ────────────────────────────
function aggregateBudgetData(budgetId) {
  const filteredLogs = state.transactions.filter(t => t.budgetId === budgetId);
  const incomeTotal = computeSum(filteredLogs.filter(t => t.type === "income").map(t => t.amount));
  const expenseTotal = computeSum(filteredLogs.filter(t => t.type === "expense").map(t => t.amount));
  const structuralLimit = state.budgets.find(b => b.id === budgetId)?.limit || 0;
  return {
    income: incomeTotal,
    expenses: expenseTotal,
    balance: Math.round((structuralLimit + incomeTotal - expenseTotal) * 100) / 100,
    limit: structuralLimit
  };
}

function aggregateGlobalFinancials() {
  const targetedLogs = state.transactions;
  const totalIncome = computeSum(targetedLogs.filter(t => t.type === "income").map(t => t.amount));
  const totalExpenses = computeSum(targetedLogs.filter(t => t.type === "expense").map(t => t.amount));
  const aggregatedLimits = computeSum(state.budgets.filter(b => !b.archived).map(b => b.limit));
  return {
    income: totalIncome,
    expenses: totalExpenses,
    balance: Math.round((aggregatedLimits + totalIncome - totalExpenses) * 100) / 100
  };
}

function getFilteredTransactions() {
  let initialPool = [...state.transactions];
  if (filters.type !== "all") initialPool = initialPool.filter(t => t.type === filters.type);
  if (filters.categoryId !== "all") initialPool = initialPool.filter(t => t.categoryId === filters.categoryId);
  if (filters.budgetIds.length) initialPool = initialPool.filter(t => filters.budgetIds.includes(t.budgetId));
  
  const now = new Date();
  if (filters.quick !== "all") {
    let start;
    if (filters.quick === "year") {
      start = new Date(now.getFullYear(), 0, 1);
    } else {
      start = new Date(now);
      start.setDate(start.getDate() - Number(filters.quick));
    }
    initialPool = initialPool.filter((t) => new Date(t.dateTime) >= start);
  }
  if (filters.from) initialPool = initialPool.filter((t) => new Date(t.dateTime) >= new Date(filters.from));
  if (filters.to) initialPool = initialPool.filter((t) => new Date(t.dateTime) <= new Date(filters.to));

  if (filters.search.trim()) {
    const matchQuery = filters.search.trim().toLowerCase();
    initialPool = initialPool.filter(t => {
      const cat = state.categories.find(c => c.id === t.categoryId) || {};
      const bud = state.budgets.find(b => b.id === t.budgetId) || {};
      return t.description.toLowerCase().includes(matchQuery) || 
             t.notes.toLowerCase().includes(matchQuery) ||
             cat.name.toLowerCase().includes(matchQuery) ||
             (bud.name && bud.name.toLowerCase().includes(matchQuery)) ||
             String(t.amount).includes(matchQuery);
    });
  }
  return initialPool.sort((alpha, beta) => new Date(beta.dateTime) - new Date(alpha.dateTime));
}

// ── ATOMIC HIGH PERFORMANCE ATOMIC DOM DRAWING WORKSPACES ──────────────
function executeRenderSequence() {
  renderFormSelectors();
  renderDashboardViewport();
  renderLedgerTimelineViewport();
  renderAnalyticsDistributionEngine();
  renderMonthlyBarChart();
  renderBudgetsViewport();
  renderControlSettingsTaxonomy();
  updateStorageTelemetryMetrics();
}

function renderFormSelectors() {
  const configurationsOptionsHTML = state.budgets.map(b => `<option value="${b.id}">${escapeOutputHtml(b.name)}</option>`).join("");
  
  elements.activeBudgetSelect.innerHTML = configurationsOptionsHTML;
  elements.activeBudgetSelect.value = state.activeBudgetId;
  
  elements.transactionBudget.innerHTML = configurationsOptionsHTML;
  elements.transactionBudget.value = state.activeBudgetId;

  elements.budgetFilter.innerHTML = `<option value="all">All Budgets</option>` + state.budgets.map(b => `<option value="${b.id}">${escapeOutputHtml(b.name)}</option>`).join("");
  elements.budgetFilter.value = filters.budgetIds[0] || "all";
  
  elements.analyticsBudgetSelect.innerHTML = `<option value="all">All Budgets</option>` + configurationsOptionsHTML;
  elements.analyticsBudgetSelect.value = analyticsBudgetId;

  renderTransactionCategoryOptions(elements.transactionType.value || "expense");
  elements.categoryFilter.innerHTML = `<option value="all">All Categories</option>` + state.categories.map(c => `<option value="${c.id}">${c.icon} ${escapeOutputHtml(c.name)}</option>`).join("");
  elements.categoryFilter.value = filters.categoryId;

  if (elements.themeSelect) elements.themeSelect.value = state.themePreference;
  if (elements.currencySelect) elements.currencySelect.value = state.preferredCurrency;
}

function renderTransactionCategoryOptions(type) {
  elements.transactionCategory.innerHTML = state.categories
    .filter(c => c.type === "both" || c.type === type)
    .map(c => `<option value="${c.id}">${c.icon} ${escapeOutputHtml(c.name)}</option>`)
    .join("");
}

function renderDashboardViewport() {
  const dynamicGlobalMetrics = aggregateGlobalFinancials();
  elements.currentBalance.textContent = formatCurrencyValue(dynamicGlobalMetrics.balance);
  elements.totalIncome.textContent = formatCurrencyValue(dynamicGlobalMetrics.income);
  elements.totalExpenses.textContent = formatCurrencyValue(dynamicGlobalMetrics.expenses);

  // Show only the selected budget
  const targetedBudget = state.budgets.find(b => b.id === state.activeBudgetId);
  if (targetedBudget) {
    const allocationData = aggregateBudgetData(targetedBudget.id);
    const calculatedPercentage = parseFloat(allocationData.limit) > 0 ? Math.min(100, (allocationData.expenses / allocationData.limit) * 100) : 0;
    
    elements.budgetOverview.innerHTML = `
      <div class="budget-card-premium animate-slide-up">
        <div class="budget-card-meta">
          <h3>${escapeOutputHtml(targetedBudget.name)}</h3>
          <strong class="amount">${formatCurrencyValue(allocationData.balance)} left</strong>
        </div>
        <div class="bar-track">
          <span style="width: ${calculatedPercentage}%; background-color: ${calculatedPercentage > 90 ? 'var(--expense)' : 'var(--primary)'}"></span>
        </div>
        <div class="budget-card-footer-telemetry">
          <span>Limit: ${formatCurrencyValue(allocationData.limit)}</span>
          <span>Spent: ${formatCurrencyValue(allocationData.expenses)}</span>
        </div>
      </div>
    `;
  } else {
    elements.budgetOverview.innerHTML = `<p class="muted" style="text-align:center;">No active budget selected.</p>`;
  }
}

function renderLedgerTimelineViewport() {
  const transactionDataset = getFilteredTransactions();
  elements.filteredCount.textContent = `${transactionDataset.length} transactions`;
  
  const documentMemoryFragment = document.createDocumentFragment();
  elements.transactionList.innerHTML = "";

  if (transactionDataset.length === 0) {
    elements.transactionList.innerHTML = `<p class="muted" style="padding:24px 0; text-align:center;">No transactions match your filters.</p>`;
    return;
  }

  transactionDataset.forEach(tx => {
    const containerAllocationNode = document.createElement("div");
    const targetCategoryNode = state.categories.find(c => c.id === tx.categoryId) || { icon: "📦", name: "General", color: "#6b7280" };
    const signOperator = tx.type === "income" ? "+" : "−";
    const localizedClassStream = tx.type === "income" ? "income-text" : "expense-text";
    
    const receiptBadge = tx.receiptData ? `<span class="badge" style="cursor:pointer; background-color:var(--primary-soft); color:var(--primary);" data-view-receipt="${tx.id}">📎 Proof Attached</span>` : "";

    containerAllocationNode.className = "transaction-card";
    containerAllocationNode.innerHTML = `
      <div class="category-icon" style="background-color: ${targetCategoryNode.color}">${targetCategoryNode.icon}</div>
      <div class="transaction-main">
        <h3>${escapeOutputHtml(tx.description)}</h3>
        <div class="transaction-meta">
          <span class="badge">${escapeOutputHtml(targetCategoryNode.name)}</span>
          ${receiptBadge}
        </div>
        <p class="caption-muted" style="margin-top:4px;">${formatDateTime(tx.dateTime)}${tx.notes ? ` · ${escapeOutputHtml(tx.notes)}` : ""}</p>
      </div>
      <div class="transaction-end-alignment" style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
        <strong class="amount ${localizedClassStream}">${signOperator}${formatCurrencyValue(tx.amount)}</strong>
        <div class="transaction-actions">
          <button type="button" class="btn-secondary-sm edit-trigger" data-id="${tx.id}">Edit</button>
          <button type="button" class="btn-secondary-sm btn-text-danger delete-trigger" data-id="${tx.id}">Delete</button>
        </div>
      </div>
    `;

    containerAllocationNode.querySelector(".edit-trigger").addEventListener("click", () => triggerModificationModal(tx.id));
    containerAllocationNode.querySelector(".delete-trigger").addEventListener("click", () => executeLogPurgeSequence(tx.id));
    
    if (tx.receiptData) {
      containerAllocationNode.querySelector(`[data-view-receipt="${tx.id}"]`).addEventListener("click", (e) => {
        e.stopPropagation();
        triggerTactileFeedback();
        elements.receiptImage.src = tx.receiptData;
        elements.receiptDialog.showModal();
      });
    }

    documentMemoryFragment.appendChild(containerAllocationNode);
  });

  elements.transactionList.appendChild(documentMemoryFragment);
}

function renderAnalyticsDistributionEngine() {
  const activeCanvas = elements.expenseChart;
  if (!activeCanvas) return;
  
  const ctx = activeCanvas.getContext("2d");
  const dimensionsWidth = activeCanvas.width;
  const dimensionsHeight = activeCanvas.height;
  const centerAxisX = dimensionsWidth / 2;
  const centerAxisY = dimensionsHeight / 2;
  const dynamicRadius = dimensionsWidth * 0.35;
  const LINE_W = 28;

  ctx.clearRect(0, 0, dimensionsWidth, dimensionsHeight);

  const targetedTxs = analyticsBudgetId === "all"
    ? state.transactions
    : state.transactions.filter(t => t.budgetId === analyticsBudgetId);

  const targetedExpenses = targetedTxs.filter(t => t.type === "expense");
  const computingMetricsMatrix = state.categories.map(cat => ({
    ...cat,
    volume: computeSum(targetedExpenses.filter(t => t.categoryId === cat.id).map(t => t.amount))
  })).filter(c => c.volume > 0);

  const totalExpenseVolume = computeSum(computingMetricsMatrix.map(c => c.volume));
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  // Center metrics aggregation cards
  const incomeTotal = computeSum(targetedTxs.filter(t => t.type === "income").map(t => t.amount));
  elements.analyticsIncome.textContent = formatCurrencyValue(incomeTotal);
  elements.analyticsExpense.textContent = formatCurrencyValue(totalExpenseVolume);
  elements.analyticsNet.textContent = formatCurrencyValue(incomeTotal - totalExpenseVolume);
  elements.analyticsNet.className = (incomeTotal - totalExpenseVolume >= 0) ? "income-text" : "expense-text";

  if (totalExpenseVolume === 0) {
    ctx.lineWidth = LINE_W;
    ctx.strokeStyle = isDark ? "#1e2e2b" : "#e2e8f0";
    ctx.beginPath();
    ctx.arc(centerAxisX, centerAxisY, dynamicRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = isDark ? "#9ca3af" : "#64748b";
    ctx.font = "700 1rem var(--font-sans)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("No Expenses Yet", centerAxisX, centerAxisY);

    elements.categoryBreakdown.innerHTML = `<p class="muted" style="text-align:center; padding:12px 0;">Add expenses to see category breakdown.</p>`;
    return;
  }

  // Draw segments
  let processingRadialStartAngle = -Math.PI / 2;
  const GAP = computingMetricsMatrix.length > 1 ? 0.015 : 0;
  
  computingMetricsMatrix.forEach(slice => {
    const computedSliceAngle = (slice.volume / totalExpenseVolume) * Math.PI * 2;
    ctx.lineWidth = LINE_W;
    ctx.lineCap = "round";
    ctx.strokeStyle = slice.color;
    
    ctx.beginPath();
    ctx.arc(centerAxisX, centerAxisY, dynamicRadius, processingRadialStartAngle, processingRadialStartAngle + computedSliceAngle - GAP);
    ctx.stroke();
    
    slice.start = processingRadialStartAngle;
    slice.end = processingRadialStartAngle + computedSliceAngle - GAP;
    processingRadialStartAngle += computedSliceAngle;
  });

  // Inject High Fidelity Core Vector Labels Internally
  ctx.fillStyle = isDark ? "#f9fafb" : "#0f172a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 1.1rem var(--font-sans)";
  ctx.fillText(formatCurrencyValue(totalExpenseVolume), centerAxisX, centerAxisY);

  // Category Matrix Segment rows
  elements.categoryBreakdown.innerHTML = computingMetricsMatrix.map(c => {
    const percent = (c.volume / totalExpenseVolume) * 100;
    return `
      <div class="breakdown-row">
        <div class="breakdown-line" style="display:flex; justify-content:space-between; font-size:0.88rem;">
          <span><span class="badge" style="background-color:${c.color}; color:#fff; border:none; padding:2px 6px;">${c.icon}</span> ${escapeOutputHtml(c.name)}</span>
          <strong>${percent.toFixed(1)}% (${formatCurrencyValue(c.volume)})</strong>
        </div>
        <div class="bar-track"><span style="width: ${percent}%; background-color: ${c.color}"></span></div>
      </div>
    `;
  }).join("");

  // Segment tap interaction
  activeCanvas.onclick = (e) => {
    const rect = activeCanvas.getBoundingClientRect();
    const scaleX = dimensionsWidth / rect.width;
    const scaleY = dimensionsHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX - centerAxisX;
    const y = (e.clientY - rect.top) * scaleY - centerAxisY;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < dynamicRadius - LINE_W / 2 || dist > dynamicRadius + LINE_W / 2) return;
    let angle = Math.atan2(y, x);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;
    const hit = computingMetricsMatrix.find(c => angle >= c.start && angle <= c.end);
    if (hit) elements.chartHint.textContent = `${hit.name}: ${formatCurrencyValue(hit.volume)}`;
  };
}

function renderMonthlyBarChart() {
  const monthsMap = new Map();
  state.transactions.forEach(t => {
    const d = new Date(t.dateTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthsMap.has(key)) monthsMap.set(key, { income: 0, expense: 0 });
    monthsMap.get(key)[t.type] += t.amount;
  });

  const sortedRows = [...monthsMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6);

  const maxVal = Math.max(1, ...sortedRows.map(([, v]) => Math.max(v.income, v.expense)));

  elements.monthlyBars.innerHTML = sortedRows.length
    ? sortedRows.map(([month, v]) => `
      <div class="bar-row">
        <div class="bar-line" style="display:flex; justify-content:space-between; font-size:0.88rem; font-weight:600;">
          <strong>${month}</strong>
          <span class="muted">Inflow: ${formatCurrencyValue(v.income)} · Outflow: ${formatCurrencyValue(v.expense)}</span>
        </div>
        <div class="bar-track" style="margin-top:4px;"><span style="width: ${(v.expense / maxVal) * 100}%; background-color: var(--expense)"></span></div>
        <div class="bar-track" style="margin-top:2px;"><span style="width: ${(v.income / maxVal) * 100}%; background-color: var(--income)"></span></div>
      </div>
    `).join("")
    : `<p class="muted" style="text-align:center; padding:12px 0;">Operational sequence contains no monthly progression indexes.</p>`;
}

function renderBudgetsViewport() {
  const documentMemoryFragment = document.createDocumentFragment();
  elements.budgetCards.innerHTML = "";

  state.budgets.forEach(b => {
    const totals = aggregateBudgetData(b.id);
    const spentPercent = b.limit > 0 ? Math.min(100, (totals.expenses / b.limit) * 100) : 0;
    const card = document.createElement("article");
    const activeClass = b.id === state.activeBudgetId ? " active" : "";
    card.className = `budget-card-premium animate-slide-up${activeClass}`;
    card.style.cursor = "pointer";
    card.innerHTML = `
      <div class="budget-card-meta">
        <h3>${escapeOutputHtml(b.name)}</h3>
        <strong class="amount">${formatCurrencyValue(totals.balance)} left</strong>
      </div>
      <div class="bar-track">
        <span style="width: ${spentPercent}%; background-color: ${spentPercent > 90 ? 'var(--expense)' : 'var(--primary)'}"></span>
      </div>
      <div class="budget-card-footer-telemetry">
        <span>Limit: ${formatCurrencyValue(b.limit)}</span>
        <span>Spent: ${formatCurrencyValue(totals.expenses)}</span>
      </div>
      <footer style="display:flex; gap:8px; margin-top:20px; border-top:1px solid var(--line); padding-top:14px;">
        <button type="button" class="btn-secondary-sm edit-budget-trigger">Edit</button>
        <button type="button" class="btn-secondary-sm btn-text-danger delete-budget-trigger">Delete</button>
      </footer>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      triggerTactileFeedback();
      state.activeBudgetId = b.id;
      displayStatusToastNotification(`Switched to ${b.name}`);
    });

    card.querySelector(".edit-budget-trigger").addEventListener("click", (e) => {
      e.stopPropagation();
      openBudgetDialog(b.id);
    });
    card.querySelector(".delete-budget-trigger").addEventListener("click", (e) => {
      e.stopPropagation();
      executeBudgetPurgeSequence(b.id);
    });

    documentMemoryFragment.appendChild(card);
  });

  elements.budgetCards.appendChild(documentMemoryFragment);
}

function renderControlSettingsTaxonomy() {
  const layoutDocumentFragment = document.createDocumentFragment();
  elements.categoryCards.innerHTML = "";

  state.categories.forEach(categoryNode => {
    const structuralContainerNode = document.createElement("div");
    structuralContainerNode.className = "category-management-pill panel-card";
    structuralContainerNode.innerHTML = `
      <div class="category-header-node">
        <span class="category-icon" style="background-color: ${categoryNode.color}">${categoryNode.icon}</span>
        <div>
          <h4>${escapeOutputHtml(categoryNode.name)}</h4>
          <span class="caption-muted">${categoryNode.type === "both" ? "INCOME & EXPENSE" : categoryNode.type === "income" ? "INCOME ONLY" : "EXPENSE ONLY"}</span>
        </div>
      </div>
      <footer style="display:flex; gap:8px; margin-top:14px; border-top:1px solid var(--line); padding-top:10px;">
        <button type="button" class="btn-secondary-sm edit-cat-trigger">Edit</button>
        <button type="button" class="btn-secondary-sm btn-text-danger delete-cat-trigger">Delete</button>
      </footer>
    `;

    structuralContainerNode.querySelector(".edit-cat-trigger").addEventListener("click", () => openCategoryDialog(categoryNode.id));
    structuralContainerNode.querySelector(".delete-cat-trigger").addEventListener("click", () => executeCategoryPurgeSequence(categoryNode.id));

    layoutDocumentFragment.appendChild(structuralContainerNode);
  });
  elements.categoryCards.appendChild(layoutDocumentFragment);
}

// ── DATA MUTATIONS & SYSTEMS ALIGNMENT ENGINE ─────────────────────────
function openBudgetDialog(budgetId = "") {
  const budget = budgetId ? state.budgets.find(b => b.id === budgetId) : null;
  elements.budgetDialogTitle.textContent = budget ? "Edit Budget" : "Create Budget";
  elements.budgetId.value = budget?.id || "";
  elements.budgetName.value = budget?.name || "";
  elements.budgetLimit.value = budget?.limit || "";
  elements.budgetDialog.showModal();
}

function saveBudgetFromForm() {
  try {
    triggerTactileFeedback();
    const budgetId = elements.budgetId.value;
    const name = elements.budgetName.value.trim();
    const limit = parseAmount(elements.budgetLimit.value) || 0;

    if (!name) {
      displayStatusToastNotification("Please enter a valid budget name.");
      return;
    }

    if (budgetId) {
      const budget = state.budgets.find(b => b.id === budgetId);
      if (budget) {
        budget.name = name;
        budget.limit = roundMoney(limit);
      }
    } else {
      state.budgets.push({
        id: createUUID("b"),
        name: name,
        limit: roundMoney(limit),
        archived: false
      });
    }
    elements.budgetDialog.close();
    displayStatusToastNotification("Budget successfully saved.");
  } catch (e) {
    displayStatusToastNotification(e.message);
  }
}

function executeBudgetPurgeSequence(budgetId) {
  if (state.budgets.length <= 1) {
    displayStatusToastNotification("At least one budget is required.");
    return;
  }
  if (!confirm("Are you sure you want to delete this budget? All transactions mapped to it will be permanently deleted!")) return;
  triggerTactileFeedback();
  state.budgets = state.budgets.filter(b => b.id !== budgetId);
  state.transactions = state.transactions.filter(t => t.budgetId !== budgetId);
  if (state.activeBudgetId === budgetId) state.activeBudgetId = state.budgets[0].id;
  displayStatusToastNotification("Budget successfully deleted.");
}

function openCategoryDialog(catId = "") {
  const cat = catId ? state.categories.find(c => c.id === catId) : null;
  elements.categoryDialogTitle.textContent = cat ? "Edit Category" : "Create Category";
  elements.categoryId.value = cat?.id || "";
  elements.categoryName.value = cat?.name || "";
  elements.categoryType.value = cat?.type || "both";
  elements.categoryIcon.value = cat?.icon || "📦";
  elements.categoryColor.value = cat?.color || "#059669";
  elements.categoryDialog.showModal();
}

function saveCategoryFromForm() {
  try {
    triggerTactileFeedback();
    const catId = elements.categoryId.value;
    const name = elements.categoryName.value.trim();
    const type = elements.categoryType.value;
    const icon = elements.categoryIcon.value.trim() || "📦";
    const color = elements.categoryColor.value;

    if (!name) {
      displayStatusToastNotification("Please enter a valid category name.");
      return;
    }

    if (catId) {
      const cat = state.categories.find(c => c.id === catId);
      if (cat) {
        cat.name = name;
        cat.type = type;
        cat.icon = icon;
        cat.color = color;
      }
    } else {
      state.categories.push({
        id: createUUID("c"),
        name: name,
        type: type,
        icon: icon,
        color: color
      });
    }
    elements.categoryDialog.close();
    displayStatusToastNotification("Category successfully saved.");
  } catch (e) {
    displayStatusToastNotification(e.message);
  }
}

function executeCategoryPurgeSequence(catId) {
  if (state.categories.length <= 1) {
    displayStatusToastNotification("At least one category is required.");
    return;
  }
  if (!confirm("Are you sure you want to delete this category? All transactions mapped to it will be moved to Others.")) return;
  triggerTactileFeedback();
  state.transactions.forEach(t => {
    if (t.categoryId === catId) t.categoryId = "others";
  });
  state.categories = state.categories.filter(c => c.id !== catId);
  displayStatusToastNotification("Category successfully deleted.");
}

function triggerModificationModal(transactionId) {
  const targetEntry = state.transactions.find(t => t.id === transactionId);
  if (!targetEntry) return;

  elements.transactionId.value = targetEntry.id;
  elements.transactionAmount.value = targetEntry.amount;
  elements.transactionDescription.value = targetEntry.description;
  elements.transactionDateTime.value = targetEntry.dateTime;
  elements.transactionNotes.value = targetEntry.notes;
  elements.transactionType.value = targetEntry.type;
  renderTransactionCategoryOptions(targetEntry.type);
  elements.transactionBudget.value = targetEntry.budgetId;
  elements.transactionCategory.value = targetEntry.categoryId;
  
  elements.transactionDialogTitle.textContent = "Edit Transaction";
  elements.transactionReceipt.value = "";
  updateReceiptPrompt();
  elements.transactionDialog.showModal();
}

function executeLogPurgeSequence(transactionId) {
  if (!confirm("Are you sure you want to permanently delete this transaction?")) return;
  triggerTactileFeedback();
  state.transactions = state.transactions.filter(t => t.id !== transactionId);
  displayStatusToastNotification("Transaction successfully deleted.");
}

function sortTransactions() {
  state.transactions.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
}

// ── CUSTOM MULTI-FORMAT EXPORTS ENGINE ──────────────────────────────
function getExportRows() {
  const txs = getFilteredTransactions();
  const totals = aggregateGlobalFinancials();
  
  let limit = 0;
  if (filters.budgetIds.length === 1) {
    limit = state.budgets.find(b => b.id === filters.budgetIds[0])?.limit || 0;
  } else {
    limit = computeSum(state.budgets.filter(b => !b.archived).map(b => b.limit));
  }
  totals.limit = limit;

  const rows = txs.map((t) => {
    const cat = state.categories.find(c => c.id === t.categoryId) || {};
    const bud = state.budgets.find(b => b.id === t.budgetId) || {};
    return {
      title: t.description,
      amount: t.type === "income" ? t.amount : -t.amount,
      type: t.type,
      category: cat.name || "General",
      budget: bud.name || "Operations",
      dateTime: formatDateTime(t.dateTime),
      notes: t.notes,
    };
  });
  return { rows, totals };
}

function exportCsv() {
  triggerTactileFeedback();
  const { rows, totals } = getExportRows();
  const now = new Date().toLocaleString("en-IN");
  const csvRows = [
    ["FINANCE MANAGER - EXPENSE REPORT"],
    ["Generated At", now],
    [],
    ["SUMMARY"],
    ["Metric", "Value"],
    ["Total Income", totals.income.toFixed(2)],
    ["Total Expenses", totals.expenses.toFixed(2)],
    ["Budget Limit", totals.limit.toFixed(2)],
    ["Net Balance", totals.balance.toFixed(2)],
    [],
    ["TRANSACTIONS"],
    ["Date & Time", "Title", "Type", "Category", "Budget", "Amount", "Notes"],
    ...rows.map((r) => [
      r.dateTime,
      r.title,
      r.type,
      r.category,
      r.budget,
      Number(r.amount).toFixed(2),
      r.notes,
    ]),
  ];
  downloadBlob(
    new Blob([csvRows.map(csvLine).join("\n")], { type: "text/csv;charset=utf-8;" }),
    reportFilename("csv")
  );
  displayStatusToastNotification("CSV exported successfully.");
}

function exportXlsx() {
  triggerTactileFeedback();
  const { rows, totals } = getExportRows();
  const now = new Date().toLocaleString("en-IN");
  const data = [
    ["FINANCE MANAGER - EXPENSE REPORT"],
    ["Generated", now],
    [],
    ["SUMMARY"],
    ["Metric", "Value"],
    ["Total Income", totals.income],
    ["Total Expenses", totals.expenses],
    ["Budget Limit", totals.limit],
    ["Net Balance", totals.balance],
    [],
    ["TRANSACTIONS"],
    ["Date & Time", "Title", "Type", "Category", "Budget", "Amount", "Notes"],
    ...rows.map((r) => [r.dateTime, r.title, r.type, r.category, r.budget, r.amount, r.notes]),
  ];
  const boldIndices = new Set([0, 3, 4, 10, 11]);
  const sheetRows = data
    .map((row, ri) => {
      const isBold = boldIndices.has(ri);
      const cells = row
        .map((v, ci) => xlsxCell(ri + 1, ci + 1, v, isBold))
        .join("");
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join("");
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="7" width="20" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData></worksheet>`;
  const bytes = zipStore([
    ["[Content_Types].xml", XLSX_CONTENT_TYPES],
    ["_rels/.rels", XLSX_RELS],
    ["xl/workbook.xml", XLSX_WORKBOOK],
    ["xl/_rels/workbook.xml.rels", XLSX_WORKBOOK_RELS],
    ["xl/styles.xml", XLSX_STYLES],
    ["xl/worksheets/sheet1.xml", sheetXml],
  ]);
  downloadBlob(
    new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    reportFilename("xlsx")
  );
  displayStatusToastNotification("Excel file exported successfully.");
}

function exportPdf() {
  triggerTactileFeedback();
  const { rows, totals } = getExportRows();
  downloadBlob(
    new Blob([buildPdfTable(rows, totals)], { type: "application/pdf" }),
    reportFilename("pdf")
  );
  displayStatusToastNotification("PDF Report exported.");
}

function buildPdfTable(rows, totals) {
  const pages = [];
  const rowsPerPage = 18;
  for (let i = 0; i < rows.length; i += rowsPerPage) pages.push(rows.slice(i, i + rowsPerPage));

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  const kids = [];
  pages.forEach((pageRows, pageIndex) => {
    const pageObject = 6 + pageIndex * 2;
    const contentObject = pageObject + 1;
    const content = pdfPageTable(pageRows, totals, pageIndex + 1, pages.length);
    kids.push(`${pageObject} 0 R`);
    objects[pageObject - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[contentObject - 1] = `<< /Length ${latinBytes(content).length} >>\nstream\n${content}\nendstream`;
  });

  objects[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;

  const parts = ["%PDF-1.4\n"];
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(latinBytes(parts.join("")).length);
    parts.push(`${i + 1} 0 obj\n${obj}\nendobj\n`);
  });

  const xref = latinBytes(parts.join("")).length;
  parts.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((o) => parts.push(`${String(o).padStart(10, "0")} 00000 n \n`));
  parts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return latinBytes(parts.join(""));
}

function pdfPageTable(rows, totals, page, totalPages) {
  let y = 760;
  const colWidths = [80, 60, 45, 70, 80, 90, 87];
  const rowHeight = 12;

  const commands = [
    "0.95 0.98 0.97 rg 0 0 612 792 re f",
    "BT /F2 14 Tf 0 0 0 rg",
    `1 0 0 1 36 ${y} Tm (FINANCE MANAGER PRO REPORT) Tj`,
    "ET",
    "BT /F1 8 Tf 0.35 0.42 0.4 rg",
    `1 0 0 1 520 ${y} Tm (Page ${page}/${totalPages}) Tj`,
    "ET",
  ];

  y -= 20;
  commands.push("BT /F2 10 Tf 0 0 0 rg");
  commands.push(`1 0 0 1 36 ${y} Tm (SUMMARY) Tj`);
  commands.push("ET");

  y -= 14;
  commands.push("BT /F1 9 Tf");
  commands.push(`1 0 0 1 36 ${y} Tm (Total Income: ${exportAmount(totals.income)}) Tj`);
  commands.push("ET");

  y -= 10;
  commands.push("BT /F1 9 Tf");
  commands.push(`1 0 0 1 36 ${y} Tm (Total Expenses: ${exportAmount(totals.expenses)}) Tj`);
  commands.push("ET");

  y -= 10;
  commands.push("BT /F1 9 Tf");
  commands.push(`1 0 0 1 36 ${y} Tm (Budget Limit: ${exportAmount(totals.limit)}) Tj`);
  commands.push("ET");

  y -= 10;
  commands.push("BT /F1 9 Tf");
  commands.push(`1 0 0 1 36 ${y} Tm (Net Balance: ${exportAmount(totals.balance)}) Tj`);
  commands.push("ET");

  y -= 18;
  commands.push("BT /F2 10 Tf 0 0 0 rg");
  commands.push(`1 0 0 1 36 ${y} Tm (TRANSACTIONS) Tj`);
  commands.push("ET");

  y -= 14;
  const headers = ["Title", "Amount", "Type", "Category", "Budget", "Date", "Notes"];
  let x = 36;
  const tableWidth = colWidths.reduce((a, b) => a + b);
  commands.push(`0.8 0.8 0.8 rg 36 ${y - 2} ${tableWidth} 14 re f`);
  commands.push("BT /F2 8 Tf 1 1 1 rg");

  headers.forEach((h, i) => {
    commands.push(`1 0 0 1 ${x + 2} ${y + 3} Tm ${pdfText(h)} Tj`);
    x += colWidths[i];
  });
  commands.push("ET");

  y -= 14;
  commands.push("0 0 0 rg 0.5 w");
  commands.push(`36 ${y} ${36 + tableWidth} ${y} l S`);

  rows.forEach((r) => {
    if (y < 50) return;
    x = 36;
    const rowData = [
      r.title.slice(0, 20),
      r.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
      r.type,
      r.category.slice(0, 12),
      r.budget.slice(0, 12),
      r.dateTime.slice(0, 10),
      r.notes.slice(0, 15),
    ];
    commands.push("BT /F1 7.5 Tf 0 0 0 rg");
    rowData.forEach((cell, i) => {
      commands.push(`1 0 0 1 ${x + 1} ${y - 8} Tm ${pdfText(cell)} Tj`);
      x += colWidths[i];
    });
    commands.push("ET");
    y -= rowHeight;
    commands.push(`36 ${y} ${36 + tableWidth} ${y} l S`);
  });
  return commands.join("\n");
}

function pdfText(value) {
  const text = String(value)
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
  return `(${text})`;
}

function latinBytes(value) {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) bytes[i] = value.charCodeAt(i) & 0xff;
  return bytes;
}

function xlsxCell(row, col, value, bold = false) {
  const ref = `${columnName(col)}${row}`;
  const style = bold ? ' s="2"' : '';
  if (typeof value === "number") return `<c r="${ref}"${style}><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${style}><is><t>${escapeOutputHtml(value)}</t></is></c>`;
}

function columnName(index) {
  let name = "";
  while (index > 0) {
    const rem = (index - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    index = Math.floor((index - 1) / 26);
  }
  return name;
}

function zipStore(files) {
  const enc = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  files.forEach(([name, data]) => {
    const nameBytes = enc.encode(name);
    const dataBytes = typeof data === "string" ? enc.encode(data) : data;
    const crc = crc32(dataBytes);
    const local = concatBytes(
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(dataBytes.length), u32(dataBytes.length),
      u16(nameBytes.length), u16(0), nameBytes
    );
    const central = concatBytes(
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(dataBytes.length), u32(dataBytes.length),
      u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset), nameBytes
    );
    localParts.push(local, dataBytes);
    centralParts.push(central);
    offset += local.length + dataBytes.length;
  });
  const centralSize = centralParts.reduce((t, p) => t + p.length, 0);
  const end = concatBytes(
    u32(0x06054b50), u16(0), u16(0),
    u16(files.length), u16(files.length),
    u32(centralSize), u32(offset), u16(0)
  );
  return concatBytes(...localParts, ...centralParts, end);
}

function u16(v) {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, v, true);
  return b;
}

function u32(v) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, v >>> 0, true);
  return b;
}

function concatBytes(...parts) {
  const out = new Uint8Array(parts.reduce((t, p) => t + p.length, 0));
  let offset = 0;
  parts.forEach((p) => { out.set(p, offset); offset += p.length; });
  return out;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, i) => {
  let v = i;
  for (let b = 0; b < 8; b++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
  return v >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const XLSX_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
const XLSX_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
const XLSX_WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Transactions" sheetId="1" r:id="rId1"/></sheets></workbook>`;
const XLSX_WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
const XLSX_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`;

function csvLine(values) {
  return values.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
}

function reportFilename(ext) {
  return `wealth-ledger-report-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── BACKUP & RESTORE State Packages ───────────────────────────────
function backupData() {
  triggerTactileFeedback();
  downloadBlob(
    new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    `wealth-pro-backup-${new Date().toISOString().slice(0, 10)}.json`
  );
  displayStatusToastNotification("Backup exported successfully.");
}

async function restoreData(file) {
  try {
    triggerTactileFeedback();
    const text = await file.text();
    const parsed = normalizeIncomingState(JSON.parse(text));
    
    // Assign values dynamically to proxy so it auto-renders and commits
    state.budgets = parsed.budgets;
    state.categories = parsed.categories;
    state.transactions = parsed.transactions;
    state.preferredCurrency = parsed.preferredCurrency;
    state.themePreference = parsed.themePreference;
    state.activeBudgetId = parsed.activeBudgetId;

    initTheme();
    displayStatusToastNotification("Backup imported successfully.");
  } catch (e) {
    displayStatusToastNotification("Import failed: " + e.message);
  }
}

// ── THEME PREFERENCE ENGINE ─────────────────────────────────────────
function initTheme() {
  const theme = state?.themePreference || "system";
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme-preference", theme);
  if (theme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
  if (activeView === "analytics") {
    renderAnalyticsDistributionEngine();
  }
}

// ── DANGER ZONE RESET ENGINE ───────────────────────────────────────
async function resetAllApplicationData() {
  if (!confirm("Are you sure you want to completely RESET ALL DATA?\n\nThis will permanently delete all budgets, transactions, categories, and settings. This cannot be undone!")) return;
  try {
    setLoading(true);
    triggerTactileFeedback();
    const db = await accessDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("finance-manager-v1");
    
    // Reset state reactive values
    const fallback = normalizeIncomingState(null);
    state.budgets = fallback.budgets;
    state.categories = fallback.categories;
    state.transactions = fallback.transactions;
    state.preferredCurrency = fallback.preferredCurrency;
    state.themePreference = fallback.themePreference;
    state.activeBudgetId = fallback.activeBudgetId;

    initTheme();
    displayStatusToastNotification("All data has been reset.");
  } catch (err) {
    displayStatusToastNotification("Reset failed: " + err.message);
  } finally {
    setLoading(false);
  }
}

function resetActiveBudget() {
  const budget = state.budgets.find(b => b.id === state.activeBudgetId);
  if (!budget) return;
  if (!confirm(`Are you sure you want to clear all transactions from the budget "${budget.name}"?`)) return;
  triggerTactileFeedback();
  state.transactions = state.transactions.filter(t => t.budgetId !== budget.id);
  displayStatusToastNotification("Budget transactions cleared.");
}

// ── ASYNC FORM TRANSACTION SAVER ──────────────────────────────────
async function saveTransactionFromForm() {
  try {
    setLoading(true);
    triggerTactileFeedback();
    
    const existingId = elements.transactionId.value;
    const existingTx = existingId ? state.transactions.find(t => t.id === existingId) : null;
    
    const receiptFile = elements.transactionReceipt.files[0];
    let receiptData = existingTx?.receiptData || "";
    
    if (receiptFile) {
      try {
        const compressed = await readReceipt(receiptFile);
        receiptData = compressed.receiptData;
      } catch (err) {
        displayStatusToastNotification(err.message);
        setLoading(false);
        return;
      }
    }
    
    const txAmount = parseFloat(elements.transactionAmount.value) || 0;
    if (txAmount <= 0) {
      displayStatusToastNotification("Please enter a valid transaction amount.");
      setLoading(false);
      return;
    }
    if (!elements.transactionDescription.value.trim()) {
      displayStatusToastNotification("Please enter a description.");
      setLoading(false);
      return;
    }

    const transactionalModel = {
      id: existingId || createUUID("tx"),
      amount: roundMoney(txAmount),
      description: elements.transactionDescription.value.trim(),
      dateTime: elements.transactionDateTime.value || nowLocalInput(),
      categoryId: elements.transactionCategory.value || "others",
      budgetId: elements.transactionBudget.value || "personal",
      notes: elements.transactionNotes.value.trim(),
      type: elements.transactionType.value || "expense",
      receiptData: receiptData
    };

    if (existingId) {
      const index = state.transactions.findIndex(t => t.id === existingId);
      if (index !== -1) {
        state.transactions[index] = transactionalModel;
      }
    } else {
      state.transactions.push(transactionalModel);
    }

    sortTransactions();
    elements.transactionDialog.close();
    displayStatusToastNotification("Transaction saved successfully.");
  } catch (e) {
    displayStatusToastNotification(e.message);
  } finally {
    setLoading(false);
  }
}

// ── UI AND FORM ASSISTANT HELPERS ──────────────────────────────────
function setLoading(val) {
  if (elements.loading) elements.loading.hidden = !val;
}

function updateReceiptPrompt() {
  if (!elements.dropzonePrompt) return;
  const file = elements.transactionReceipt.files[0];
  if (file) {
    elements.dropzonePrompt.textContent = `📎 ${file.name}`;
    elements.dropzonePrompt.style.color = "var(--primary)";
    elements.dropzonePrompt.style.fontWeight = "600";
  } else {
    const existingId = elements.transactionId.value;
    const existingTx = existingId ? state.transactions.find(t => t.id === existingId) : null;
    if (existingTx && existingTx.receiptData) {
      elements.dropzonePrompt.textContent = "📎 Existing receipt attached (click to change)";
      elements.dropzonePrompt.style.color = "var(--primary)";
      elements.dropzonePrompt.style.fontWeight = "600";
    } else {
      elements.dropzonePrompt.textContent = "Upload receipt photo here";
      elements.dropzonePrompt.style.color = "var(--muted)";
      elements.dropzonePrompt.style.fontWeight = "normal";
    }
  }
}

function displayStatusToastNotification(messageString) {
  if (!elements.toast) return;
  elements.toast.textContent = messageString;
  elements.toast.classList.add("show");
  clearTimeout(displayStatusToastNotification.timer);
  displayStatusToastNotification.timer = setTimeout(() => elements.toast.classList.remove("show"), 3000);
}

async function updateStorageTelemetryMetrics() {
  if (navigator.storage && navigator.storage.estimate && elements.storageUsage) {
    try {
      const statistics = await navigator.storage.estimate();
      const storageKiloBytesUsed = Math.round(statistics.usage / 1024);
      if (storageKiloBytesUsed > 1024) {
        elements.storageUsage.textContent = `Storage usage: ${(storageKiloBytesUsed / 1024).toFixed(2)} MB`;
      } else {
        elements.storageUsage.textContent = `Storage usage: ${storageKiloBytesUsed} KB`;
      }
    } catch {
      elements.storageUsage.textContent = "Storage usage: Offline";
    }
  }
}

// ── EVENT LISTENERS INTERACTIVE DISPATCH MATRIX ──────────────────────
function initializeSystemEventMappers() {
  elements.navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      triggerTactileFeedback();
      const nextViewTarget = btn.dataset.nav;
      activeView = nextViewTarget;
      elements.views.forEach(v => v.classList.toggle("active", v.dataset.view === nextViewTarget));
      elements.navButtons.forEach(b => b.classList.toggle("active", b === btn));
      if (nextViewTarget === "analytics") {
        renderAnalyticsDistributionEngine();
        renderMonthlyBarChart();
      }
    });
  });

  // Wire up any [data-nav] buttons outside the nav hub (e.g., "View Analytics" on home)
  document.querySelectorAll("[data-nav]").forEach(btn => {
    if (!btn.closest(".system-navigation-hub")) {
      btn.addEventListener("click", () => {
        triggerTactileFeedback();
        const target = btn.dataset.nav;
        activeView = target;
        elements.views.forEach(v => v.classList.toggle("active", v.dataset.view === target));
        elements.navButtons.forEach(b => b.classList.toggle("active", b.dataset.nav === target));
        if (target === "analytics") {
          renderAnalyticsDistributionEngine();
          renderMonthlyBarChart();
        }
      });
    }
  });

  // Analytics budget filter dropdown
  elements.analyticsBudgetSelect.addEventListener("change", () => {
    triggerTactileFeedback();
    analyticsBudgetId = elements.analyticsBudgetSelect.value;
    renderAnalyticsDistributionEngine();
    renderMonthlyBarChart();
  });

  elements.activeBudgetSelect.addEventListener("change", event => {
    triggerTactileFeedback();
    state.activeBudgetId = event.target.value;
    displayStatusToastNotification(`Focus switched.`);
  });

  elements.searchToggle.addEventListener("click", () => {
    triggerTactileFeedback();
    elements.searchPanel.hidden = !elements.searchPanel.hidden;
    if (!elements.searchPanel.hidden) elements.globalSearch.focus();
  });

  elements.globalSearch.addEventListener("input", () => {
    filters.search = elements.globalSearch.value;
    renderLedgerTimelineViewport();
  });

  document.querySelectorAll("[data-open-transaction]").forEach(elementTrigger => {
    elementTrigger.addEventListener("click", () => {
      triggerTactileFeedback();
      elements.transactionForm.reset();
      elements.transactionId.value = "";
      elements.transactionDateTime.value = nowLocalInput();
      elements.transactionType.value = elementTrigger.dataset.openTransaction;
      renderTransactionCategoryOptions(elementTrigger.dataset.openTransaction);
      elements.transactionDialogTitle.textContent = elementTrigger.dataset.openTransaction === "income" ? "Add Income" : "Add Expense";
      updateReceiptPrompt();
      elements.transactionDialog.showModal();
    });
  });

  elements.saveTransactionButton.addEventListener("click", saveTransactionFromForm);
  elements.transactionReceipt.addEventListener("change", updateReceiptPrompt);
  elements.transactionType.addEventListener("change", () => {
    renderTransactionCategoryOptions(elements.transactionType.value);
  });

  document.querySelectorAll("[data-open-budget]").forEach(btn => {
    btn.addEventListener("click", () => {
      triggerTactileFeedback();
      document.querySelector('#budgetForm')?.reset();
      elements.budgetId.value = "";
      openBudgetDialog();
    });
  });
  elements.saveBudgetButton.addEventListener("click", saveBudgetFromForm);

  elements.openCategoryButton.addEventListener("click", () => {
    triggerTactileFeedback();
    elements.categoryForm?.reset();
    elements.categoryId.value = "";
    openCategoryDialog();
  });
  elements.saveCategoryButton.addEventListener("click", saveCategoryFromForm);

  elements.backupButton.addEventListener("click", backupData);
  elements.restoreInput.addEventListener("change", () => {
    const file = elements.restoreInput.files[0];
    if (file) restoreData(file);
  });

  elements.themeSelect.addEventListener("change", () => {
    triggerTactileFeedback();
    state.themePreference = elements.themeSelect.value;
    applyTheme(state.themePreference);
  });

  elements.currencySelect.addEventListener("change", () => {
    triggerTactileFeedback();
    state.preferredCurrency = elements.currencySelect.value;
    displayStatusToastNotification("Currency preference updated.");
  });

  elements.resetBudgetButton.addEventListener("click", resetActiveBudget);
  elements.resetAllDataButton.addEventListener("click", resetAllApplicationData);

  // Filters timeline binding
  elements.typeTabs.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-type-filter]");
    if (!btn) return;
    triggerTactileFeedback();
    filters.type = btn.dataset.typeFilter;
    elements.typeTabs
      .querySelectorAll("button")
      .forEach((b) => b.classList.toggle("active", b === btn));
    renderLedgerTimelineViewport();
  });

  elements.quickFilter.addEventListener("change", () => {
    triggerTactileFeedback();
    filters.quick = elements.quickFilter.value;
    renderLedgerTimelineViewport();
  });

  elements.fromDate.addEventListener("change", () => {
    filters.from = elements.fromDate.value;
    renderLedgerTimelineViewport();
  });

  elements.toDate.addEventListener("change", () => {
    filters.to = elements.toDate.value;
    renderLedgerTimelineViewport();
  });

  elements.categoryFilter.addEventListener("change", () => {
    triggerTactileFeedback();
    filters.categoryId = elements.categoryFilter.value;
    renderLedgerTimelineViewport();
  });

  elements.budgetFilter.addEventListener("change", () => {
    triggerTactileFeedback();
    filters.budgetIds =
      elements.budgetFilter.value === "all" ? [] : [elements.budgetFilter.value];
    renderLedgerTimelineViewport();
  });

  elements.clearFilters.addEventListener("click", () => {
    triggerTactileFeedback();
    filters = { type: "all", quick: "all", from: "", to: "", categoryId: "all", budgetIds: [], search: "" };
    elements.globalSearch.value = "";
    elements.quickFilter.value = "all";
    elements.fromDate.value = "";
    elements.toDate.value = "";
    elements.categoryFilter.value = "all";
    elements.budgetFilter.value = "all";
    elements.typeTabs
      .querySelectorAll("button")
      .forEach((b) => b.classList.toggle("active", b.dataset.typeFilter === "all"));
    renderLedgerTimelineViewport();
    displayStatusToastNotification("Filters reset successfully.");
  });

  // Export binding
  document.querySelectorAll("[data-export]").forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.export;
      if (mode === "csv") exportCsv();
      if (mode === "xlsx") exportXlsx();
      if (mode === "pdf") exportPdf();
    });
  });

  // Automatic Dynamic Modals Dismissals Traps
  [elements.transactionDialog, elements.budgetDialog, elements.categoryDialog, elements.receiptDialog].forEach(modalBox => {
    modalBox?.addEventListener("click", evt => { if (evt.target === modalBox) modalBox.close(); });
  });
  
  document.querySelector("#closeTransactionDialog").addEventListener("click", () => elements.transactionDialog.close());
  document.querySelector("#cancelTransactionButton").addEventListener("click", () => elements.transactionDialog.close());
  document.querySelector("#closeBudgetDialog").addEventListener("click", () => elements.budgetDialog.close());
  document.querySelector("#cancelBudgetButton").addEventListener("click", () => elements.budgetDialog.close());
  document.querySelector("#closeCategoryDialog").addEventListener("click", () => elements.categoryDialog.close());
  document.querySelector("#cancelCategoryButton").addEventListener("click", () => elements.categoryDialog.close());
  document.querySelector("#closeReceiptDialog").addEventListener("click", () => elements.receiptDialog.close());
}

// ── BOOTSTRAP INITIALIZATION PROCEDURES ─────────────────────────────
(async function executeSystemBootSequence() {
  try {
    await executeMigrationSequence(); // Backward-compatible v1 migration
    const stateArchiveCheckpoint = await retrievePersistedState();
    const standardizedStateData = normalizeIncomingState(stateArchiveCheckpoint);
    
    // Bind Reactive Wrapper Object targeting system drawing pipes
    state = makeReactive(standardizedStateData, () => {
      commitStateToStorage(state);
      executeRenderSequence();
    });

    initializeSystemEventMappers();
    initTheme();
    executeRenderSequence();

    // PWA Service Worker loading registration
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => console.warn("Offline caching disabled."));
      });
    }

    // PWA custom installer handlers
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (elements.installButton) elements.installButton.hidden = false;
    });

    if (elements.installButton) {
      elements.installButton.addEventListener("click", async () => {
        if (!deferredInstallPrompt) return;
        triggerTactileFeedback();
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        elements.installButton.hidden = true;
      });
    }

    window.addEventListener("appinstalled", (e) => {
      deferredInstallPrompt = null;
      if (elements.installButton) elements.installButton.hidden = true;
    });

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (state.themePreference === "system") {
        applyTheme("system");
      }
    });

  } catch (criticalInitializationError) {
    console.error("System structural kernel crash context details:", criticalInitializationError);
  }
})();
