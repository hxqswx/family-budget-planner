const defaultCategories = [
  { id: "baby", name: "孩子教育", budget: 2400, icon: "学", color: "#ffd166" },
  { id: "market", name: "超市", budget: 3200, icon: "超", color: "#84d7b5" },
  { id: "shopping", name: "购物", budget: 1800, icon: "购", color: "#ff8fa3" },
  { id: "travel", name: "旅游", budget: 2200, icon: "游", color: "#84c5f4" },
  { id: "food", name: "餐饮", budget: 2600, icon: "饭", color: "#b69cff" },
];

const legacyDefaultCategoryIds = ["food", "home", "baby", "fun", "health", "travel"];
const legacyCategoryRemap = {
  home: "shopping",
  fun: "shopping",
  health: "shopping",
};

const starterExpenses = [
  { name: "周末超市", amount: 356.8, category: "market", date: "2026-05-18" },
  { name: "亲子乐园", amount: 220, category: "baby", date: "2026-05-17" },
  { name: "地铁通勤", amount: 86, category: "travel", date: "2026-05-16" },
  { name: "绘本和文具", amount: 188.5, category: "baby", date: "2026-05-15" },
  { name: "家庭日用品", amount: 142, category: "shopping", date: "2026-05-13" },
  { name: "年初换季采购", amount: 1280, category: "shopping", date: "2026-01-09" },
  { name: "春假短途旅行", amount: 1650, category: "travel", date: "2026-04-04" },
  { name: "新年聚餐", amount: 620, category: "food", date: "2026-02-14" },
];

const starterState = {
  income: 28000,
  categories: defaultCategories,
  expenses: starterExpenses,
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

const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const storageKey = "family-budget-planner-state";
const panelLayoutKey = "family-budget-planner-panel-layout";
const panelSizeKey = "family-budget-planner-panel-sizes";
const installStateKey = "family-budget-planner-installed";
const defaultPanelOrder = ["input", "budget", "timeline", "yearly"];
const defaultPanelSizes = {
  input: "small",
  budget: "medium",
  timeline: "small",
  yearly: "large",
};
const panelSizeCycle = ["small", "medium", "large"];

const elements = {
  panelBoard: document.querySelector("#panelBoard"),
  form: document.querySelector("#expenseForm"),
  installApp: document.querySelector("#installApp"),
  installDialog: document.querySelector("#installDialog"),
  installDialogTitle: document.querySelector("#installDialogTitle"),
  installSteps: document.querySelector("#installSteps"),
  closeInstallDialog: document.querySelector("#closeInstallDialog"),
  confirmInstallTip: document.querySelector("#confirmInstallTip"),
  offlineBadge: document.querySelector("#offlineBadge"),
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
  openCategoryEditor: document.querySelector("#openCategoryEditor"),
  categoryDialog: document.querySelector("#categoryDialog"),
  closeCategoryEditor: document.querySelector("#closeCategoryEditor"),
  resetDialog: document.querySelector("#resetDialog"),
  confirmReset: document.querySelector("#confirmReset"),
  cancelReset: document.querySelector("#cancelReset"),
  categoryForm: document.querySelector("#categoryForm"),
  categorySelect: document.querySelector("#categorySelect"),
  categoryName: document.querySelector("#categoryName"),
  categoryIcon: document.querySelector("#categoryIcon"),
  categoryBudget: document.querySelector("#categoryBudget"),
  categoryColor: document.querySelector("#categoryColor"),
  newCategory: document.querySelector("#newCategory"),
  deleteCategory: document.querySelector("#deleteCategory"),
  yearSelect: document.querySelector("#yearSelect"),
  yearTotal: document.querySelector("#yearTotal"),
  monthAverage: document.querySelector("#monthAverage"),
  topMonth: document.querySelector("#topMonth"),
  yearCategoryChips: document.querySelector("#yearCategoryChips"),
  monthBreakdown: document.querySelector("#monthBreakdown"),
  categoryTemplate: document.querySelector("#categoryTemplate"),
  expenseTemplate: document.querySelector("#expenseTemplate"),
  monthTemplate: document.querySelector("#monthTemplate"),
};

let state = loadState();
let deferredInstallPrompt = null;
let panelOrder = loadPanelOrder();
let panelSizes = loadPanelSizes();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  const saved = localStorage.getItem(storageKey);

  if (!saved) {
    return clone(starterState);
  }

  try {
    const parsed = JSON.parse(saved);
    const migrated = migrateLegacyDefaults(parsed);

    return {
      income: Number(migrated.income ?? starterState.income),
      categories: normalizeCategories(migrated.categories),
      expenses: normalizeExpenses(migrated.expenses),
    };
  } catch {
    return clone(starterState);
  }
}

function migrateLegacyDefaults(savedState) {
  const categoryIds = Array.isArray(savedState.categories) ? savedState.categories.map((category) => category.id) : [];
  const isLegacyDefault =
    categoryIds.length === legacyDefaultCategoryIds.length &&
    legacyDefaultCategoryIds.every((categoryId) => categoryIds.includes(categoryId)) &&
    !categoryIds.includes("market") &&
    !categoryIds.includes("shopping");

  if (!isLegacyDefault) {
    return savedState;
  }

  return {
    ...savedState,
    categories: clone(defaultCategories),
    expenses: Array.isArray(savedState.expenses)
      ? savedState.expenses.map((expense) => ({
          ...expense,
          category: legacyCategoryRemap[expense.category] || expense.category,
        }))
      : savedState.expenses,
  };
}

function normalizeCategories(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return clone(defaultCategories);
  }

  return categories
    .filter((category) => category && category.id && category.name)
    .map((category, index) => ({
      id: String(category.id),
      name: String(category.name).slice(0, 12),
      budget: Math.max(0, Number(category.budget || 0)),
      icon: String(category.icon || category.name[0] || "项").slice(0, 2),
      color: /^#[0-9a-f]{6}$/i.test(category.color) ? category.color : defaultCategories[index % defaultCategories.length].color,
    }));
}

function normalizeExpenses(expenses) {
  if (!Array.isArray(expenses)) {
    return clone(starterExpenses);
  }

  return expenses
    .filter((expense) => expense && expense.name && Number(expense.amount) > 0 && expense.date)
    .map((expense) => ({
      name: String(expense.name),
      amount: Number(expense.amount),
      category: String(expense.category),
      date: String(expense.date),
    }));
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function loadPanelOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(panelLayoutKey) || "[]");
    const validPanels = saved.filter((panelId) => defaultPanelOrder.includes(panelId));
    return [...validPanels, ...defaultPanelOrder.filter((panelId) => !validPanels.includes(panelId))];
  } catch {
    return [...defaultPanelOrder];
  }
}

function savePanelOrder() {
  localStorage.setItem(panelLayoutKey, JSON.stringify(panelOrder));
}

function loadPanelSizes() {
  try {
    const saved = JSON.parse(localStorage.getItem(panelSizeKey) || "{}");
    return Object.fromEntries(
      defaultPanelOrder.map((panelId) => [
        panelId,
        panelSizeCycle.includes(saved[panelId]) ? saved[panelId] : defaultPanelSizes[panelId],
      ]),
    );
  } catch {
    return { ...defaultPanelSizes };
  }
}

function savePanelSizes() {
  localStorage.setItem(panelSizeKey, JSON.stringify(panelSizes));
}

function renderPanelLayout() {
  panelOrder.forEach((panelId) => {
    const panel = elements.panelBoard.querySelector(`[data-panel="${panelId}"]`);
    if (panel) {
      panel.dataset.size = panelSizes[panelId] || defaultPanelSizes[panelId];
      elements.panelBoard.append(panel);
    }
  });
}

function cyclePanelSize(panel) {
  const panelId = panel.dataset.panel;
  const currentSize = panelSizes[panelId] || defaultPanelSizes[panelId];
  const nextSize = panelSizeCycle[(panelSizeCycle.indexOf(currentSize) + 1) % panelSizeCycle.length];

  panelSizes = { ...panelSizes, [panelId]: nextSize };
  panel.dataset.size = nextSize;
  savePanelSizes();
  updateSizeButton(panel);
}

function updateSizeButton(panel) {
  const button = panel.querySelector(".size-toggle");
  if (!button) {
    return;
  }

  const size = panel.dataset.size || "medium";
  const label = size === "small" ? "小" : size === "medium" ? "中" : "大";
  button.textContent = label;
  button.setAttribute("aria-label", `调整${panel.querySelector("h2")?.textContent || "板块"}大小，当前${label}`);
}

function movePanel(draggedId, targetId, placeAfter = false) {
  if (!draggedId || !targetId || draggedId === targetId) {
    return;
  }

  const nextOrder = panelOrder.filter((panelId) => panelId !== draggedId);
  const targetIndex = nextOrder.indexOf(targetId);
  const insertIndex = targetIndex < 0 ? nextOrder.length : targetIndex + (placeAfter ? 1 : 0);
  nextOrder.splice(insertIndex, 0, draggedId);
  panelOrder = nextOrder;
  savePanelOrder();
  renderPanelLayout();
}

function clearDragState() {
  elements.panelBoard.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.remove("is-dragging", "drag-target");
  });
}

function getPanelFromPoint(x, y) {
  return document.elementFromPoint(x, y)?.closest?.("[data-panel]");
}

function setupDraggablePanels() {
  const panels = [...elements.panelBoard.querySelectorAll("[data-panel]")];
  let draggedPanel = null;
  let pointerDrag = null;

  panels.forEach((panel) => {
    const title = panel.querySelector(".panel-title");
    if (!title || title.querySelector(".drag-handle")) {
      return;
    }

    const handle = document.createElement("button");
    const sizeButton = document.createElement("button");

    handle.className = "drag-handle";
    handle.type = "button";
    handle.draggable = true;
    handle.setAttribute("aria-label", `拖拽移动${title.querySelector("h2")?.textContent || "板块"}`);
    title.prepend(handle);

    sizeButton.className = "size-toggle";
    sizeButton.type = "button";
    sizeButton.addEventListener("click", () => cyclePanelSize(panel));
    handle.insertAdjacentElement("afterend", sizeButton);
    updateSizeButton(panel);

    handle.addEventListener("dragstart", (event) => {
      draggedPanel = panel;
      panel.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", panel.dataset.panel);
    });

    handle.addEventListener("dragend", () => {
      draggedPanel = null;
      clearDragState();
    });

    handle.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") {
        return;
      }

      pointerDrag = {
        panel,
        startX: event.clientX,
        startY: event.clientY,
        target: null,
        placeAfter: false,
        active: false,
      };
      handle.setPointerCapture(event.pointerId);
    });

    handle.addEventListener("pointermove", (event) => {
      if (!pointerDrag) {
        return;
      }

      const distance = Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY);
      if (distance < 8 && !pointerDrag.active) {
        return;
      }

      event.preventDefault();
      pointerDrag.active = true;
      pointerDrag.panel.classList.add("is-dragging");
      elements.panelBoard.querySelectorAll(".drag-target").forEach((target) => target.classList.remove("drag-target"));

      const target = getPanelFromPoint(event.clientX, event.clientY);
      if (target && target !== pointerDrag.panel) {
        const targetRect = target.getBoundingClientRect();
        target.classList.add("drag-target");
        pointerDrag.target = target;
        pointerDrag.placeAfter = event.clientY > targetRect.top + targetRect.height / 2;
      }
    });

    handle.addEventListener("pointerup", (event) => {
      if (!pointerDrag) {
        return;
      }

      if (pointerDrag.active && pointerDrag.target) {
        movePanel(pointerDrag.panel.dataset.panel, pointerDrag.target.dataset.panel, pointerDrag.placeAfter);
      }

      handle.releasePointerCapture(event.pointerId);
      pointerDrag = null;
      clearDragState();
    });
  });

  elements.panelBoard.addEventListener("dragover", (event) => {
    if (!draggedPanel) {
      return;
    }

    event.preventDefault();
    const target = event.target.closest("[data-panel]");
    elements.panelBoard.querySelectorAll(".drag-target").forEach((panel) => panel.classList.remove("drag-target"));
    if (target && target !== draggedPanel) {
      target.classList.add("drag-target");
      event.dataTransfer.dropEffect = "move";
    }
  });

  elements.panelBoard.addEventListener("drop", (event) => {
    event.preventDefault();
    const target = event.target.closest("[data-panel]");
    if (draggedPanel && target) {
      const targetRect = target.getBoundingClientRect();
      movePanel(draggedPanel.dataset.panel, target.dataset.panel, event.clientY > targetRect.top + targetRect.height / 2);
    }
    draggedPanel = null;
    clearDragState();
  });
}

function getCategoryById(categoryId) {
  return state.categories.find((category) => category.id === categoryId);
}

function getFallbackCategory() {
  return state.categories[0] || { id: "uncategorized", name: "未分类", budget: 0, icon: "项", color: "#cccccc" };
}

function populateExpenseCategoryOptions() {
  elements.category.innerHTML = "";
  state.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    elements.category.append(option);
  });
}

function populateCategoryEditorOptions() {
  const selectedId = elements.categorySelect.value || state.categories[0]?.id || "";
  elements.categorySelect.innerHTML = "";
  state.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    elements.categorySelect.append(option);
  });

  if (state.categories.some((category) => category.id === selectedId)) {
    elements.categorySelect.value = selectedId;
  }

  syncCategoryEditor();
}

function populateYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = new Set([currentYear, ...state.expenses.map((expense) => Number(expense.date.slice(0, 4))).filter(Boolean)]);
  const selectedYear = elements.yearSelect.value || String(currentYear);

  elements.yearSelect.innerHTML = "";
  [...years].sort((a, b) => b - a).forEach((year) => {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    elements.yearSelect.append(option);
  });

  elements.yearSelect.value = years.has(Number(selectedYear)) ? selectedYear : String(Math.max(...years));
}

function getCategorySpend(categoryId) {
  return state.expenses
    .filter((expense) => expense.category === categoryId && expense.date.slice(0, 7) === getCurrentMonthKey())
    .reduce((sum, expense) => sum + Number(expense.amount), 0);
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function renderSummary() {
  const thisMonth = getCurrentMonthKey();
  const spent = state.expenses
    .filter((expense) => expense.date.slice(0, 7) === thisMonth)
    .reduce((sum, expense) => sum + Number(expense.amount), 0);
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

  state.categories.forEach((category) => {
    const spent = getCategorySpend(category.id);
    const percent = category.budget > 0 ? Math.min(100, Math.round((spent / category.budget) * 100)) : 0;
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
    const category = getCategoryById(expense.category) || getFallbackCategory();
    const node = elements.expenseTemplate.content.firstElementChild.cloneNode(true);

    node.querySelector(".expense-dot").textContent = category.icon;
    node.querySelector(".expense-dot").style.background = category.color;
    node.querySelector("h3").textContent = expense.name;
    node.querySelector("p").textContent = `${category.name} · ${expense.date}`;
    node.querySelector("strong").textContent = preciseCurrency.format(expense.amount);

    elements.expenseList.append(node);
  });
}

function renderYearlySummary() {
  const year = Number(elements.yearSelect.value || new Date().getFullYear());
  const monthly = Array.from({ length: 12 }, () => ({
    total: 0,
    categories: new Map(),
  }));
  const yearlyCategories = new Map();

  state.expenses.forEach((expense) => {
    const date = new Date(`${expense.date}T00:00:00`);
    if (date.getFullYear() !== year) {
      return;
    }

    const monthIndex = date.getMonth();
    monthly[monthIndex].total += expense.amount;
    monthly[monthIndex].categories.set(
      expense.category,
      (monthly[monthIndex].categories.get(expense.category) || 0) + expense.amount,
    );
    yearlyCategories.set(expense.category, (yearlyCategories.get(expense.category) || 0) + expense.amount);
  });

  const yearTotal = monthly.reduce((sum, month) => sum + month.total, 0);
  const activeMonths = monthly.filter((month) => month.total > 0).length || 1;
  const topMonthIndex = monthly.reduce((topIndex, month, index) => (month.total > monthly[topIndex].total ? index : topIndex), 0);

  elements.yearTotal.textContent = currency.format(yearTotal);
  elements.monthAverage.textContent = currency.format(yearTotal / activeMonths);
  elements.topMonth.textContent = yearTotal > 0 ? `${monthNames[topMonthIndex]} ${currency.format(monthly[topMonthIndex].total)}` : "-";
  elements.yearCategoryChips.innerHTML = "";
  elements.monthBreakdown.innerHTML = "";

  if (yearTotal === 0) {
    const empty = document.createElement("p");
    empty.className = "mini-empty compact";
    empty.textContent = "这一年还没有支出记录。";
    elements.yearCategoryChips.append(empty);
  } else {
    [...yearlyCategories.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([categoryId, amount]) => {
        const category = getCategoryById(categoryId) || getFallbackCategory();
        const chip = document.createElement("span");
        chip.style.setProperty("--chip-color", category.color);
        chip.textContent = `${category.icon} ${category.name} ${currency.format(amount)}`;
        elements.yearCategoryChips.append(chip);
      });
  }

  monthly.forEach((month, index) => {
    const node = elements.monthTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector("h3").textContent = monthNames[index];
    node.querySelector("strong").textContent = currency.format(month.total);

    const bars = node.querySelector(".month-bars");
    if (month.total === 0) {
      const empty = document.createElement("p");
      empty.className = "mini-empty";
      empty.textContent = "暂无记录";
      bars.append(empty);
    } else {
      [...month.categories.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .forEach(([categoryId, amount]) => {
          const category = getCategoryById(categoryId) || getFallbackCategory();
          const item = document.createElement("div");
          const icon = document.createElement("span");
          const details = document.createElement("div");
          const name = document.createElement("p");
          const track = document.createElement("div");
          const bar = document.createElement("i");
          const total = document.createElement("strong");

          item.className = "month-category";
          icon.style.background = category.color;
          icon.textContent = category.icon;
          name.textContent = category.name;
          track.className = "mini-track";
          bar.style.width = `${Math.max(8, Math.round((amount / month.total) * 100))}%`;
          total.textContent = currency.format(amount);

          track.append(bar);
          details.append(name, track);
          item.append(icon, details, total);
          bars.append(item);
        });
    }

    elements.monthBreakdown.append(node);
  });
}

function render() {
  populateExpenseCategoryOptions();
  populateCategoryEditorOptions();
  populateYearOptions();
  renderSummary();
  renderCategories();
  renderExpenses();
  renderYearlySummary();
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

function syncCategoryEditor() {
  const category = getCategoryById(elements.categorySelect.value) || state.categories[0];

  if (!category) {
    elements.categoryName.value = "";
    elements.categoryIcon.value = "";
    elements.categoryBudget.value = 0;
    elements.categoryColor.value = "#84d7b5";
    elements.deleteCategory.disabled = true;
    return;
  }

  elements.categorySelect.value = category.id;
  elements.categoryName.value = category.name;
  elements.categoryIcon.value = category.icon;
  elements.categoryBudget.value = category.budget;
  elements.categoryColor.value = category.color;
  elements.deleteCategory.disabled = state.categories.length <= 1;
}

function saveCategory(event) {
  event.preventDefault();
  const selectedId = elements.categorySelect.value;
  const category = getCategoryById(selectedId);

  if (!category) {
    return;
  }

  category.name = elements.categoryName.value.trim();
  category.icon = elements.categoryIcon.value.trim().slice(0, 2) || category.name.slice(0, 1) || "项";
  category.budget = Math.max(0, Number(elements.categoryBudget.value || 0));
  category.color = elements.categoryColor.value;

  saveState();
  render();
}

function addCategory() {
  const id = `category-${Date.now()}`;
  state.categories.push({
    id,
    name: "新分类",
    budget: 1000,
    icon: "新",
    color: "#84d7b5",
  });
  saveState();
  render();
  elements.categorySelect.value = id;
  syncCategoryEditor();
}

function deleteCategory() {
  if (state.categories.length <= 1) {
    return;
  }

  const selectedId = elements.categorySelect.value;
  const fallbackId = state.categories.find((category) => category.id !== selectedId)?.id;
  state.categories = state.categories.filter((category) => category.id !== selectedId);
  state.expenses = state.expenses.map((expense) =>
    expense.category === selectedId ? { ...expense, category: fallbackId } : expense,
  );

  saveState();
  render();
}

function openCategoryDialog() {
  syncCategoryEditor();
  if (typeof elements.categoryDialog.showModal === "function") {
    elements.categoryDialog.showModal();
  }
}

function closeCategoryDialog() {
  if (elements.categoryDialog.open) {
    elements.categoryDialog.close();
  }
}

function resetRecords() {
  if (typeof elements.resetDialog.showModal === "function") {
    elements.resetDialog.showModal();
    return;
  }

  clearRecords();
}

function clearRecords() {
  state.expenses = [];
  state.income = 0;
  saveState();
  render();
  if (elements.resetDialog.open) {
    elements.resetDialog.close();
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(() => {
        elements.offlineBadge.hidden = false;
      })
      .catch(() => {
        elements.offlineBadge.hidden = true;
      });
  });
}

function setupInstallPrompt() {
  updateInstallButtonVisibility();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallButtonVisibility();
  });

  elements.installApp.addEventListener("click", async () => {
    const platform = getInstallPlatform();

    if (!platform) {
      updateInstallButtonVisibility();
      return;
    }

    if (platform === "ios") {
      showInstallHelp("ios");
      return;
    }

    if (!deferredInstallPrompt) {
      showInstallHelp("android");
      return;
    }

    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (choice.outcome === "accepted") {
      markAppInstalled();
    }
    updateInstallButtonVisibility();
  });

  elements.closeInstallDialog.addEventListener("click", () => elements.installDialog.close());
  elements.confirmInstallTip.addEventListener("click", () => elements.installDialog.close());
  elements.installDialog.addEventListener("click", (event) => {
    if (event.target === elements.installDialog) {
      elements.installDialog.close();
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    markAppInstalled();
    updateInstallButtonVisibility();
  });
}

function isRunningInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function getInstallPlatform() {
  const userAgent = window.navigator.userAgent;
  const isIPadOS = /macintosh/i.test(userAgent) && window.navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "ios";
  }
  if (isIPadOS) {
    return "ios";
  }
  if (/android/i.test(userAgent)) {
    return "android";
  }
  return null;
}

function markAppInstalled() {
  localStorage.setItem(installStateKey, "true");
}

function updateInstallButtonVisibility() {
  elements.installApp.hidden =
    !getInstallPlatform() || isRunningInstalled() || localStorage.getItem(installStateKey) === "true";
}

function showInstallHelp(platform) {
  const copy = {
    ios: {
      title: "安装到 iPhone",
      steps: ["用 Safari 打开这个页面。", "点底部分享按钮。", "选择“添加到主屏幕”。"],
    },
    android: {
      title: "安装到安卓手机",
      steps: ["用 Chrome 打开这个页面。", "点右上角菜单按钮。", "选择“安装应用”或“添加到主屏幕”。"],
    },
  }[platform];

  elements.installDialogTitle.textContent = copy.title;
  elements.installSteps.replaceChildren(
    ...copy.steps.map((step) => {
      const item = document.createElement("li");
      item.textContent = step;
      return item;
    }),
  );
  elements.installDialog.showModal();
}

elements.date.valueAsDate = new Date();
elements.form.addEventListener("submit", addExpense);
elements.income.addEventListener("input", updateIncome);
elements.reset.addEventListener("click", resetRecords);
elements.openCategoryEditor.addEventListener("click", openCategoryDialog);
elements.closeCategoryEditor.addEventListener("click", closeCategoryDialog);
elements.categoryDialog.addEventListener("click", (event) => {
  if (event.target === elements.categoryDialog) {
    closeCategoryDialog();
  }
});
elements.confirmReset.addEventListener("click", clearRecords);
elements.cancelReset.addEventListener("click", () => elements.resetDialog.close());
elements.resetDialog.addEventListener("click", (event) => {
  if (event.target === elements.resetDialog) {
    elements.resetDialog.close();
  }
});
elements.categorySelect.addEventListener("change", syncCategoryEditor);
elements.categoryForm.addEventListener("submit", saveCategory);
elements.newCategory.addEventListener("click", addCategory);
elements.deleteCategory.addEventListener("click", deleteCategory);
elements.yearSelect.addEventListener("change", renderYearlySummary);
renderPanelLayout();
setupDraggablePanels();
registerServiceWorker();
setupInstallPrompt();
render();
