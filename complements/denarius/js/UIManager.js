const ui = {
    currentView: 'home',
    init: () => {
        const savedCurr = localStorage.getItem('currency') || 'USD';
        document.getElementById('currency-select').value = savedCurr;
        document.getElementById('rate-usd').value = localStorage.getItem('rate_USD') || 40;
        document.getElementById('rate-usdt').value = localStorage.getItem('rate_USDT') || 40;
        // If there's no saved USD/USDT rate, fetch them automatically
        if (!localStorage.getItem('rate_USD')) ui.fetchUsdOfficial();
        if (!localStorage.getItem('rate_USDT')) ui.fetchUsdtParalelo();
        ui.renderAll();
        ui.switchView('home');
    },
    switchView: (viewName) => {
        ui.currentView = viewName;
        const homeView = document.getElementById('view-home');
        const txView = document.getElementById('view-transactions');
        const btnHome = document.getElementById('nav-btn-home');
        const btnTx = document.getElementById('nav-btn-transactions');

        if (viewName === 'home') {
            homeView.classList.remove('hidden');
            txView.classList.add('hidden');
            btnHome.className = "flex flex-col items-center justify-center w-full h-full text-indigo-600 dark:text-indigo-400 font-bold transition-colors";
            btnTx.className = "flex flex-col items-center justify-center w-full h-full text-slate-400 dark:text-slate-500 hover:text-indigo-500 transition-colors";
        } else {
            homeView.classList.add('hidden');
            txView.classList.remove('hidden');
            btnTx.className = "flex flex-col items-center justify-center w-full h-full text-indigo-600 dark:text-indigo-400 font-bold transition-colors";
            btnHome.className = "flex flex-col items-center justify-center w-full h-full text-slate-400 dark:text-slate-500 hover:text-indigo-500 transition-colors";
            ui.populateFilterSelects();
            ui.applyFilters();
        }
    },
    setCurrency: (v) => { localStorage.setItem('currency', v); ui.renderAll(); },
    setRate: (type, val) => { localStorage.setItem('rate_' + type, val); ui.renderAll(); },
    fetchUsdOfficial: async () => {
        const btn = document.getElementById('rate-usd-btn');
        let oldText = '';
        if (btn) { oldText = btn.innerText; btn.disabled = true; btn.innerText = '...' }
        try {
            const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const val = parseFloat(data?.promedio);
            if (!val || isNaN(val)) throw new Error('Tasa no válida');
            document.getElementById('rate-usd').value = val;
            ui.setRate('USD', val);
            console.log('Tasa oficial cargada:', val);
        } catch (err) {
            console.error('Error al obtener tasa oficial:', err);
            ui.showAlert('No se pudo obtener la tasa oficial del dólar.');
        } finally {
            if (btn) { btn.disabled = false; btn.innerText = oldText }
        }
    },
    fetchUsdtParalelo: async () => {
        const btn = document.getElementById('rate-usdt-btn');
        let oldText = '';
        if (btn) { oldText = btn.innerText; btn.disabled = true; btn.innerText = '...' }
        try {
            const res = await fetch('https://ve.dolarapi.com/v1/dolares/paralelo');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const val = parseFloat(data?.promedio);
            if (!val || isNaN(val)) throw new Error('Tasa no válida');
            document.getElementById('rate-usdt').value = val;
            ui.setRate('USDT', val);
            console.log('Tasa paralelo cargada:', val);
        } catch (err) {
            console.error('Error al obtener tasa paralelo:', err);
            ui.showAlert('No se pudo obtener la tasa paralelo (USDT).');
        } finally {
            if (btn) { btn.disabled = false; btn.innerText = oldText }
        }
    },

    formatMoney: (amount, currency) => {
        const global = localStorage.getItem('currency') || 'USD';
        const target = currency || global;
        const locale = target === 'VES' ? 'es-VE' : 'en-US';
        let code = target; if (target === 'USDT') code = 'USD';
        let fmt = new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(amount);
        if (target === 'USDT') fmt = fmt.replace('$', '₮');
        return fmt;
    },
    toggleManager: (type) => { const el = document.getElementById('manage-' + type); el.classList.toggle('hidden'); if (!el.classList.contains('hidden')) ui.renderCRUD(type); },
    openEditAccountModal: (id, type) => {
        const acc = app.data.accounts.find(a => a.id === id);
        if (!acc) { ui.showAlert('Cuenta no encontrada'); return; }
        document.getElementById('edit-account-id').value = acc.id;
        document.getElementById('edit-account-type').value = type;
        document.getElementById('edit-account-name').value = acc.name;
        document.getElementById('edit-account-currency').value = acc.currency;
        document.getElementById('edit-account-balance').value = acc.balance;
        document.getElementById('edit-account-start').value = acc.startDate || '';
        document.getElementById('edit-account-due').value = acc.dueDate || '';
        document.getElementById('edit-account-modal').classList.remove('hidden');
    },
    openEditBucketModal: (id) => {
        const buc = app.data.buckets.find(b => b.id === id);
        if (!buc) { ui.showAlert('Bucket no encontrado'); return; }
        document.getElementById('edit-bucket-id').value = buc.id;
        document.getElementById('edit-bucket-name').value = buc.name;
        document.getElementById('edit-bucket-balance').value = buc.balance;
        document.getElementById('edit-bucket-modal').classList.remove('hidden');
    },
    showAlert: (msg, title = 'Aviso') => { document.getElementById('message-title').innerText = title; document.getElementById('message-text').innerText = msg; document.getElementById('message-modal').classList.remove('hidden'); },
    hideMessageModal: () => { document.getElementById('message-modal').classList.add('hidden'); },
    // Confirm modal helpers
    _confirmCallback: null,
    showConfirm: (msg, onConfirm, title = 'Confirmar') => {
        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-text').innerText = msg;
        ui._confirmCallback = onConfirm;
        const okBtn = document.getElementById('confirm-ok-btn');
        okBtn.onclick = () => { const cb = ui._confirmCallback; ui.hideConfirmModal(); if (cb) { try { cb(); } finally { ui._confirmCallback = null; } } };
        document.getElementById('confirm-modal').classList.remove('hidden');
    },
    hideConfirmModal: () => { document.getElementById('confirm-modal').classList.add('hidden'); ui._confirmCallback = null; },

    // Tailwind config support removed — use default Tailwind colors and utility classes instead.


    renderCRUD: (type) => {
        let listEl = document.getElementById('crud-list-' + type); listEl.innerHTML = '';
        let items = type === 'BUCKET' ? app.data.buckets : app.data.accounts.filter(a => a.type === type);
        items.forEach(item => { 
            listEl.innerHTML += `<div class="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700"><span class="text-white">${item.name}</span><div class="flex items-center gap-2"><button onclick="${type === 'BUCKET' ? `app.editBucketWrapper('${item.id}')` : `app.editAccountWrapper('${item.id}', '${type}')`}" class="text-indigo-500 px-2 backdrop-blur-sm hover:backdrop-blur-md transition"><i class="fas fa-edit"></i></button><button onclick="${type === 'BUCKET' ? `app.deleteBucketWrapper('${item.id}')` : `app.deleteAccountWrapper('${item.id}', '${type}')`}" class="text-rose-500 px-2 backdrop-blur-sm hover:backdrop-blur-md transition"><i class="fas fa-trash-alt"></i></button></div></div>`; 
        });
    },
    openModal: (type) => {
        document.getElementById('transaction-modal').classList.remove('hidden');
        document.getElementById('tx-type').value = type;
        document.getElementById('modal-title').innerText = type === 'INCOME' ? 'Ingreso' : 'Gasto';
        ui.populateSelects(); ui.updateModalCurrency();
    },
    openTransferModal: () => {
        document.getElementById('transfer-modal').classList.remove('hidden');
        const source = document.getElementById('t-source'); const target = document.getElementById('t-target');
        source.innerHTML = ''; target.innerHTML = '';
        app.data.accounts.filter(a => a.type === 'ASSET').forEach(a => { const opt = `<option value="${a.id}" data-curr="${a.currency}">${a.name} (${a.currency})</option>`; source.innerHTML += opt; target.innerHTML += opt; });
        ui.calcTransfer();
    },
    openBucketTransferModal: () => {
        document.getElementById('bucket-transfer-modal').classList.remove('hidden');
        const s = document.getElementById('bt-source'); const t = document.getElementById('bt-target');
        s.innerHTML = ''; t.innerHTML = '';
        app.data.buckets.forEach(b => { const opt = `<option value="${b.id}">${b.name} (${ui.formatMoney(b.balance)})</option>`; s.innerHTML += opt; t.innerHTML += opt; });
    },

    openSettleModal: (id, type) => {
        const acc = app.data.accounts.find(a => a.id === id);
        if (!acc) return;

        const modal = document.getElementById('settle-modal');
        modal.classList.remove('hidden');

        document.getElementById('settle-id').value = id;
        document.getElementById('settle-type').value = type;
        document.getElementById('settle-account-name').innerText = acc.name;
        const pending = Math.abs(acc.balance);
        document.getElementById('settle-account-balance').innerText = `Pendiente: ${ui.formatMoney(pending, acc.currency)}`;
        document.getElementById('settle-amount').value = pending;

        const title = document.getElementById('settle-title');
        const labelSrc = document.getElementById('settle-label-source');
        const btn = document.getElementById('settle-btn');
        const sourceSelect = document.getElementById('settle-source');

        sourceSelect.innerHTML = '';
        app.data.accounts.filter(a => a.type === 'ASSET').forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.text = `${a.name} (${ui.formatMoney(a.balance, a.currency)})`;
            sourceSelect.appendChild(opt);
        });

        if (type === 'LIABILITY') {
            title.innerText = "Registrar Pago de Deuda";
            title.className = "text-lg font-bold text-rose-600 dark:text-rose-400";
            labelSrc.innerText = "Pagar desde (Origen)";
            btn.innerText = "Confirmar Pago";
            btn.className = "w-full bg-rose-600/90 hover:bg-rose-700/90 backdrop-blur-sm text-white font-bold py-3 rounded-xl shadow-lg transition transform active:scale-95";
        } else {
            title.innerText = "Registrar Cobro";
            title.className = "text-lg font-bold text-emerald-600 dark:text-emerald-400";
            labelSrc.innerText = "Depositar en (Destino)";
            btn.innerText = "Confirmar Cobro";
            btn.className = "w-full bg-emerald-600/90 hover:bg-emerald-700/90 backdrop-blur-sm text-white font-bold py-3 rounded-xl shadow-lg transition transform active:scale-95";
        }
    },

    calcTransfer: () => {
        const sSelect = document.getElementById('t-source'); const tSelect = document.getElementById('t-target');
        const amount = parseFloat(document.getElementById('t-amount').value) || 0;
        if (!sSelect.options.length) return;
        const sCurr = sSelect.options[sSelect.selectedIndex]?.dataset.curr;
        const tCurr = tSelect.options[tSelect.selectedIndex]?.dataset.curr;
        const rateUSD = parseFloat(document.getElementById('rate-usd').value) || 1;
        const rateUSDT = parseFloat(document.getElementById('rate-usdt').value) || 1;
        let result = amount; let info = "1:1";
        if (sCurr !== tCurr) {
            if (sCurr === 'USD' && tCurr === 'VES') { result = amount * rateUSD; info = `x ${rateUSD}`; }
            else if (sCurr === 'USDT' && tCurr === 'VES') { result = amount * rateUSDT; info = `x ${rateUSDT}`; }
            else if (sCurr === 'VES' && tCurr === 'USD') { result = amount / rateUSD; info = `/ ${rateUSD}`; }
            else if (sCurr === 'VES' && tCurr === 'USDT') { result = amount / rateUSDT; info = `/ ${rateUSDT}`; }
            else if (sCurr === 'USD' && tCurr === 'USDT') { result = (amount * rateUSD) / rateUSDT; info = `Arbitraje`; }
            else if (sCurr === 'USDT' && tCurr === 'USD') { result = (amount * rateUSDT) / rateUSD; info = `Arbitraje`; }
        }
        document.getElementById('t-result').innerText = ui.formatMoney(result, tCurr);
        document.getElementById('t-rate-info').innerText = info;
    },
    closeModal: () => { document.getElementById('transaction-modal').classList.add('hidden'); document.getElementById('tx-form').reset(); },
    populateSelects: () => {
        const accSelect = document.getElementById('tx-account'); const bucSelect = document.getElementById('tx-bucket');
        accSelect.innerHTML = ''; bucSelect.innerHTML = '';
        const txType = document.getElementById('tx-type')?.value;
        const accountsToShow = (txType === 'INCOME' || txType === 'EXPENSE') ? app.data.accounts.filter(a => a.type === 'ASSET') : app.data.accounts;
        accountsToShow.forEach(acc => { accSelect.innerHTML += `<option value="${acc.id}" data-currency="${acc.currency}">${acc.name} (${ui.formatMoney(acc.balance, acc.currency)})</option>`; });
        bucSelect.innerHTML = '<option value="">Sin Bucket (General)</option>';
        app.data.buckets.forEach(buc => { bucSelect.innerHTML += `<option value="${buc.id}">${buc.name}</option>`; });
    },
    toggleFilters: () => { const panel = document.getElementById('filter-panel'); panel.classList.toggle('hidden'); },
    populateFilterSelects: () => { const bucketSelect = document.getElementById('filter-bucket'); const currentVal = bucketSelect.value; bucketSelect.innerHTML = '<option value="ALL">Todas</option>'; app.data.buckets.forEach(b => { bucketSelect.innerHTML += `<option value="${b.id}">${b.name}</option>`; }); bucketSelect.value = currentVal || "ALL"; },
    setFilterDate: (range) => {
        const start = document.getElementById('filter-date-start'); const end = document.getElementById('filter-date-end'); const now = new Date(); now.setHours(0, 0, 0, 0);
        let startDate = new Date(now); let endDate = new Date(now);
        if (range === 'week') { const day = now.getDay(); startDate.setDate(now.getDate() - day + (day === 0 ? -6 : 1)); endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6); }
        else if (range === 'fortnight') { if (now.getDate() <= 15) { startDate.setDate(1); endDate = new Date(now.getFullYear(), now.getMonth(), 15); } else { startDate.setDate(16); endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); } }
        else if (range === 'month') { startDate.setDate(1); endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); }
        const fmt = d => { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; };
        start.value = fmt(startDate); end.value = fmt(endDate); ui.applyFilters();
    },
    clearFilters: () => { document.getElementById('filter-search').value = ''; document.getElementById('filter-date-start').value = ''; document.getElementById('filter-date-end').value = ''; document.getElementById('filter-type').value = 'ALL'; document.getElementById('filter-bucket').value = 'ALL'; document.getElementById('filter-min').value = ''; document.getElementById('filter-max').value = ''; ui.applyFilters(); },
    applyFilters: () => {
        const filters = { search: document.getElementById('filter-search').value, start: document.getElementById('filter-date-start').value, end: document.getElementById('filter-date-end').value, type: document.getElementById('filter-type').value, bucket: document.getElementById('filter-bucket').value, min: document.getElementById('filter-min').value, max: document.getElementById('filter-max').value };
        const filteredTx = app.filterTransactions(filters); const globalCurr = localStorage.getItem('currency') || 'USD'; ui.renderTransactions(globalCurr, filteredTx);
    },
    updateModalCurrency: () => { const accSelect = document.getElementById('tx-account'); const curr = accSelect.options[accSelect.selectedIndex]?.dataset.currency; const symbols = { 'USD': '$', 'VES': 'Bs.', 'USDT': '₮' }; document.getElementById('modal-currency-symbol').innerText = symbols[curr] || '$'; },
    renderTransactions: (globalCurr, transactions = null) => {
        const tList = document.getElementById('transactions-list'); if (!tList) return;
        const dataToShow = transactions || app.data.transactions;
        const totalLabel = document.getElementById('filtered-total'); if (totalLabel) totalLabel.innerText = `${dataToShow.length} mov.`;
        if (dataToShow.length === 0) { tList.innerHTML = `<div class="p-10 text-center text-slate-400 text-sm">No hay movimientos coincidentes</div>`; return; }
        tList.innerHTML = dataToShow.map(tx => {
            const acc = app.data.accounts.find(a => a.id === tx.accountId);
            const curr = acc ? acc.currency : globalCurr;
            let color = 'text-slate-700 dark:text-slate-200'; let icon = 'fa-circle'; let bgIcon = 'bg-slate-100 dark:bg-slate-700';

            if (tx.type === 'BUCKET_XFER') {
                color = 'text-blue-500 dark:text-blue-400';
                icon = 'fa-random';
                bgIcon = 'bg-blue-100 dark:bg-blue-900/30';
                return `<div class="p-4 flex justify-between items-center group hover:bg-slate-50 dark:hover:bg-slate-800 transition"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-full ${bgIcon} flex items-center justify-center ${color}"><i class="fas ${icon}"></i></div><div><p class="font-bold text-sm text-slate-800 dark:text-slate-200">${tx.description}</p><p class="text-xs text-slate-400">${new Date(tx.date).toLocaleDateString()} • Reasignación</p></div></div><div class="flex items-center gap-3"><span class="font-bold ${color}">${ui.formatMoney(tx.amount, globalCurr)}</span><button onclick="app.deleteTransactionWrapper('${tx.id}')" class="text-slate-300 hover:text-rose-500 opacity-50 hover:opacity-100 backdrop-blur-sm hover:backdrop-blur-md transition"><i class="fas fa-trash"></i></button></div></div>`;
            }

            if (tx.type.includes('INCOME') || tx.type.includes('TRANSFER_IN')) { color = 'text-emerald-600 dark:text-emerald-400'; icon = 'fa-arrow-down'; bgIcon = 'bg-emerald-100 dark:bg-emerald-900/30'; }
            if (tx.type.includes('EXPENSE') || tx.type.includes('TRANSFER_OUT')) { color = 'text-rose-600 dark:text-rose-400'; icon = 'fa-arrow-up'; bgIcon = 'bg-rose-100 dark:bg-rose-900/30'; }
            return `<div class="p-4 flex justify-between items-center group hover:bg-slate-50 dark:hover:bg-slate-800 transition"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-full ${bgIcon} flex items-center justify-center ${color}"><i class="fas ${icon}"></i></div><div><p class="font-bold text-sm text-slate-800 dark:text-slate-200">${tx.description}</p><p class="text-xs text-slate-400">${new Date(tx.date).toLocaleDateString()} • ${acc?.name || '---'}</p></div></div><div class="flex items-center gap-3"><span class="font-bold ${color}">${tx.type.includes('EXPENSE') || tx.type.includes('OUT') ? '-' : '+'}${ui.formatMoney(tx.amount, curr)}</span><button onclick="app.deleteTransactionWrapper('${tx.id}')" class="text-slate-300 hover:text-rose-500 opacity-50 hover:opacity-100 backdrop-blur-sm hover:backdrop-blur-md transition"><i class="fas fa-trash"></i></button></div></div>`;
        }).join('');
    },
    renderList: (type, elementId) => {
        const list = document.getElementById(elementId); list.innerHTML = '';
        const items = app.data.accounts.filter(a => a.type === type);
        if (items.length === 0) {
            list.innerHTML = `<p class="text-xs text-slate-400 italic text-center">No hay registros</p>`;
            return;
        }
        items.forEach(acc => {
            let iconColor = 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300';
            let icon = 'fa-building-columns';
            let actionBtn = '';

            let datesHtml = '';
            // FECHAS SOLO SI NO ES ACTIVO
            if (type !== 'ASSET') {
                const start = new Date(acc.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
                datesHtml += `<span class="mr-2"><i class="fas fa-calendar-check mr-1"></i>${start}</span>`;

                if (acc.dueDate) {
                    const due = new Date(acc.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
                    datesHtml += `<span><i class="fas fa-flag-checkered mr-1"></i>${due}</span>`;
                }
            }

            if (type === 'LIABILITY') {
                iconColor = 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300';
                icon = 'fa-file-invoice-dollar';
                actionBtn = `<button onclick="ui.openSettleModal('${acc.id}', 'LIABILITY')" class="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-200 transition ml-2 backdrop-blur-sm hover:backdrop-blur-md"><i class="fas fa-check"></i></button>`;
            }
            else if (type === 'RECEIVABLE') {
                iconColor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300';
                icon = 'fa-hand-holding-dollar';
                actionBtn = `<button onclick="ui.openSettleModal('${acc.id}', 'RECEIVABLE')" class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-200 transition ml-2 backdrop-blur-sm hover:backdrop-blur-md"><i class="fas fa-dollar-sign"></i></button>`;
            }

            const inlineStyle = ui.getCssColor('card') ? `style="background-color: var(--color-card)"` : '';
            list.innerHTML += `
            <div class="flex justify-between items-center p-3 bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${iconColor}" ${inlineStyle}>
                        <i class="fas ${icon}"></i>
                    </div>
                    <div>
                        <p class="font-medium text-sm text-white dark:text-slate-200">${acc.name}</p>
                        <div class="flex flex-col gap-0.5">
                            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 w-fit">${acc.currency}</span>
                            <div class="text-[10px] text-slate-400 mt-1">${datesHtml}</div>
                        </div>
                    </div>
                </div>
                <div class="flex items-center">
                    <span class="font-bold ${acc.balance < 0 ? 'text-rose-500' : 'text-white dark:text-white'}">
                        ${ui.formatMoney(acc.balance, acc.currency)}
                    </span>
                    ${actionBtn}
                </div>
            </div>`;
        });
    },
    renderAll: () => {
        const globalCurr = localStorage.getItem('currency') || 'USD';
        const rateUSD = parseFloat(document.getElementById('rate-usd').value) || 1;
        const rateUSDT = parseFloat(document.getElementById('rate-usdt').value) || 1;
        const balance = app.getBalanceSheet(globalCurr, rateUSD, rateUSDT);
        document.getElementById('display-assets').innerText = ui.formatMoney(balance.assets, globalCurr);
        document.getElementById('display-liabilities').innerText = ui.formatMoney(balance.liabilities, globalCurr);
        document.getElementById('display-receivables').innerText = ui.formatMoney(balance.receivables, globalCurr);
        document.getElementById('display-equity').innerText = ui.formatMoney(balance.equity, globalCurr);
        ui.renderList('ASSET', 'list-ASSET'); ui.renderList('LIABILITY', 'list-LIABILITY'); ui.renderList('RECEIVABLE', 'list-RECEIVABLE');
        document.getElementById('buckets-list').innerHTML = app.data.buckets.map(b => `<div class="bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm"><p class="font-bold text-sm text-white dark:text-slate-200 truncate">${b.name}</p><p class="text-indigo-600 dark:text-indigo-400 font-bold mt-1">${ui.formatMoney(b.balance, globalCurr)}</p></div>`).join('');
        if (ui.currentView === 'home') { } else { ui.applyFilters(); }
    }
};
