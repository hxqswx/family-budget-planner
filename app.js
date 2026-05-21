const categories = [
  { id: "food", name: "餐饮", budget: 3200, icon: "饭", color: "#84d7b5" },
  { id: "home", name: "房租家居", budget: 7800, icon: "家", color: "#84c5f4" },
  { id: "baby", name: "孩子教育", budget: 2400, icon: "学", color: "#ffd166" },
  { id: "fun", name: "娱乐玩具", budget: 1200, icon: "乐", color: "#ff8fa3" },
  { id: "health", name: "医疗健康", budget: 1600, icon: "康", color: "#b69cff" },
  { id: "travel", name: "交通旅行", budget: 1800, icon: "行", color: "#f2a65a" },
];

const starterState = {
  income: 28000,
  expenses: [
    { name: "周末超市", amount: 356.8, category: "food", date: "2026-05-18" },
    { name: "亲子乐园", amount: 220, category: "fun", date: "2026-05-17" },
    { name: "地铁通勤", amount: 86, category: "travel", date: "2026-05-16" },
    { name: "绘本和文具", amount: 188.5, category: "baby", date: "2026-05-15" },
    { name: "家庭药箱补货", amount: 142, category: "health", date: "2026-05-13" },
  ],
};

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

const preciseCurrency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 2,
});

const storageKey = "family-budget-planner-state";
const categoryById = new Map(categories.map((category) => [category.id, category]));

const elements = {
  form: document.querySelector("#expenseForm"),
  name: document.querySelector("#expenseName"),
  amount: document.querySelector("#expenseAmount"),
  category: document.querySelector("#expenseCategory"),
  date: document.querySelector("#expenseDate"),
  income: document.querySelector("#incomeInput"),
  incomeTotal: document.querySelector("#incomeTotal"),
  spentTotal: document.querySelector("#spentTotal"),
  remainingTotal: document.querySelector("#remainingTotal"),
  savingRate: document.querySelector("#savingRate"),
  categoryList: document.querySelector("#categoryList"),
  expenseList: document.querySelector("#expenseList"),
  expenseCount: document.querySelector("#expenseCount"),
  reset: document.querySelector("#resetData"),
  categoryTemplate: document.querySelector("#categoryTemplate"),
  expenseTemplate: document.querySelector("#expenseTemplate"),
};

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    return structuredClone(starterState);
  }

  try {
    return { ...structuredClone(starterState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(starterState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function populateCategoryOptions() {
  elements.category.innerHTML = categories
    .map((category) => `<option value="${category.id}">${category.name}</option>`)
    .join("");
}

function getCategorySpend(categoryId) {
  return state.expenses
    .filter((expense) => expense.category === categoryId)
    .reduce((sum, expense) => sum + Number(expense.amount), 0);
}

function renderSummary() {
  const spent = state.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const remaining = state.income - spent;
  const savingRate = state.income > 0 ? Math.max(0, Math.round((remaining / state.income) * 100)) : 0;

  elements.income.value = state.income;
  elements.incomeTotal.textContent = currency.format(state.income);
  elements.spentTotal.textContent = currency.format(spent);
  elements.remainingTotal.textContent = currency.format(remaining);
  elements.savingRate.textContent = `${savingRate}%`;
}

function renderCategories() {
  elements.categoryList.innerHTML = "";

  categories.forEach((category) => {
    const spent = getCategorySpend(category.id);
    const percent = Math.min(100, Math.round((spent / category.budget) * 100));
    const node = elements.categoryTemplate.content.firstElementChild.cloneNode(true);

    node.querySelector(".category-icon").textContent = category.icon;
    node.querySelector(".category-icon").style.background = category.color;
    node.querySelector("h3").textContent = category.name;
    node.querySelector("p").textContent = `${currency.format(spent)} / ${currency.format(category.budget)}`;
    node.querySelector("strong").textContent = `${percent}%`;
    node.querySelector(".progress-track span").style.width = `${percent}%`;

    elements.categoryList.append(node);
  });
}

function renderExpenses() {
  elements.expenseList.innerHTML = "";
  elements.expenseCount.textContent = `${state.expenses.length} 笔`;

  if (state.expenses.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "还没有支出记录。";
    elements.expenseList.append(empty);
    return;
  }

  const sortedExpenses = [...state.expenses].sort((a, b) => b.date.localeCompare(a.date));

  sortedExpenses.forEach((expense) => {
    const category = categoryById.get(expense.category);
    const node = elements.expenseTemplate.content.firstElementChild.cloneNode(true);

    node.querySelector(".expense-dot").textContent = category.icon;
    node.querySelector(".expense-dot").style.background = category.color;
    node.querySelector("h3").textContent = expense.name;
    node.querySelector("p").textContent = `${category.name} · ${expense.date}`;
    node.querySelector("strong").textContent = preciseCurrency.format(expense.amount);

    elements.expenseList.append(node);
  });
}

function render() {
  renderSummary();
  renderCategories();
  renderExpenses();
}

function addExpense(event) {
  event.preventDefault();

  state.expenses.push({
    name: elements.name.value.trim(),
    amount: Number(elements.amount.value),
    category: elements.category.value,
    date: elements.date.value,
  });

  saveState();
  elements.form.reset();
  elements.date.valueAsDate = new Date();
  render();
}

function updateIncome() {
  state.income = Number(elements.income.value || 0);
  saveState();
  render();
}

function resetData() {
  state = structuredClone(starterState);
  saveState();
  render();
}

populateCategoryOptions();
elements.date.valueAsDate = new Date();
elements.form.addEventListener("submit", addExpense);
elements.income.addEventListener("input", updateIncome);
elements.reset.addEventListener("click", resetData);
render();
