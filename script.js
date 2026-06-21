const STORAGE_KEY = 'finance-app-data';

const categories = {
  casa: { label: 'Casa', icon: 'house' },
  transporte: { label: 'Transporte', icon: 'car' },
  alimentacao: { label: 'Alimentação', icon: 'fork-knife' },
  lazer: { label: 'Lazer', icon: 'game-controller' },
  saude: { label: 'Saúde', icon: 'pill' },
  estudos: { label: 'Estudos', icon: 'book-open' },
  cartao: { label: 'Cartão', icon: 'credit-card' }
};

const goals = [
  { title: 'Viagem', saved: 1300, target: 2000 },
  { title: 'Reserva de emergência', saved: 4000, target: 10000 }
];

const elements = {
  monthLabel: document.getElementById('monthLabel'),
  prevMonth: document.getElementById('prevMonth'),
  nextMonth: document.getElementById('nextMonth'),
  pageTitle: document.getElementById('pageTitle'),
  totalIncome: document.getElementById('totalIncome'),
  totalExpense: document.getElementById('totalExpense'),
  balanceValue: document.getElementById('balanceValue'),
  pendingIncome: document.getElementById('pendingIncome'),
  pendingExpense: document.getElementById('pendingExpense'),
  projectionValue: document.getElementById('projectionValue'),
  progressFill: document.getElementById('progressFill'),
  progressLabel: document.getElementById('progressLabel'),
  progressNote: document.getElementById('progressNote'),
  summaryList: document.getElementById('summaryList'),
  summaryCount: document.getElementById('summaryCount'),
  fixedList: document.getElementById('fixedList'),
  fixedCount: document.getElementById('fixedCount'),
  variableList: document.getElementById('variableList'),
  variableCount: document.getElementById('variableCount'),
  incomeList: document.getElementById('incomeList'),
  incomeCount: document.getElementById('incomeCount'),
  receiveList: document.getElementById('receiveList'),
  receiveCount: document.getElementById('receiveCount'),
  historyList: document.getElementById('historyList'),
  fabButton: document.getElementById('fabButton'),
  fabMenu: document.getElementById('fabMenu'),
  entryModal: document.getElementById('entryModal'),
  closeModal: document.getElementById('closeModal'),
  cancelBtn: document.getElementById('cancelBtn'),
  entryForm: document.getElementById('entryForm'),
  modalTitle: document.getElementById('modalTitle'),
  entryType: document.getElementById('entryType'),
  entryCategory: document.getElementById('entryCategory'),
  entryGroup: document.getElementById('entryGroup'),
  entryTitle: document.getElementById('entryTitle'),
  entryAmount: document.getElementById('entryAmount'),
  entryDate: document.getElementById('entryDate'),
  entryStatus: document.getElementById('entryStatus')
};

const storage = {
  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Erro ao ler armazenamento local', error);
      return {};
    }
  },
  save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};

const financeService = {
  state: {
    currentMonth: new Date(),
    currentTab: 'summary',
    currentFilter: 'all',
    data: storage.load()
  },


  normalizeData() {
    if (!this.state.data || typeof this.state.data !== 'object') {
      this.state.data = {};
    }
    if (!Array.isArray(this.state.data.recurring)) {
      this.state.data.recurring = [];
    }
  },

  getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  },

  getMonthName(date) {
    return date.toLocaleDateString('pt-BR', { month: 'long' });
  },

  ensureMonthData(key) {
    if (!this.state.data[key]) {
      this.state.data[key] = { incomes: [], expenses: [] };
    }
  },

  getCurrentMonthData() {
    const key = this.getMonthKey(this.state.currentMonth);
    this.ensureMonthData(key);
    this.populateRecurringEntries(key);
    storage.save(this.state.data);
    return this.state.data[key];
  },

  populateRecurringEntries(key) {
    const monthData = this.state.data[key];
    this.state.data.recurring.forEach(template => {
      const exists = monthData.expenses.some(entry => entry.recurringId === template.recurringId);
      if (!exists) {
        const dateTemplate = new Date(template.date);
        const entryDate = new Date(this.state.currentMonth.getFullYear(), this.state.currentMonth.getMonth(), dateTemplate.getDate());
        const newEntry = {
          id: `${template.recurringId}-${key}`,
          type: 'expense',
          title: template.title,
          amount: template.amount,
          date: entryDate.toISOString().slice(0, 10),
          category: template.category,
          group: template.group,
          paid: false,
          recurringId: template.recurringId,
          isRecurring: true
        };
        monthData.expenses.push(newEntry);
      }
    });
  },

  addEntry(entry) {
    if (entry.type === 'expense' && entry.category === 'fixed' && !entry.recurringId) {
      entry.recurringId = `recurring-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      this.state.data.recurring.push({
        recurringId: entry.recurringId,
        title: entry.title,
        amount: entry.amount,
        date: entry.date,
        category: entry.category,
        group: entry.group
      });
    }

    const monthKey = this.getMonthKey(new Date(entry.date));
    this.ensureMonthData(monthKey);
    const listKey = entry.type === 'income' ? 'incomes' : 'expenses';
    this.state.data[monthKey][listKey].push(entry);
    storage.save(this.state.data);
  },

  deleteEntry(type, id) {
    const monthData = this.getCurrentMonthData();
    const listKey = type === 'income' ? 'incomes' : 'expenses';
    const entry = monthData[listKey].find(item => item.id === id);
    if (entry && entry.recurringId) {
      this.state.data.recurring = this.state.data.recurring.filter(item => item.recurringId !== entry.recurringId);
      Object.keys(this.state.data)
        .filter(key => key !== 'recurring')
        .forEach(monthKey => {
          const monthDataIter = this.state.data[monthKey];
          monthDataIter.expenses = monthDataIter.expenses.filter(item => item.recurringId !== entry.recurringId);
        });
    } else {
      monthData[listKey] = monthData[listKey].filter(item => item.id !== id);
    }
    storage.save(this.state.data);
  },

  updateMonth(delta) {
    const nextMonth = new Date(this.state.currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + delta);
    this.state.currentMonth = nextMonth;
  },

  getHistoryMonths() {
    return Object.keys(this.state.data)
      .filter(key => key !== 'recurring')
      .sort((a, b) => b.localeCompare(a));
  },

  calculateTotals() {
    const monthData = this.getCurrentMonthData();
    const totals = { income: 0, expense: 0, pendingIncome: 0, pendingExpense: 0 };

    monthData.incomes.forEach(item => {
      totals.income += item.amount;
      if (!item.received) totals.pendingIncome += item.amount;
    });

    monthData.expenses.forEach(item => {
      totals.expense += item.amount;
      if (!item.paid) totals.pendingExpense += item.amount;
    });

    return totals;
  },

  getCreditUsage() {
    const monthData = this.getCurrentMonthData();
    return monthData.expenses
      .filter(entry => entry.group === 'cartao')
      .reduce((sum, entry) => sum + entry.amount, 0);
  },

  getFilteredEntries() {
    const monthData = this.getCurrentMonthData();
    const allEntries = [
      ...monthData.incomes.map(entry => ({ ...entry, type: 'income' })),
      ...monthData.expenses.map(entry => ({ ...entry, type: 'expense' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (this.state.currentFilter === 'all') return allEntries;

    return allEntries.filter(entry => {
      if (this.state.currentFilter === 'fixed') return entry.category === 'fixed';
      if (this.state.currentFilter === 'variable') return entry.category === 'variable';
      if (this.state.currentFilter === 'paid') return entry.type === 'income' ? entry.received : entry.paid;
      if (this.state.currentFilter === 'pending') return entry.type === 'income' ? !entry.received : !entry.paid;
      return true;
    });
  }
};

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function buildListItem(entry) {
  const item = document.createElement('div');
  item.className = 'list-item';

  const left = document.createElement('div');
  left.className = 'list-item-left';

  const title = document.createElement('p');
  title.className = 'list-item-title';
  title.textContent = entry.title;

  const meta = document.createElement('p');
  meta.className = 'list-item-meta';
  const groupLabel = categories[entry.group]?.label || 'Outro';
  const recurringLabel = entry.recurringId ? ' • Recorrente' : '';
  meta.textContent = `${groupLabel} • ${entry.category === 'fixed' ? 'Fixa' : 'Variável'} • ${formatDate(entry.date)}${recurringLabel}`;

  left.append(title, meta);

  const right = document.createElement('div');
  right.className = 'amount-badge';

  const amount = document.createElement('strong');
  amount.textContent = formatCurrency(entry.amount);
  amount.style.color = entry.type === 'income' ? '#0f766e' : '#b91c1c';

  const statusBadge = document.createElement('span');
  statusBadge.className = `badge ${entry.type === 'income' ? (entry.received ? 'received' : 'pending') : (entry.paid ? 'received' : 'pending')}`;
  statusBadge.textContent = entry.type === 'income' ? (entry.received ? 'Recebido' : 'Pendente') : (entry.paid ? 'Pago' : 'Pendente');

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.textContent = 'Excluir';
  deleteButton.style.marginTop = '8px';
  deleteButton.style.color = '#7b8aa6';
  deleteButton.style.fontSize = '0.85rem';
  deleteButton.addEventListener('click', () => {
    financeService.deleteEntry(entry.type, entry.id);
    render();
  });

  right.append(amount, statusBadge, deleteButton);
  item.append(left, right);
  return item;
}

function openModal(type) {
  elements.entryForm.reset();
  elements.entryType.value = type;
  elements.modalTitle.textContent = type === 'expense' ? 'Nova conta' : 'Nova receita';
  elements.entryCategory.value = type === 'expense' ? 'fixed' : 'variable';
  elements.entryGroup.value = 'casa';
  elements.entryStatus.checked = false;
  elements.entryDate.valueAsDate = new Date();
  elements.entryModal.classList.remove('hidden');
}

function closeModal() {
  elements.entryModal.classList.add('hidden');
}

function updateOverview() {
  const totals = financeService.calculateTotals();
  const balance = totals.income - totals.expense;
  const projection = totals.income - totals.expense + totals.pendingIncome - totals.pendingExpense;
  const progress = totals.income > 0 ? Math.min(100, Math.round((totals.expense / totals.income) * 100)) : 0;

  elements.monthLabel.textContent = financeService.getMonthName(financeService.state.currentMonth);
  elements.totalIncome.textContent = formatCurrency(totals.income);
  elements.totalExpense.textContent = formatCurrency(totals.expense);
  elements.pendingIncome.textContent = formatCurrency(totals.pendingIncome);
  elements.pendingExpense.textContent = formatCurrency(totals.pendingExpense);
  elements.projectionValue.textContent = formatCurrency(projection);
  elements.balanceValue.textContent = formatCurrency(balance);
  elements.balanceValue.style.color = balance > 0 ? '#0f766e' : balance < 0 ? '#b91c1c' : '#f59e0b';
  elements.progressFill.style.width = `${progress}%`;
  elements.progressLabel.textContent = `${progress}%`;
  elements.progressNote.textContent = `Receitas estimadas ${formatCurrency(totals.income)} • Gastos ${formatCurrency(totals.expense)}`;
}

function renderSummary() {
  const monthData = financeService.getCurrentMonthData();
  const combined = [
    ...monthData.incomes.map(entry => ({ ...entry, type: 'income' })),
    ...monthData.expenses.map(entry => ({ ...entry, type: 'expense' }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  elements.summaryCount.textContent = `${combined.length} registros`;
  elements.summaryList.innerHTML = '';

  if (combined.length === 0) {
    elements.summaryList.innerHTML = '<div class="list-item"><div class="list-item-left"><p class="list-item-title">Nenhum lançamento neste mês</p></div></div>';
    return;
  }

  combined.slice(0, 5).forEach(entry => elements.summaryList.appendChild(buildListItem(entry)));
}

function renderAccounts() {
  const monthData = financeService.getCurrentMonthData();
  const fixedEntries = monthData.expenses.filter(entry => entry.category === 'fixed');
  const variableEntries = monthData.expenses.filter(entry => entry.category === 'variable');

  elements.fixedCount.textContent = `${fixedEntries.length} itens`;
  elements.variableCount.textContent = `${variableEntries.length} itens`;

  elements.fixedList.innerHTML = fixedEntries.length === 0
    ? '<div class="list-item"><div class="list-item-left"><p class="list-item-title">Nenhuma conta fixa neste mês</p></div></div>'
    : '';
  fixedEntries.forEach(entry => elements.fixedList.appendChild(buildListItem({ ...entry, type: 'expense' })));

  elements.variableList.innerHTML = variableEntries.length === 0
    ? '<div class="list-item"><div class="list-item-left"><p class="list-item-title">Nenhuma conta variável neste mês</p></div></div>'
    : '';
  variableEntries.forEach(entry => elements.variableList.appendChild(buildListItem({ ...entry, type: 'expense' })));
}

function renderIncomes() {
  const monthData = financeService.getCurrentMonthData();
  const incomes = monthData.incomes;
  const pendingIncome = incomes.filter(entry => !entry.received);

  elements.incomeCount.textContent = `${incomes.length} itens`;
  elements.receiveCount.textContent = `${pendingIncome.length} itens`;

  elements.incomeList.innerHTML = incomes.length === 0
    ? '<div class="list-item"><div class="list-item-left"><p class="list-item-title">Nenhuma receita neste mês</p></div></div>'
    : '';
  incomes.forEach(entry => elements.incomeList.appendChild(buildListItem({ ...entry, type: 'income' })));

  elements.receiveList.innerHTML = pendingIncome.length === 0
    ? '<div class="list-item"><div class="list-item-left"><p class="list-item-title">Nenhuma receita pendente</p></div></div>'
    : '';
  pendingIncome.forEach(entry => elements.receiveList.appendChild(buildListItem({ ...entry, type: 'income' })));
}

function renderHistory() {
  const months = financeService.getHistoryMonths();
  elements.historyList.innerHTML = '';

  if (months.length === 0) {
    elements.historyList.innerHTML = '<div class="list-item"><div class="list-item-left"><p class="list-item-title">Nenhum histórico salvo</p></div></div>';
    return;
  }

  months.forEach(monthKey => {
    const monthData = financeService.state.data[monthKey];
    const totalIncome = monthData.incomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = monthData.expenses.reduce((sum, item) => sum + item.amount, 0);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'list-item';
    button.style.width = '100%';
    button.addEventListener('click', () => {
      financeService.state.currentMonth = new Date(`${monthKey}-01`);
      render();
    });

    const left = document.createElement('div');
    left.className = 'list-item-left';
    const title = document.createElement('p');
    title.className = 'list-item-title';
    title.textContent = financeService.getMonthName(new Date(`${monthKey}-01`));
    const meta = document.createElement('p');
    meta.className = 'list-item-meta';
    meta.textContent = `${formatCurrency(totalIncome)} recebidos • ${formatCurrency(totalExpense)} gastos`;
    left.append(title, meta);

    const right = document.createElement('div');
    right.className = 'amount-badge';
    const balance = document.createElement('strong');
    balance.textContent = formatCurrency(totalIncome - totalExpense);
    balance.style.color = totalIncome - totalExpense >= 0 ? '#0f766e' : '#b91c1c';
    right.append(balance);

    button.append(left, right);
    elements.historyList.appendChild(button);
  });
}

function showTab(tab) {
  financeService.state.currentTab = tab;
  document.querySelectorAll('.view-section').forEach(section => section.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.tab === tab));

  const selected = document.getElementById(`${tab}View`);
  if (selected) selected.classList.remove('hidden');
}

function openModalAction(action) {
  const type = action === 'receive' ? 'income' : action;
  openModal(type);
  if (action === 'receive') {
    elements.entryStatus.checked = false;
  }
}

function handleFormSubmit(event) {
  event.preventDefault();

  const type = elements.entryType.value;
  const title = elements.entryTitle.value.trim();
  const amount = Number(elements.entryAmount.value);
  const date = elements.entryDate.value;
  const category = elements.entryCategory.value;
  const group = elements.entryGroup.value;
  const statusChecked = elements.entryStatus.checked;

  if (!title || !amount || !date) return;

  financeService.addEntry({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    title,
    amount,
    date,
    category,
    group,
    received: type === 'income' ? statusChecked : false,
    paid: type === 'expense' ? statusChecked : false
  });

  closeModal();
  render();
}

function toggleFabMenu() {
  elements.fabMenu.classList.toggle('hidden');
}

function hideFabMenu() {
  elements.fabMenu.classList.add('hidden');
}

function render() {
  financeService.normalizeData();
  financeService.getCurrentMonthData();
  updateOverview();
  renderSummary();
  renderAccounts();
  renderIncomes();
  renderHistory();
  showTab(financeService.state.currentTab);
}

function init() {
  elements.prevMonth.addEventListener('click', () => {
    financeService.updateMonth(-1);
    render();
  });

  elements.nextMonth.addEventListener('click', () => {
    financeService.updateMonth(1);
    render();
  });

  elements.fabButton.addEventListener('click', event => {
    event.stopPropagation();
    toggleFabMenu();
  });

  elements.fabMenu.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      openModalAction(button.dataset.action);
      hideFabMenu();
    });
  });

  document.addEventListener('click', event => {
    if (!elements.fabMenu.contains(event.target) && event.target !== elements.fabButton) {
      hideFabMenu();
    }
  });

  document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => showTab(button.dataset.tab));
  });

  elements.closeModal.addEventListener('click', closeModal);
  elements.cancelBtn.addEventListener('click', closeModal);
  elements.entryForm.addEventListener('submit', handleFormSubmit);
  elements.entryModal.addEventListener('click', event => {
    if (event.target === elements.entryModal) closeModal();
  });

  render();
}

init();
