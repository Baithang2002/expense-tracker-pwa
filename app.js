const STORAGE_KEY = "rupee-finance-manager-v1";
const LEGACY_KEY = "rupee-expense-tracker-state-v1";

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

function uid(prefix) {
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${id}`;
}

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

function normalizeState(input) {
  const budgets = input.budgets.length ? input.budgets : defaultBudgets();
  const categories = input.categories && input.categories.length ? input.categories : defaultCategories();
  const activeBudgetId = budgets.some((budget) => budget.id === input.activeBudgetId) ? input.activeBudgetId : budgets[0].id;
  return {
    activeBudgetId,
    budgets: budgets.map((budget) => ({
      id: budget.id || uid("budget"),
      name: budget.name || "Budget",
      limit: roundMoney(Number(budget.limit) || 0),
      archived: Boolean(budget.archived),
    })),
    categories: categories.map((category) => ({
      id: category.id || uid("category"),
      name: category.name || "Category",
      type: category.type || "both",
      icon: category.icon || "●",
      color: category.color || "#176b5d",
    })),
    transactions: (input.transactions || []).map(normalizeTransaction).filter(Boolean),
  };
}

function normalizeTransaction(transaction) {
  const amount = Number(transaction.amount);
  if (!transaction.description || !Number.isFinite(amount) || amount <= 0) return null;
  return {
    id: transaction.id || uid("tx"),
    type: transaction.type === "income" ? "income" : "expense",
    amount: roundMoney(amount),
    description: String(transaction.description),
    dateTime: transaction.dateTime || `${transaction.purchaseDate || todayDate()}T12:00`,
    categoryId: transaction.categoryId || (transaction.type === "income" ? "salary" : "others"),
    budgetId: transaction.budgetId || "personal",
    notes: transaction.notes || "",
    receiptName: transaction.receiptName || "",
    receiptData: transaction.receiptData || "",
  };
}

function migrateLegacyState() {
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (!legacy) return null;
  try {
    const parsed = JSON.parse(legacy);
    const initial = createInitialState();
    initial.budgets[0].limit = Number(parsed.budget) || 0;
    initial.transactions = (parsed.expenses || []).map((expense) => ({
      id: uid("tx"),
      type: "expense",
      amount: roundMoney(Number(expense.amount) || 0),
      description: expense.description || "Expense",
      dateTime: `${expense.purchase_date || expense.purchaseDate || todayDate()}T12:00`,
      categoryId: "others",
      budgetId: "personal",
      notes: "",
      receiptName: "",
      receiptData: "",
    })).filter((transaction) => transaction.amount > 0);
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
  return DEFAULT_CATEGORIES.map(([id, name, type, icon, color]) => ({ id, name, type, icon, color }));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showEarlyError(message) {
  window.setTimeout(() => showToast(message), 0);
}

function getBudget(id) {
  return state.budgets.find((budget) => budget.id === id) || state.budgets[0];
}

function getCategory(id) {
  return state.categories.find((category) => category.id === id) || state.categories.find((category) => category.id === "others") || state.categories[0];
}

function activeBudget() {
  return getBudget(state.activeBudgetId);
}

function parseAmount(value) {
  return Number(String(value).replace(/[₹,\s]/g, ""));
}

function roundMoney(amount) {
  return Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
}

function formatINR(amount) {
  return INR.format(roundMoney(amount));
}

function exportAmount(amount) {
  return `INR ${roundMoney(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowLocalInput() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function calculateBudgetTotals(budgetId) {
  const transactions = state.transactions.filter((transaction) => transaction.budgetId === budgetId);
  const income = sum(transactions.filter((transaction) => transaction.type === "income").map((transaction) => transaction.amount));
  const expenses = sum(transactions.filter((transaction) => transaction.type === "expense").map((transaction) => transaction.amount));
  const budget = getBudget(budgetId);
  return {
    income,
    expenses,
    balance: roundMoney(budget.limit + income - expenses),
    limit: budget.limit,
  };
}

function calculateGlobalTotals(transactions = state.transactions) {
  const income = sum(transactions.filter((transaction) => transaction.type === "income").map((transaction) => transaction.amount));
  const expenses = sum(transactions.filter((transaction) => transaction.type === "expense").map((transaction) => transaction.amount));
  const limits = sum(state.budgets.filter((budget) => !budget.archived).map((budget) => budget.limit));
  return {
    income,
    expenses,
    balance: roundMoney(limits + income - expenses),
  };
}

function sum(values) {
  return roundMoney(values.reduce((total, value) => total + value, 0));
}

function addOrUpdateTransaction(payload) {
  validateTransaction(payload);
  if (payload.id) {
    const index = state.transactions.findIndex((transaction) => transaction.id === payload.id);
    if (index === -1) throw new Error("Transaction not found.");
    state.transactions[index] = { ...state.transactions[index], ...payload, amount: roundMoney(payload.amount) };
  } else {
    state.transactions.push({ ...payload, id: uid("tx"), amount: roundMoney(payload.amount) });
  }
  sortTransactions();
  saveState();
}

function validateTransaction(transaction) {
  if (!transaction.description.trim()) throw new Error("Enter a transaction description.");
  if (!Number.isFinite(transaction.amount) || transaction.amount <= 0) throw new Error("Enter a valid amount.");
  if (!transaction.dateTime) throw new Error("Choose date and time.");
  if (!transaction.categoryId) throw new Error("Choose a category.");
  if (!transaction.budgetId) throw new Error("Choose a budget.");
}

function deleteTransaction(id) {
  const transaction = state.transactions.find((item) => item.id === id);
  if (!transaction) return;
  if (!confirm(`Delete this transaction?\n\n${transaction.description} - ${formatINR(transaction.amount)}`)) return;
  state.transactions = state.transactions.filter((item) => item.id !== id);
  saveState();
  render();
  showToast("Transaction deleted");
}

function addOrUpdateBudget(payload) {
  if (!payload.name.trim()) throw new Error("Enter a budget name.");
  if (!Number.isFinite(payload.limit) || payload.limit < 0) throw new Error("Enter a valid budget amount.");
  if (payload.id) {
    const budget = getBudget(payload.id);
    budget.name = payload.name.trim();
    budget.limit = roundMoney(payload.limit);
  } else {
    const budget = { id: uid("budget"), name: payload.name.trim(), limit: roundMoney(payload.limit), archived: false };
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
  if (!confirm(`Delete ${budget.name} and all its transactions? This cannot be undone.`)) return;
  state.budgets = state.budgets.filter((item) => item.id !== id);
  state.transactions = state.transactions.filter((transaction) => transaction.budgetId !== id);
  if (state.activeBudgetId === id) state.activeBudgetId = state.budgets[0].id;
  saveState();
  render();
  showToast("Budget deleted");
}

function resetActiveBudget() {
  const budget = activeBudget();
  if (!confirm(`Reset ${budget.name}?\n\nThis will clear all transactions for this budget. This cannot be undone.`)) return;
  state.transactions = state.transactions.filter((transaction) => transaction.budgetId !== budget.id);
  saveState();
  render();
  showToast("Budget transactions cleared");
}

function addOrUpdateCategory(payload) {
  if (!payload.name.trim()) throw new Error("Enter a category name.");
  if (payload.id) {
    const category = getCategory(payload.id);
    category.name = payload.name.trim();
    category.type = payload.type;
    category.icon = payload.icon.trim() || "●";
    category.color = payload.color;
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
  const category = getCategory(id);
  if (!confirm(`Delete category ${category.name}? Transactions will move to Others.`)) return;
  const fallback = state.categories.find((item) => item.id === "others") || state.categories.find((item) => item.id !== id);
  state.transactions.forEach((transaction) => {
    if (transaction.categoryId === id) transaction.categoryId = fallback.id;
  });
  state.categories = state.categories.filter((item) => item.id !== id);
  saveState();
  render();
  showToast("Category deleted");
}

function sortTransactions() {
  state.transactions.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
}

function getFilteredTransactions() {
  let output = [...state.transactions];
  if (filters.type !== "all") output = output.filter((transaction) => transaction.type === filters.type);
  if (filters.categoryId !== "all") output = output.filter((transaction) => transaction.categoryId === filters.categoryId);
  if (filters.budgetIds.length) output = output.filter((transaction) => filters.budgetIds.includes(transaction.budgetId));
  if (filters.search.trim()) {
    const query = filters.search.trim().toLowerCase();
    output = output.filter((transaction) => {
      const category = getCategory(transaction.categoryId);
      return [
        transaction.description,
        category.name,
        getBudget(transaction.budgetId).name,
        String(transaction.amount),
        transaction.notes,
      ].some((value) => String(value).toLowerCase().includes(query));
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
    output = output.filter((transaction) => new Date(transaction.dateTime) >= start);
  }
  if (filters.from) output = output.filter((transaction) => new Date(transaction.dateTime) >= new Date(filters.from));
  if (filters.to) output = output.filter((transaction) => new Date(transaction.dateTime) <= new Date(filters.to));
  return output.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
}

function render() {
  renderSelectors();
  renderHome();
  renderTransactions();
  renderAnalytics();
  renderBudgets();
  renderCategories();
}

function renderSelectors() {
  const budgetOptions = state.budgets.map((budget) => `<option value="${budget.id}">${escapeHtml(budget.name)}</option>`).join("");
  elements.activeBudgetSelect.innerHTML = budgetOptions;
  elements.activeBudgetSelect.value = state.activeBudgetId;
  elements.transactionBudget.innerHTML = budgetOptions;
  elements.transactionBudget.value = state.activeBudgetId;
  elements.budgetFilter.innerHTML = state.budgets.map((budget) => `<option value="${budget.id}">${escapeHtml(budget.name)}</option>`).join("");
  [...elements.budgetFilter.options].forEach((option) => {
    option.selected = filters.budgetIds.includes(option.value);
  });
  elements.analyticsBudgetSelect.innerHTML = `<option value="all">All Budgets</option>${budgetOptions}`;
  elements.analyticsBudgetSelect.value = analyticsBudgetId;
  elements.categoryFilter.innerHTML = `<option value="all">All Categories</option>${state.categories.map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join("")}`;
  elements.categoryFilter.value = filters.categoryId;
  renderTransactionCategoryOptions(elements.transactionType.value || "expense");
}

function renderTransactionCategoryOptions(type) {
  const options = state.categories
    .filter((category) => category.type === "both" || category.type === type)
    .map((category) => `<option value="${category.id}">${category.icon} ${escapeHtml(category.name)}</option>`)
    .join("");
  elements.transactionCategory.innerHTML = options;
}

function renderHome() {
  const totals = calculateGlobalTotals();
  elements.currentBalance.textContent = formatINR(totals.balance);
  elements.totalIncome.textContent = formatINR(totals.income);
  elements.totalExpenses.textContent = formatINR(totals.expenses);

  elements.budgetOverview.innerHTML = state.budgets.map((budget) => budgetCardHtml(budget, true)).join("");
  const recent = state.transactions.slice(0, 5);
  elements.recentTransactions.innerHTML = recent.length ? recent.map(transactionHtml).join("") : emptyState("No recent transactions yet.");
}

function renderTransactions() {
  const transactions = getFilteredTransactions();
  elements.filteredCount.textContent = `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;
  elements.transactionList.innerHTML = transactions.length ? transactions.map(transactionHtml).join("") : emptyState("No transactions match these filters.");
}

function renderAnalytics() {
  const transactions = analyticsBudgetId === "all"
    ? state.transactions
    : state.transactions.filter((transaction) => transaction.budgetId === analyticsBudgetId);
  const income = sum(transactions.filter((transaction) => transaction.type === "income").map((transaction) => transaction.amount));
  const expense = sum(transactions.filter((transaction) => transaction.type === "expense").map((transaction) => transaction.amount));
  elements.analyticsIncome.textContent = formatINR(income);
  elements.analyticsExpense.textContent = formatINR(expense);
  elements.analyticsNet.textContent = formatINR(income - expense);
  elements.analyticsNet.className = income - expense >= 0 ? "income-text" : "expense-text";
  renderExpenseChart(transactions);
  renderMonthlyBars(transactions);
}

function renderBudgets() {
  elements.budgetCards.innerHTML = state.budgets.map((budget) => budgetCardHtml(budget, false)).join("");
}

function renderCategories() {
  elements.categoryCards.innerHTML = state.categories.map((category) => {
    return `
      <article class="category-card">
        <header>
          <div class="tag-row">
            <span class="category-icon" style="background:${category.color}">${category.icon}</span>
            <div>
              <h3>${escapeHtml(category.name)}</h3>
              <p class="muted">${category.type}</p>
            </div>
          </div>
        </header>
        <footer>
          <button class="edit-button" type="button" data-edit-category="${category.id}">Edit</button>
          <button class="delete-button" type="button" data-delete-category="${category.id}">Delete</button>
        </footer>
      </article>
    `;
  }).join("");
}

function budgetCardHtml(budget, compact) {
  const totals = calculateBudgetTotals(budget.id);
  const spentPercent = budget.limit > 0 ? Math.min(100, (totals.expenses / budget.limit) * 100) : 0;
  const activeClass = budget.id === state.activeBudgetId ? " active" : "";
  return `
    <article class="budget-card${activeClass}">
      <header>
        <div>
          <h3>${escapeHtml(budget.name)}</h3>
          <p class="muted">Balance ${formatINR(totals.balance)}</p>
        </div>
        <span class="badge">${formatINR(budget.limit)}</span>
      </header>
      <div class="progress"><span style="width:${spentPercent}%"></span></div>
      <p class="muted">Spent ${formatINR(totals.expenses)} · Income ${formatINR(totals.income)}</p>
      ${compact ? "" : `
        <footer>
          <button class="edit-button" type="button" data-select-budget="${budget.id}">Switch</button>
          <button class="edit-button" type="button" data-edit-budget="${budget.id}">Edit</button>
          <button class="delete-button" type="button" data-delete-budget="${budget.id}">Delete</button>
        </footer>
      `}
    </article>
  `;
}

function transactionHtml(transaction) {
  const category = getCategory(transaction.categoryId);
  const budget = getBudget(transaction.budgetId);
  const sign = transaction.type === "income" ? "+" : "-";
  const amountClass = transaction.type === "income" ? "income-text" : "expense-text";
  const receipt = transaction.receiptName ? `<span class="badge">Receipt</span>` : "";
  return `
    <article class="transaction-card">
      <span class="category-icon" style="background:${category.color}">${category.icon}</span>
      <div class="transaction-main">
        <h3>${escapeHtml(transaction.description)}</h3>
        <div class="transaction-meta">
          <span class="badge">${escapeHtml(category.name)}</span>
          <span class="badge">${escapeHtml(budget.name)}</span>
          ${receipt}
        </div>
        <p class="muted">${formatDateTime(transaction.dateTime)}${transaction.notes ? ` · ${escapeHtml(transaction.notes)}` : ""}</p>
        <div class="transaction-actions">
          <button class="edit-button" type="button" data-edit-transaction="${transaction.id}">Edit</button>
          <button class="delete-button" type="button" data-delete-transaction="${transaction.id}">Delete</button>
        </div>
      </div>
      <strong class="amount ${amountClass}">${sign}${formatINR(transaction.amount)}</strong>
    </article>
  `;
}

function emptyState(text) {
  return `<p class="muted">${escapeHtml(text)}</p>`;
}

function renderExpenseChart(transactions) {
  const canvas = elements.expenseChart;
  const ctx = canvas.getContext("2d");
  const expenses = transactions.filter((transaction) => transaction.type === "expense");
  const categoryTotals = state.categories.map((category) => ({
    ...category,
    total: sum(expenses.filter((transaction) => transaction.categoryId === category.id).map((transaction) => transaction.amount)),
  })).filter((category) => category.total > 0);
  const total = sum(categoryTotals.map((category) => category.total));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 64;
  ctx.lineCap = "round";

  if (!total) {
    ctx.fillStyle = "#d9e5e1";
    ctx.beginPath();
    ctx.arc(160, 160, 96, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#62716e";
    ctx.font = "16px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText("No expense data", 160, 165);
    elements.categoryBreakdown.innerHTML = emptyState("Add expenses to see category analytics.");
    return;
  }

  let start = -Math.PI / 2;
  categoryTotals.forEach((category) => {
    const angle = (category.total / total) * Math.PI * 2;
    ctx.strokeStyle = category.color;
    ctx.beginPath();
    ctx.arc(160, 160, 96, start, start + angle);
    ctx.stroke();
    category.start = start;
    category.end = start + angle;
    start += angle;
  });

  ctx.fillStyle = "#14211f";
  ctx.font = "700 18px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("Expenses", 160, 153);
  ctx.font = "800 20px Segoe UI";
  ctx.fillText(formatINR(total), 160, 180);

  elements.categoryBreakdown.innerHTML = categoryTotals.map((category) => {
    const percent = total ? (category.total / total) * 100 : 0;
    return `
      <div class="breakdown-row">
        <div class="breakdown-line">
          <span><span class="badge" style="background:${category.color};color:#fff">${category.icon}</span> ${escapeHtml(category.name)}</span>
          <strong>${percent.toFixed(1)}%</strong>
        </div>
        <div class="bar-track"><span style="width:${percent}%;background:${category.color}"></span></div>
        <p class="muted">${formatINR(category.total)}</p>
      </div>
    `;
  }).join("");

  canvas.onpointerdown = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width - 160;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height - 160;
    let angle = Math.atan2(y, x);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;
    const hit = categoryTotals.find((category) => angle >= category.start && angle <= category.end);
    if (hit) elements.chartHint.textContent = `${hit.name}: ${formatINR(hit.total)}`;
  };
}

function renderMonthlyBars(transactions) {
  const months = new Map();
  transactions.forEach((transaction) => {
    const date = new Date(transaction.dateTime);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!months.has(key)) months.set(key, { income: 0, expense: 0 });
    months.get(key)[transaction.type] += transaction.amount;
  });
  const rows = [...months.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
  const max = Math.max(1, ...rows.map(([, totals]) => Math.max(totals.income, totals.expense)));
  elements.monthlyBars.innerHTML = rows.length ? rows.map(([month, totals]) => `
    <div class="bar-row">
      <div class="bar-line">
        <strong>${month}</strong>
        <span class="muted">Income ${formatINR(totals.income)} · Expense ${formatINR(totals.expense)}</span>
      </div>
      <div class="bar-track"><span style="width:${(totals.expense / max) * 100}%;background:var(--expense)"></span></div>
      <div class="bar-track"><span style="width:${(totals.income / max) * 100}%;background:var(--income)"></span></div>
    </div>
  `).join("") : emptyState("No monthly data yet.");
}

function setView(view) {
  activeView = view;
  elements.views.forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  document.querySelectorAll(".bottom-nav [data-nav]").forEach((button) => {
    button.classList.toggle("active", button.dataset.nav === view);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openTransactionDialog(type = "expense", id = "") {
  const transaction = id ? state.transactions.find((item) => item.id === id) : null;
  const txType = transaction?.type || type;
  elements.transactionDialogTitle.textContent = transaction ? "Edit Transaction" : txType === "income" ? "Add Income" : "Add Expense";
  elements.transactionId.value = transaction?.id || "";
  elements.transactionType.value = txType;
  elements.transactionAmount.value = transaction?.amount || "";
  elements.transactionDescription.value = transaction?.description || "";
  elements.transactionDateTime.value = transaction?.dateTime || nowLocalInput();
  elements.transactionBudget.value = transaction?.budgetId || state.activeBudgetId;
  renderTransactionCategoryOptions(txType);
  elements.transactionCategory.value = transaction?.categoryId || elements.transactionCategory.options[0]?.value || "";
  elements.transactionNotes.value = transaction?.notes || "";
  elements.transactionReceipt.value = "";
  elements.transactionDialog.showModal();
}

async function saveTransactionFromForm() {
  try {
    setLoading(true);
    const existing = elements.transactionId.value
      ? state.transactions.find((transaction) => transaction.id === elements.transactionId.value)
      : null;
    const receiptFile = elements.transactionReceipt.files[0];
    const receipt = receiptFile ? await readReceipt(receiptFile) : {
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
  const category = id ? getCategory(id) : null;
  elements.categoryDialogTitle.textContent = category ? "Edit Category" : "Add Category";
  elements.categoryId.value = category?.id || "";
  elements.categoryName.value = category?.name || "";
  elements.categoryType.value = category?.type || "both";
  elements.categoryIcon.value = category?.icon || "●";
  elements.categoryColor.value = category?.color || "#176b5d";
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

function getExportRows() {
  const transactions = getFilteredTransactions();
  const totals = calculateGlobalTotals(transactions);
  const rows = transactions.map((transaction) => ({
    title: transaction.description,
    amount: transaction.type === "income" ? transaction.amount : -transaction.amount,
    type: transaction.type,
    category: getCategory(transaction.categoryId).name,
    budget: getBudget(transaction.budgetId).name,
    dateTime: formatDateTime(transaction.dateTime),
    notes: transaction.notes,
  }));
  return { rows, totals };
}

function exportCsv() {
  const { rows, totals } = getExportRows();
  const csvRows = [
    ["Transaction title", "Amount", "Type", "Category", "Budget name", "Date & time", "Notes"],
    ...rows.map((row) => [row.title, exportAmount(row.amount), row.type, row.category, row.budget, row.dateTime, row.notes]),
    [],
    ["Total Income", exportAmount(totals.income)],
    ["Total Expenses", exportAmount(totals.expenses)],
    ["Balance", exportAmount(totals.balance)],
  ];
  downloadBlob(new Blob([csvRows.map(csvLine).join("\n")], { type: "text/csv" }), reportFilename("csv"));
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
    ...rows.map((row) => [row.title, row.amount, row.type, row.category, row.budget, row.dateTime, row.notes]),
  ];
  const sheetRows = data.map((row, rowIndex) => {
    const cells = row.map((value, colIndex) => xlsxCell(rowIndex + 1, colIndex + 1, value)).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="7" width="24" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData></worksheet>`;
  const bytes = zipStore([
    ["[Content_Types].xml", XLSX_CONTENT_TYPES],
    ["_rels/.rels", XLSX_RELS],
    ["xl/workbook.xml", XLSX_WORKBOOK],
    ["xl/_rels/workbook.xml.rels", XLSX_WORKBOOK_RELS],
    ["xl/worksheets/sheet1.xml", sheetXml],
  ]);
  downloadBlob(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), reportFilename("xlsx"));
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
    ...rows.map((row) => `${row.title} | ${exportAmount(row.amount)} | ${row.type} | ${row.category} | ${row.budget} | ${row.dateTime} | ${row.notes}`),
  ];
  downloadBlob(new Blob([buildPdf(lines)], { type: "application/pdf" }), reportFilename("pdf"));
  showToast("PDF exported");
}

function buildPdf(lines) {
  const pages = chunk(lines, 36);
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
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
  objects.forEach((object, index) => {
    offsets.push(latinBytes(parts.join("")).length);
    parts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });
  const xref = latinBytes(parts.join("")).length;
  parts.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((offset) => parts.push(`${String(offset).padStart(10, "0")} 00000 n \n`));
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
  return values.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",");
}

function reportFilename(ext) {
  return `finance-report-${todayDate()}.${ext}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function backupData() {
  downloadBlob(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }), `finance-backup-${todayDate()}.json`);
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

function setLoading(value) {
  elements.loading.hidden = !value;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 2400);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function pdfText(value) {
  const text = String(value).replace(/[^\x20-\x7E]/g, "?").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  return `(${text})`;
}

function latinBytes(value) {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) bytes[index] = value.charCodeAt(index) & 0xff;
  return bytes;
}

function chunk(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size));
  return output.length ? output : [[]];
}

function xlsxCell(row, column, value) {
  const ref = `${columnName(column)}${row}`;
  if (typeof value === "number") return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeHtml(value)}</t></is></c>`;
}

function columnName(index) {
  let name = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    index = Math.floor((index - 1) / 26);
  }
  return name;
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  files.forEach(([name, data]) => {
    const nameBytes = encoder.encode(name);
    const dataBytes = typeof data === "string" ? encoder.encode(data) : data;
    const crc = crc32(dataBytes);
    const local = concatBytes(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(dataBytes.length), u32(dataBytes.length), u16(nameBytes.length), u16(0), nameBytes);
    const central = concatBytes(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(dataBytes.length), u32(dataBytes.length), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes);
    localParts.push(local, dataBytes);
    centralParts.push(central);
    offset += local.length + dataBytes.length;
  });
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = concatBytes(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralSize), u32(offset), u16(0));
  return concatBytes(...localParts, ...centralParts, end);
}

function u16(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}

function concatBytes(...parts) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
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

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.nav) setView(target.dataset.nav);
  if (target.dataset.openTransaction) openTransactionDialog(target.dataset.openTransaction);
  if (target.dataset.openBudget !== undefined) openBudgetDialog();
  if (target.dataset.editTransaction) openTransactionDialog("expense", target.dataset.editTransaction);
  if (target.dataset.deleteTransaction) deleteTransaction(target.dataset.deleteTransaction);
  if (target.dataset.selectBudget) {
    state.activeBudgetId = target.dataset.selectBudget;
    saveState();
    render();
    showToast("Budget switched");
  }
  if (target.dataset.editBudget) openBudgetDialog(target.dataset.editBudget);
  if (target.dataset.deleteBudget) deleteBudget(target.dataset.deleteBudget);
  if (target.dataset.editCategory) openCategoryDialog(target.dataset.editCategory);
  if (target.dataset.deleteCategory) deleteCategory(target.dataset.deleteCategory);
  if (target.dataset.export === "csv") exportCsv();
  if (target.dataset.export === "xlsx") exportXlsx();
  if (target.dataset.export === "pdf") exportPdf();
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

elements.typeTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-type-filter]");
  if (!button) return;
  filters.type = button.dataset.typeFilter;
  elements.typeTabs.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
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
  filters.budgetIds = [...elements.budgetFilter.selectedOptions].map((option) => option.value);
  renderTransactions();
});

elements.clearFilters.addEventListener("click", () => {
  filters = { type: "all", quick: "all", from: "", to: "", categoryId: "all", budgetIds: [], search: "" };
  elements.globalSearch.value = "";
  elements.quickFilter.value = "all";
  elements.fromDate.value = "";
  elements.toDate.value = "";
  elements.typeTabs.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.typeFilter === "all"));
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
elements.transactionType.addEventListener("change", () => renderTransactionCategoryOptions(elements.transactionType.value));

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
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
    navigator.serviceWorker.register("sw.js").catch(() => showToast("Offline support could not be started"));
  });
}

sortTransactions();
saveState();
render();
