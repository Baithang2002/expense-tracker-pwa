const STORAGE_KEY = "finance-manager-v1";
const LEGACY_KEY = "expense-tracker-state-v1";
const MAX_RECEIPT_BYTES = 1_500_000;

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const DEFAULT_BUDGETS = [
  ["personal", "Personal Budget", 0],
  ["family", "Family Budget", 0],
  ["savings", "Savings Budget", 0],
  ["travel", "Travel Budget", 0],
  ["emergency", "Emergency Budget", 0],
];

const DEFAULT_CATEGORIES = [
  ["food", "Food", "expense", "🍽", "#e66a3f"],
  ["shopping", "Shopping", "expense", "🛍", "#8b5cf6"],
  ["bills", "Bills", "expense", "⚡", "#f59e0b"],
  ["transport", "Transport", "expense", "🚌", "#0ea5e9"],
  ["healthcare", "Healthcare", "expense", "✚", "#ef4444"],
  ["entertainment", "Entertainment", "expense", "▶", "#ec4899"],
  ["salary", "Salary", "income", "₹", "#16a34a"],
  ["savings", "Savings", "income", "◆", "#0f766e"],
  ["others", "Others", "both", "●", "#64748b"],
];

const elements = {
  views: document.querySelectorAll(".view"),
  navButtons: document.querySelectorAll("[data-nav]"),
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
  toast: document.querySelector("#toast"),
  loading: document.querySelector("#loading"),
};

let state = loadState();
let deferredInstallPrompt = null;
let activeView = "home";
let analyticsBudgetId = "all";
let filters = {
  type: "all",
  quick: "all",
  from: "",
  to: "",
  categoryId: "all",
  budgetIds: [],
  search: "",
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function uid(prefix) {
  const id = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${id}`;
}

function roundMoney(amount) {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

function parseAmount(value) {
  return Number(String(value).replace(/[₹,\s]/g, ""));
}

function formatINR(amount) {
  return INR.format(roundMoney(amount));
}

function exportAmount(amount) {
  return `INR ${roundMoney(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

function sum(values) {
  return roundMoney(values.reduce((t, v) => t + v, 0));
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out.length ? out : [[]];
}

function showEarlyError(message) {
  window.setTimeout(() => showToast(message), 0);
}

// ── State persistence ──────────────────────────────────────────────────────────

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.budgets) && Array.isArray(parsed.transactions)) {
        return normalizeState(parsed);
      }
    } catch {
      showEarlyError("Saved finance data could not be loaded.");
    }
  }
  return migrateLegacyState() || createInitialState();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    throw new Error(
      "Storage is full. Remove a large receipt photo or export a backup before adding more data.",
    );
  }
}

function normalizeState(input) {
  const budgets = input.budgets.length ? input.budgets : defaultBudgets();
  const categories =
    input.categories && input.categories.length ? input.categories : defaultCategories();
  const activeBudgetId = budgets.some((b) => b.id === input.activeBudgetId)
    ? input.activeBudgetId
    : budgets[0].id;
  return {
    activeBudgetId,
    budgets: budgets.map((b) => ({
      id: b.id || uid("budget"),
      name: b.name || "Budget",
      limit: roundMoney(Number(b.limit) || 0),
      archived: Boolean(b.archived),
    })),
    categories: categories.map((c) => ({
      id: c.id || uid("category"),
      name: c.name || "Category",
      type: c.type || "both",
      icon: c.icon || "●",
      color: c.color || "#176b5d",
    })),
    transactions: (input.transactions || []).map(normalizeTransaction).filter(Boolean),
  };
}

function normalizeTransaction(t) {
  const amount = Number(t.amount);
  if (!t.description || !Number.isFinite(amount) || amount <= 0) return null;
  return {
    id: t.id || uid("tx"),
    type: t.type === "income" ? "income" : "expense",
    amount: roundMoney(amount),
    description: String(t.description),
    dateTime: t.dateTime || `${t.purchaseDate || todayDate()}T12:00`,
    categoryId: t.categoryId || (t.type === "income" ? "salary" : "others"),
    budgetId: t.budgetId || "personal",
    notes: t.notes || "",
    receiptName: t.receiptName || "",
    receiptData: t.receiptData || "",
  };
}

function migrateLegacyState() {
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (!legacy) return null;
  try {
    const parsed = JSON.parse(legacy);
    const initial = createInitialState();
    initial.budgets[0].limit = Number(parsed.budget) || 0;
    initial.transactions = (parsed.expenses || [])
      .map((e) => ({
        id: uid("tx"),
        type: "expense",
        amount: roundMoney(Number(e.amount) || 0),
        description: e.description || "Expense",
        dateTime: `${e.purchase_date || e.purchaseDate || todayDate()}T12:00`,
        categoryId: "others",
        budgetId: "personal",
        notes: "",
        receiptName: "",
        receiptData: "",
      }))
      .filter((t) => t.amount > 0);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  } catch {
    return null;
  }
}

function createInitialState() {
  return {
    activeBudgetId: "personal",
    budgets: defaultBudgets(),
    categories: defaultCategories(),
    transactions: [],
  };
}

function defaultBudgets() {
  return DEFAULT_BUDGETS.map(([id, name, limit]) => ({ id, name, limit, archived: false }));
}

function defaultCategories() {
  return DEFAULT_CATEGORIES.map(([id, name, type, icon, color]) => ({
    id, name, type, icon, color,
  }));
}

// ── Lookups ────────────────────────────────────────────────────────────────────

function getBudget(id) {
  return (
    state.budgets.find((b) => b.id === id) || state.budgets[0]
  );
}

function getCategory(id) {
  return (
    state.categories.find((c) => c.id === id) ||
    state.categories.find((c) => c.id === "others") ||
    state.categories[0]
  );
}

function activeBudget() {
  return getBudget(state.activeBudgetId);
}

// ── Calculations ───────────────────────────────────────────────────────────────

function calculateBudgetTotals(budgetId) {
  const txs = state.transactions.filter((t) => t.budgetId === budgetId);
  const income = sum(txs.filter((t) => t.type === "income").map((t) => t.amount));
  const expenses = sum(txs.filter((t) => t.type === "expense").map((t) => t.amount));
  const budget = getBudget(budgetId);
  return {
    income,
    expenses,
    balance: roundMoney(budget.limit + income - expenses),
    limit: budget.limit,
  };
}

function calculateGlobalTotals(transactions = state.transactions) {
  const income = sum(transactions.filter((t) => t.type === "income").map((t) => t.amount));
  const expenses = sum(transactions.filter((t) => t.type === "expense").map((t) => t.amount));
  const limits = sum(state.budgets.filter((b) => !b.archived).map((b) => b.limit));
  return {
    income,
    expenses,
    balance: roundMoney(limits + income - expenses),
  };
}

// ── Data mutations ─────────────────────────────────────────────────────────────

function sortTransactions() {
  state.transactions.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
}

function validateTransaction(t) {
  if (!t.description.trim()) throw new Error("Enter a transaction description.");
  if (!Number.isFinite(t.amount) || t.amount <= 0) throw new Error("Enter a valid amount.");
  if (!t.dateTime) throw new Error("Choose date and time.");
  if (!t.categoryId) throw new Error("Choose a category.");
  if (!t.budgetId) throw new Error("Choose a budget.");
}

function addOrUpdateTransaction(payload) {
  validateTransaction(payload);
  if (payload.id) {
    const index = state.transactions.findIndex((t) => t.id === payload.id);
    if (index === -1) throw new Error("Transaction not found.");
    state.transactions[index] = {
      ...state.transactions[index],
      ...payload,
      amount: roundMoney(payload.amount),
    };
  } else {
    state.transactions.push({ ...payload, id: uid("tx"), amount: roundMoney(payload.amount) });
  }
  sortTransactions();
  saveState();
}

function deleteTransaction(id) {
  const t = state.transactions.find((item) => item.id === id);
  if (!t) return;
  if (!confirm(`Delete this transaction?\n\n${t.description} — ${formatINR(t.amount)}`)) return;
  state.transactions = state.transactions.filter((item) => item.id !== id);
  saveState();
  render();
  showToast("Transaction deleted");
}

function viewReceipt(id) {
  const t = state.transactions.find((item) => item.id === id);
  if (!t?.receiptData) {
    showToast("No receipt saved for this transaction");
    return;
  }

  const link = document.createElement("a");
  link.href = t.receiptData;
  link.target = "_blank";
  link.rel = "noopener";
  link.click();
}

function addOrUpdateBudget(payload) {
  if (!payload.name.trim()) throw new Error("Enter a budget name.");
  if (!Number.isFinite(payload.limit) || payload.limit < 0)
    throw new Error("Enter a valid budget amount.");
  if (payload.id) {
    const budget = getBudget(payload.id);
    budget.name = payload.name.trim();
    budget.limit = roundMoney(payload.limit);
  } else {
    const budget = {
      id: uid("budget"),
      name: payload.name.trim(),
      limit: roundMoney(payload.limit),
      archived: false,
    };
    state.budgets.push(budget);
    state.activeBudgetId = budget.id;
  }
  saveState();
}

function deleteBudget(id) {
  if (state.budgets.length <= 1) {
    showToast("At least one budget is required");
    return;
  }
  const budget = getBudget(id);
  if (
    !confirm(`Delete "${budget.name}" and all its transactions? This cannot be undone.`)
  )
    return;
  state.budgets = state.budgets.filter((b) => b.id !== id);
  state.transactions = state.transactions.filter((t) => t.budgetId !== id);
  if (state.activeBudgetId === id) state.activeBudgetId = state.budgets[0].id;
  saveState();
  render();
  showToast("Budget deleted");
}

function resetActiveBudget() {
  const budget = activeBudget();
  if (
    !confirm(
      `Reset "${budget.name}"?\n\nThis will clear all transactions for this budget. This cannot be undone.`
    )
  )
    return;
  state.transactions = state.transactions.filter((t) => t.budgetId !== budget.id);
  saveState();
  render();
  showToast("Budget transactions cleared");
}

function addOrUpdateCategory(payload) {
  if (!payload.name.trim()) throw new Error("Enter a category name.");
  if (payload.id) {
    const cat = getCategory(payload.id);
    cat.name = payload.name.trim();
    cat.type = payload.type;
    cat.icon = payload.icon.trim() || "●";
    cat.color = payload.color;
  } else {
    state.categories.push({
      id: uid("category"),
      name: payload.name.trim(),
      type: payload.type,
      icon: payload.icon.trim() || "●",
      color: payload.color,
    });
  }
  saveState();
}

function deleteCategory(id) {
  if (state.categories.length <= 1) {
    showToast("At least one category is required");
    return;
  }
  const cat = getCategory(id);
  if (!confirm(`Delete category "${cat.name}"? Transactions will move to Others.`)) return;
  const fallback =
    state.categories.find((c) => c.id === "others") ||
    state.categories.find((c) => c.id !== id);
  state.transactions.forEach((t) => {
    if (t.categoryId === id) t.categoryId = fallback.id;
  });
  state.categories = state.categories.filter((c) => c.id !== id);
  saveState();
  render();
  showToast("Category deleted");
}

// ── Filtering ──────────────────────────────────────────────────────────────────

function getFilteredTransactions() {
  let out = [...state.transactions];
  if (filters.type !== "all") out = out.filter((t) => t.type === filters.type);
  if (filters.categoryId !== "all") out = out.filter((t) => t.categoryId === filters.categoryId);
  if (filters.budgetIds.length) out = out.filter((t) => filters.budgetIds.includes(t.budgetId));
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    out = out.filter((t) => {
      const cat = getCategory(t.categoryId);
      return [
        t.description,
        cat.name,
        getBudget(t.budgetId).name,
        String(t.amount),
        t.notes,
      ].some((v) => String(v).toLowerCase().includes(q));
    });
  }
  const now = new Date();
  if (filters.quick !== "all") {
    let start;
    if (filters.quick === "year") {
      start = new Date(now.getFullYear(), 0, 1);
    } else {
      start = new Date(now);
      start.setDate(start.getDate() - Number(filters.quick));
    }
    out = out.filter((t) => new Date(t.dateTime) >= start);
  }
  if (filters.from) out = out.filter((t) => new Date(t.dateTime) >= new Date(filters.from));
  if (filters.to) out = out.filter((t) => new Date(t.dateTime) <= new Date(filters.to));
  return out.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
}

// ── Render ─────────────────────────────────────────────────────────────────────

function render() {
  renderSelectors();
  renderHome();
  renderTransactions();
  renderAnalytics();
  renderBudgets();
  renderCategories();
}

function renderSelectors() {
  const budgetOptions = state.budgets
    .map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`)
    .join("");

  elements.activeBudgetSelect.innerHTML = budgetOptions;
  elements.activeBudgetSelect.value = state.activeBudgetId;

  elements.transactionBudget.innerHTML = budgetOptions;
  elements.transactionBudget.value = state.activeBudgetId;

  elements.budgetFilter.innerHTML =
    `<option value="all">All Budgets</option>` +
    state.budgets.map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join("");
  elements.budgetFilter.value = filters.budgetIds[0] || "all";

  elements.analyticsBudgetSelect.innerHTML = `<option value="all">All Budgets</option>${budgetOptions}`;
  elements.analyticsBudgetSelect.value = analyticsBudgetId;

  elements.categoryFilter.innerHTML =
    `<option value="all">All Categories</option>` +
    state.categories
      .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
      .join("");
  elements.categoryFilter.value = filters.categoryId;

  renderTransactionCategoryOptions(elements.transactionType.value || "expense");
}

function renderTransactionCategoryOptions(type) {
  elements.transactionCategory.innerHTML = state.categories
    .filter((c) => c.type === "both" || c.type === type)
    .map((c) => `<option value="${c.id}">${c.icon} ${escapeHtml(c.name)}</option>`)
    .join("");
}

function renderHome() {
  const totals = calculateGlobalTotals();
  elements.currentBalance.textContent = formatINR(totals.balance);
  elements.totalIncome.textContent = formatINR(totals.income);
  elements.totalExpenses.textContent = formatINR(totals.expenses);

  elements.budgetOverview.innerHTML = state.budgets
    .map((b) => budgetCardHtml(b, true))
    .join("");

  const recent = state.transactions.slice(0, 5);
  elements.recentTransactions.innerHTML = recent.length
    ? recent.map(transactionHtml).join("")
    : emptyState("No recent transactions yet.");
}

function renderTransactions() {
  const txs = getFilteredTransactions();
  elements.filteredCount.textContent = `${txs.length} transaction${txs.length === 1 ? "" : "s"}`;
  elements.transactionList.innerHTML = txs.length
    ? txs.map(transactionHtml).join("")
    : emptyState("No transactions match these filters.");
}

function renderAnalytics() {
  const txs =
    analyticsBudgetId === "all"
      ? state.transactions
      : state.transactions.filter((t) => t.budgetId === analyticsBudgetId);
  const income = sum(txs.filter((t) => t.type === "income").map((t) => t.amount));
  const expense = sum(txs.filter((t) => t.type === "expense").map((t) => t.amount));
  elements.analyticsIncome.textContent = formatINR(income);
  elements.analyticsExpense.textContent = formatINR(expense);
  elements.analyticsNet.textContent = formatINR(income - expense);
  elements.analyticsNet.className = income - expense >= 0 ? "income-text" : "expense-text";
  renderExpenseChart(txs);
  renderMonthlyBars(txs);
}

function renderBudgets() {
  elements.budgetCards.innerHTML = state.budgets.map((b) => budgetCardHtml(b, false)).join("");
}

function renderCategories() {
  elements.categoryCards.innerHTML = state.categories
    .map(
      (c) => `
    <article class="category-card">
      <header>
        <span class="category-icon" style="background:${c.color}">${c.icon}</span>
        <div>
          <h3>${escapeHtml(c.name)}</h3>
          <p class="muted">${c.type}</p>
        </div>
      </header>
      <footer>
        <button class="edit-button" type="button" data-edit-category="${c.id}">Edit</button>
        <button class="delete-button" type="button" data-delete-category="${c.id}">Delete</button>
      </footer>
    </article>`
    )
    .join("");
}

function budgetCardHtml(budget, compact) {
  const totals = calculateBudgetTotals(budget.id);
  const spentPercent =
    budget.limit > 0 ? Math.min(100, (totals.expenses / budget.limit) * 100) : 0;
  const activeClass = budget.id === state.activeBudgetId ? " active" : "";
  const overBudget = budget.limit > 0 && totals.expenses > budget.limit;
  return `
    <article class="budget-card${activeClass}" data-select-budget="${budget.id}" tabindex="0" role="button" aria-label="Switch to ${escapeHtml(budget.name)}">
      <header>
        <div>
          <h3>${escapeHtml(budget.name)}</h3>
          <p class="muted">Balance ${formatINR(totals.balance)}</p>
        </div>
        <span class="badge">${formatINR(budget.limit)}</span>
      </header>
      <div class="progress">
        <span style="width:${spentPercent}%;background:${overBudget ? "var(--expense)" : "var(--primary)"}"></span>
      </div>
      <p class="muted">Spent ${formatINR(totals.expenses)} · Income ${formatINR(totals.income)}</p>
      ${
        compact
          ? ""
          : `<footer>
          <button class="edit-button" type="button" data-edit-budget="${budget.id}">Edit</button>
          <button class="delete-button" type="button" data-delete-budget="${budget.id}">Delete</button>
        </footer>`
      }
    </article>`;
}

function transactionHtml(t) {
  const cat = getCategory(t.categoryId);
  const budget = getBudget(t.budgetId);
  const sign = t.type === "income" ? "+" : "−";
  const amountClass = t.type === "income" ? "income-text" : "expense-text";
  const receipt = t.receiptName ? `<span class="badge">📎 Receipt</span>` : "";
  return `
    <article class="transaction-card">
      <span class="category-icon" style="background:${cat.color}">${cat.icon}</span>
      <div class="transaction-main">
        <h3>${escapeHtml(t.description)}</h3>
        <div class="transaction-meta">
          <span class="badge">${escapeHtml(cat.name)}</span>
          <span class="badge">${escapeHtml(budget.name)}</span>
          ${receipt}
        </div>
        <p class="muted">${formatDateTime(t.dateTime)}${t.notes ? ` · ${escapeHtml(t.notes)}` : ""}</p>
        <div class="transaction-actions">
          ${t.receiptData ? `<button class="edit-button" type="button" data-view-receipt="${t.id}">View Receipt</button>` : ""}
          <button class="edit-button" type="button" data-edit-transaction="${t.id}">Edit</button>
          <button class="delete-button" type="button" data-delete-transaction="${t.id}">Delete</button>
        </div>
      </div>
      <strong class="amount ${amountClass}">${sign}${formatINR(t.amount)}</strong>
    </article>`;
}

function emptyState(text) {
  return `<p class="muted" style="padding:16px 0;text-align:center">${escapeHtml(text)}</p>`;
}

// ── Charts ─────────────────────────────────────────────────────────────────────

function renderExpenseChart(transactions) {
  const canvas = elements.expenseChart;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const CX = W / 2;
  const CY = H / 2;
  const RADIUS = W * 0.3;
  const LINE_W = W * 0.2;

  ctx.clearRect(0, 0, W, H);

  const expenses = transactions.filter((t) => t.type === "expense");
  const categoryTotals = state.categories
    .map((c) => ({
      ...c,
      total: sum(
        expenses.filter((t) => t.categoryId === c.id).map((t) => t.amount)
      ),
    }))
    .filter((c) => c.total > 0);

  const total = sum(categoryTotals.map((c) => c.total));

  if (!total) {
    // Draw empty ring
    ctx.lineWidth = LINE_W;
    ctx.strokeStyle = "#dfeae7";
    ctx.beginPath();
    ctx.arc(CX, CY, RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#62716e";
    ctx.font = `bold ${W * 0.05}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("No data", CX, CY);

    elements.categoryBreakdown.innerHTML = emptyState(
      "Add expenses to see category analytics."
    );
    return;
  }

  // Draw donut segments
  ctx.lineWidth = LINE_W;
  ctx.lineCap = "butt";
  let start = -Math.PI / 2;
  const GAP = total > 0 ? 0.015 : 0; // tiny gap between segments

  categoryTotals.forEach((c) => {
    const angle = (c.total / total) * Math.PI * 2 - GAP;
    ctx.strokeStyle = c.color;
    ctx.beginPath();
    ctx.arc(CX, CY, RADIUS, start, start + angle);
    ctx.stroke();
    c.start = start;
    c.end = start + angle;
    start += angle + GAP;
  });

  // Centre text
  ctx.fillStyle = "#14211f";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${W * 0.05}px Inter, sans-serif`;
  ctx.fillText("Expenses", CX, CY - W * 0.04);
  ctx.font = `800 ${W * 0.065}px Inter, sans-serif`;
  ctx.fillText(formatINR(total), CX, CY + W * 0.045);

  // Category breakdown list
  elements.categoryBreakdown.innerHTML = categoryTotals
    .map((c) => {
      const pct = total ? (c.total / total) * 100 : 0;
      return `
      <div class="breakdown-row">
        <div class="breakdown-line">
          <span><span class="badge" style="background:${c.color};color:#fff">${c.icon}</span> ${escapeHtml(c.name)}</span>
          <strong>${pct.toFixed(1)}%</strong>
        </div>
        <div class="bar-track"><span style="width:${pct}%;background:${c.color}"></span></div>
        <p class="muted">${formatINR(c.total)}</p>
      </div>`;
    })
    .join("");

  // Tap interaction on chart
  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const x = (e.clientX - rect.left) * scaleX - CX;
    const y = (e.clientY - rect.top) * scaleY - CY;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < RADIUS - LINE_W / 2 || dist > RADIUS + LINE_W / 2) return;
    let angle = Math.atan2(y, x);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;
    const hit = categoryTotals.find((c) => angle >= c.start && angle <= c.end);
    if (hit) elements.chartHint.textContent = `${hit.name}: ${formatINR(hit.total)}`;
  };
}

function renderMonthlyBars(transactions) {
  const months = new Map();
  transactions.forEach((t) => {
    const d = new Date(t.dateTime);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!months.has(key)) months.set(key, { income: 0, expense: 0 });
    months.get(key)[t.type] += t.amount;
  });
  const rows = [...months.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6);
  const max = Math.max(1, ...rows.map(([, v]) => Math.max(v.income, v.expense)));
  elements.monthlyBars.innerHTML = rows.length
    ? rows
        .map(
          ([month, v]) => `
      <div class="bar-row">
        <div class="bar-line">
          <strong>${month}</strong>
          <span class="muted">Income ${formatINR(v.income)} · Expense ${formatINR(v.expense)}</span>
        </div>
        <div class="bar-track"><span style="width:${(v.expense / max) * 100}%;background:var(--expense)"></span></div>
        <div class="bar-track"><span style="width:${(v.income / max) * 100}%;background:var(--income)"></span></div>
      </div>`
        )
        .join("")
    : emptyState("No monthly data yet.");
}

// ── Navigation ─────────────────────────────────────────────────────────────────

function setView(view) {
  activeView = view;
  elements.views.forEach((el) =>
    el.classList.toggle("active", el.dataset.view === view)
  );
  document.querySelectorAll(".bottom-nav [data-nav]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.nav === view);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Dialogs ────────────────────────────────────────────────────────────────────

function openTransactionDialog(type = "expense", id = "") {
  const t = id ? state.transactions.find((item) => item.id === id) : null;
  const txType = t?.type || type;
  elements.transactionDialogTitle.textContent = t
    ? "Edit Transaction"
    : txType === "income"
    ? "Add Income"
    : "Add Expense";
  elements.transactionId.value = t?.id || "";
  elements.transactionType.value = txType;
  elements.transactionAmount.value = t?.amount || "";
  elements.transactionDescription.value = t?.description || "";
  elements.transactionDateTime.value = t?.dateTime || nowLocalInput();
  elements.transactionBudget.value = t?.budgetId || state.activeBudgetId;
  renderTransactionCategoryOptions(txType);
  elements.transactionCategory.value =
    t?.categoryId || elements.transactionCategory.options[0]?.value || "";
  elements.transactionNotes.value = t?.notes || "";
  elements.transactionReceipt.value = "";
  elements.transactionDialog.showModal();
}

async function saveTransactionFromForm() {
  try {
    setLoading(true);
    const existing = elements.transactionId.value
      ? state.transactions.find((t) => t.id === elements.transactionId.value)
      : null;
    const receiptFile = elements.transactionReceipt.files[0];
    const receipt = receiptFile
      ? await readReceipt(receiptFile)
      : {
          receiptName: existing?.receiptName || "",
          receiptData: existing?.receiptData || "",
        };
    addOrUpdateTransaction({
      id: elements.transactionId.value,
      type: elements.transactionType.value,
      amount: parseAmount(elements.transactionAmount.value),
      description: elements.transactionDescription.value.trim(),
      dateTime: elements.transactionDateTime.value,
      budgetId: elements.transactionBudget.value,
      categoryId: elements.transactionCategory.value,
      notes: elements.transactionNotes.value.trim(),
      ...receipt,
    });
    elements.transactionDialog.close();
    render();
    showToast("Transaction saved");
  } catch (error) {
    showToast(error.message);
  } finally {
    setLoading(false);
  }
}

function readReceipt(file) {
  if (file.size > MAX_RECEIPT_BYTES) {
    return Promise.reject(
      new Error("Receipt photo is too large. Please choose an image under 1.5 MB."),
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ receiptName: file.name, receiptData: reader.result });
    reader.onerror = () => reject(new Error("Receipt could not be read."));
    reader.readAsDataURL(file);
  });
}

function openBudgetDialog(id = "") {
  const budget = id ? getBudget(id) : null;
  elements.budgetDialogTitle.textContent = budget ? "Edit Budget" : "Create Budget";
  elements.budgetId.value = budget?.id || "";
  elements.budgetName.value = budget?.name || "";
  elements.budgetLimit.value = budget?.limit || "";
  elements.budgetDialog.showModal();
}

function saveBudgetFromForm() {
  try {
    addOrUpdateBudget({
      id: elements.budgetId.value,
      name: elements.budgetName.value,
      limit: parseAmount(elements.budgetLimit.value),
    });
    elements.budgetDialog.close();
    render();
    showToast("Budget saved");
  } catch (error) {
    showToast(error.message);
  }
}

function openCategoryDialog(id = "") {
  const cat = id ? getCategory(id) : null;
  elements.categoryDialogTitle.textContent = cat ? "Edit Category" : "Add Category";
  elements.categoryId.value = cat?.id || "";
  elements.categoryName.value = cat?.name || "";
  elements.categoryType.value = cat?.type || "both";
  elements.categoryIcon.value = cat?.icon || "●";
  elements.categoryColor.value = cat?.color || "#176b5d";
  elements.categoryDialog.showModal();
}

function saveCategoryFromForm() {
  try {
    addOrUpdateCategory({
      id: elements.categoryId.value,
      name: elements.categoryName.value,
      type: elements.categoryType.value,
      icon: elements.categoryIcon.value,
      color: elements.categoryColor.value,
    });
    elements.categoryDialog.close();
    render();
    showToast("Category saved");
  } catch (error) {
    showToast(error.message);
  }
}

// ── Export ─────────────────────────────────────────────────────────────────────

function getExportRows() {
  const txs = getFilteredTransactions();
  const totals = calculateGlobalTotals(txs);
  const rows = txs.map((t) => ({
    title: t.description,
    amount: t.type === "income" ? t.amount : -t.amount,
    type: t.type,
    category: getCategory(t.categoryId).name,
    budget: getBudget(t.budgetId).name,
    dateTime: formatDateTime(t.dateTime),
    notes: t.notes,
  }));
  return { rows, totals };
}

function exportCsv() {
  const { rows, totals } = getExportRows();
  const csvRows = [
    ["Transaction title", "Amount", "Type", "Category", "Budget name", "Date & time", "Notes"],
    ...rows.map((r) => [r.title, exportAmount(r.amount), r.type, r.category, r.budget, r.dateTime, r.notes]),
    [],
    ["Total Income", exportAmount(totals.income)],
    ["Total Expenses", exportAmount(totals.expenses)],
    ["Balance", exportAmount(totals.balance)],
  ];
  downloadBlob(
    new Blob([csvRows.map(csvLine).join("\n")], { type: "text/csv" }),
    reportFilename("csv")
  );
  showToast("CSV exported");
}

function exportXlsx() {
  const { rows, totals } = getExportRows();
  const data = [
    ["Rupee Finance Manager"],
    [],
    ["Total Income", totals.income],
    ["Total Expenses", totals.expenses],
    ["Balance", totals.balance],
    [],
    ["Transaction title", "Amount", "Type", "Category", "Budget name", "Date & time", "Notes"],
    ...rows.map((r) => [r.title, r.amount, r.type, r.category, r.budget, r.dateTime, r.notes]),
  ];
  const sheetRows = data
    .map((row, ri) => {
      const cells = row
        .map((v, ci) => xlsxCell(ri + 1, ci + 1, v))
        .join("");
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join("");
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="7" width="24" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData></worksheet>`;
  const bytes = zipStore([
    ["[Content_Types].xml", XLSX_CONTENT_TYPES],
    ["_rels/.rels", XLSX_RELS],
    ["xl/workbook.xml", XLSX_WORKBOOK],
    ["xl/_rels/workbook.xml.rels", XLSX_WORKBOOK_RELS],
    ["xl/worksheets/sheet1.xml", sheetXml],
  ]);
  downloadBlob(
    new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    reportFilename("xlsx")
  );
  showToast("Excel exported");
}

function exportPdf() {
  const { rows, totals } = getExportRows();
  const lines = [
    "Rupee Finance Manager",
    `Total Income: ${exportAmount(totals.income)}`,
    `Total Expenses: ${exportAmount(totals.expenses)}`,
    `Balance: ${exportAmount(totals.balance)}`,
    "",
    "Title | Amount | Type | Category | Budget | Date & Time | Notes",
    ...rows.map(
      (r) =>
        `${r.title} | ${exportAmount(r.amount)} | ${r.type} | ${r.category} | ${r.budget} | ${r.dateTime} | ${r.notes}`
    ),
  ];
  downloadBlob(
    new Blob([buildPdf(lines)], { type: "application/pdf" }),
    reportFilename("pdf")
  );
  showToast("PDF exported");
}

// ── PDF builder ────────────────────────────────────────────────────────────────

function buildPdf(lines) {
  const pages = chunk(lines, 36);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const kids = [];
  pages.forEach((pageLines, index) => {
    const pageObject = 4 + index * 2;
    const contentObject = pageObject + 1;
    const content = pdfPage(pageLines, index + 1, pages.length);
    kids.push(`${pageObject} 0 R`);
    objects[pageObject - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`;
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

function pdfPage(lines, page, count) {
  let y = 746;
  const commands = [
    "0.95 0.98 0.97 rg 0 0 612 792 re f",
    "BT /F1 16 Tf 0 0 0 rg",
    `1 0 0 1 54 ${y} Tm ${pdfText(lines[0] || "Rupee Finance Manager")} Tj`,
    "ET",
    "BT /F1 8 Tf 0.35 0.42 0.4 rg",
    `1 0 0 1 510 746 Tm ${pdfText(`Page ${page}/${count}`)} Tj`,
    "ET",
    "BT /F1 9 Tf 0 0 0 rg",
  ];
  y -= 28;
  lines.slice(1).forEach((line) => {
    commands.push(`1 0 0 1 54 ${y} Tm ${pdfText(line.slice(0, 112))} Tj`);
    y -= 18;
  });
  commands.push("ET");
  return commands.join("\n");
}

function csvLine(values) {
  return values.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
}

function reportFilename(ext) {
  return `finance-report-${todayDate()}.${ext}`;
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

// ── Backup & restore ───────────────────────────────────────────────────────────

function backupData() {
  downloadBlob(
    new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    `finance-backup-${todayDate()}.json`
  );
  showToast("Backup exported");
}

async function restoreData(file) {
  try {
    const text = await file.text();
    state = normalizeState(JSON.parse(text));
    saveState();
    render();
    showToast("Backup restored");
  } catch {
    showToast("Backup file could not be restored");
  }
}

// ── UI helpers ─────────────────────────────────────────────────────────────────

function setLoading(value) {
  elements.loading.hidden = !value;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(
    () => elements.toast.classList.remove("show"),
    2400
  );
}

// ── Low-level helpers ──────────────────────────────────────────────────────────

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

function xlsxCell(row, col, value) {
  const ref = `${columnName(col)}${row}`;
  if (typeof value === "number") return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeHtml(value)}</t></is></c>`;
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

const XLSX_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
const XLSX_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
const XLSX_WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Transactions" sheetId="1" r:id="rId1"/></sheets></workbook>`;
const XLSX_WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

// ── Event listeners ────────────────────────────────────────────────────────────

document.addEventListener("click", (e) => {
  const card = e.target.closest("[data-select-budget]");
  const target = e.target.closest("button");
  if (card && !target) {
    state.activeBudgetId = card.dataset.selectBudget;
    saveState();
    render();
    showToast("Budget switched");
    return;
  }
  if (!target) return;
  if (target.dataset.nav) setView(target.dataset.nav);
  if (target.dataset.openTransaction) openTransactionDialog(target.dataset.openTransaction);
  if (target.dataset.openBudget !== undefined) openBudgetDialog();
  if (target.dataset.editTransaction) openTransactionDialog("expense", target.dataset.editTransaction);
  if (target.dataset.deleteTransaction) deleteTransaction(target.dataset.deleteTransaction);
  if (target.dataset.viewReceipt) viewReceipt(target.dataset.viewReceipt);
  if (target.dataset.editBudget) openBudgetDialog(target.dataset.editBudget);
  if (target.dataset.deleteBudget) deleteBudget(target.dataset.deleteBudget);
  if (target.dataset.editCategory) openCategoryDialog(target.dataset.editCategory);
  if (target.dataset.deleteCategory) deleteCategory(target.dataset.deleteCategory);
  if (target.dataset.export === "csv") exportCsv();
  if (target.dataset.export === "xlsx") exportXlsx();
  if (target.dataset.export === "pdf") exportPdf();
});

document.addEventListener("keydown", (e) => {
  if ((e.key !== "Enter" && e.key !== " ") || !e.target.matches("[data-select-budget]")) return;
  e.preventDefault();
  state.activeBudgetId = e.target.dataset.selectBudget;
  saveState();
  render();
  showToast("Budget switched");
});

// Dialog close buttons (type="button" — no form submit side-effects)
document.querySelector("#closeTransactionDialog")?.addEventListener("click", () =>
  elements.transactionDialog.close()
);
document.querySelector("#cancelTransactionButton")?.addEventListener("click", () =>
  elements.transactionDialog.close()
);
document.querySelector("#closeBudgetDialog")?.addEventListener("click", () =>
  elements.budgetDialog.close()
);
document.querySelector("#cancelBudgetButton")?.addEventListener("click", () =>
  elements.budgetDialog.close()
);
document.querySelector("#closeCategoryDialog")?.addEventListener("click", () =>
  elements.categoryDialog.close()
);
document.querySelector("#cancelCategoryButton")?.addEventListener("click", () =>
  elements.categoryDialog.close()
);

// Close dialog on backdrop click
[elements.transactionDialog, elements.budgetDialog, elements.categoryDialog].forEach((dlg) => {
  dlg?.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  });
});

elements.searchToggle.addEventListener("click", () => {
  elements.searchPanel.hidden = !elements.searchPanel.hidden;
  if (!elements.searchPanel.hidden) elements.globalSearch.focus();
});

elements.globalSearch.addEventListener("input", () => {
  filters.search = elements.globalSearch.value;
  renderTransactions();
});

elements.activeBudgetSelect.addEventListener("change", () => {
  state.activeBudgetId = elements.activeBudgetSelect.value;
  saveState();
  render();
});

elements.analyticsBudgetSelect.addEventListener("change", () => {
  analyticsBudgetId = elements.analyticsBudgetSelect.value;
  renderAnalytics();
});

elements.typeTabs.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-type-filter]");
  if (!btn) return;
  filters.type = btn.dataset.typeFilter;
  elements.typeTabs
    .querySelectorAll("button")
    .forEach((b) => b.classList.toggle("active", b === btn));
  renderTransactions();
});

elements.quickFilter.addEventListener("change", () => {
  filters.quick = elements.quickFilter.value;
  renderTransactions();
});

elements.fromDate.addEventListener("change", () => {
  filters.from = elements.fromDate.value;
  renderTransactions();
});

elements.toDate.addEventListener("change", () => {
  filters.to = elements.toDate.value;
  renderTransactions();
});

elements.categoryFilter.addEventListener("change", () => {
  filters.categoryId = elements.categoryFilter.value;
  renderTransactions();
});

elements.budgetFilter.addEventListener("change", () => {
  filters.budgetIds =
    elements.budgetFilter.value === "all" ? [] : [elements.budgetFilter.value];
  renderTransactions();
});

elements.clearFilters.addEventListener("click", () => {
  filters = { type: "all", quick: "all", from: "", to: "", categoryId: "all", budgetIds: [], search: "" };
  elements.globalSearch.value = "";
  elements.quickFilter.value = "all";
  elements.fromDate.value = "";
  elements.toDate.value = "";
  elements.typeTabs
    .querySelectorAll("button")
    .forEach((b) => b.classList.toggle("active", b.dataset.typeFilter === "all"));
  render();
  showToast("Filters cleared");
});

elements.saveTransactionButton.addEventListener("click", saveTransactionFromForm);
elements.saveBudgetButton.addEventListener("click", saveBudgetFromForm);
elements.openCategoryButton.addEventListener("click", () => openCategoryDialog());
elements.saveCategoryButton.addEventListener("click", saveCategoryFromForm);
elements.backupButton.addEventListener("click", backupData);
elements.restoreInput.addEventListener("change", () => {
  const file = elements.restoreInput.files[0];
  if (file) restoreData(file);
});
elements.resetBudgetButton.addEventListener("click", resetActiveBudget);
elements.transactionType.addEventListener("change", () =>
  renderTransactionCategoryOptions(elements.transactionType.value)
);

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  elements.installButton.hidden = false;
});

elements.installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  elements.installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .catch(() => showToast("Offline support could not be started"));
  });
}

// ── Boot ───────────────────────────────────────────────────────────────────────

sortTransactions();
saveState();
render();
