const ui = {
    currentView: 'home',
    init: () => {
        const savedCurr = 'USD';
        document.getElementById('currency-select').value = savedCurr;
        // Default rates
        document.getElementById('rate-usd').value = 40;
        document.getElementById('rate-usdt').value = 40;

        // Fetch rates automatically
        ui.fetchUsdOfficial();
        ui.fetchUsdtParalelo();

        ui.renderAll();
        ui.switchView('home');

        document.getElementById('wishlist-edit-form').addEventListener('submit', async (event) => {
            event.preventDefault();
            const id = document.getElementById('wish-edit-id').value;
            const data = {
                product_name: document.getElementById('wish-edit-product-name').value,
                price: parseFloat(document.getElementById('wish-edit-price').value),
                currency: document.getElementById('wish-edit-currency').value,
                details: document.getElementById('wish-edit-details').value
            };
            await app.updateWishlistItem(id, data);
            ui.closeWishlistEditModal();
        });
    },
    switchView: (viewName) => {
        ui.currentView = viewName;
        const views = ['home', 'transactions', 'calculator', 'wishlist', 'budgets'];
        const navButtons = {
            'home': 'nav-btn-home',
            'transactions': 'nav-btn-transactions',
            'calculator': 'nav-btn-calculator',
            'wishlist': 'nav-btn-wishlist',
            'budgets': 'nav-btn-budgets'
        };

        views.forEach(view => {
            const el = document.getElementById(`view-${view}`);
            if (el) {
                el.classList.toggle('hidden', view !== viewName);
            }
        });

        Object.values(navButtons).forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.classList.remove('text-indigo-400', 'font-bold');
                btn.classList.add('text-slate-500');
            }
        });

        const activeBtn = document.getElementById(navButtons[viewName]);
        if (activeBtn) {
            activeBtn.classList.add('text-indigo-400', 'font-bold');
            activeBtn.classList.remove('text-slate-500');
        }

        // Special actions for specific views
        if (viewName === 'transactions') {
            ui.populateFilterSelects();
            ui.applyFilters();
        } else if (viewName === 'wishlist') {
            ui.renderWishlist();
        } else if (viewName === 'calculator') {
            ui.runCalculator();
        } else if (viewName === 'budgets') {
            ui.renderBudgets();
        }
    },
    setCurrency: (v) => { ui.renderAll(); },
    setRate: (type, val) => { ui.renderAll(); },
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

    formatCurrency: (amount, currency) => {
        const symbols = { 'USD': '$', 'VES': 'Bs.', 'USDT': '₮' };
        let formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
        return `${symbols[currency] || '$'} ${formatted}`;
    },

    getRates: () => {
        const rateUSD = parseFloat(document.getElementById('rate-usd').value) || 1;
        const rateUSDT = parseFloat(document.getElementById('rate-usdt').value) || 1;
        return { USD: rateUSD, USDT: rateUSDT };
    },

    runCalculator: () => {
        const amount = parseFloat(document.getElementById('calc-amount').value) || 0;
        const from = document.getElementById('calc-from').value;
        const to = document.getElementById('calc-to').value;
        const rates = ui.getRates();
        const resultEl = document.getElementById('calc-result');
        const rateInfoEl = document.getElementById('calc-rate-info');

        if (amount === 0) {
            resultEl.innerText = '0.00';
            rateInfoEl.innerText = '';
            return;
        }

        let result = 0;
        let rateInfo = '';

        if (from === to) {
            result = amount;
            rateInfo = '1:1';
        } else {
            // Convert 'from' amount to a base currency (USD)
            let amountInUSD;
            if (from === 'USD') amountInUSD = amount;
            else if (from === 'VES') amountInUSD = amount / rates.USD;
            else if (from === 'USDT') amountInUSD = amount * rates.USDT / rates.USD;

            // Convert from base (USD) to 'to' currency
            if (to === 'USD') {
                result = amountInUSD;
                rateInfo = `Tasa base`;
            } else if (to === 'VES') {
                result = amountInUSD * rates.USD;
                rateInfo = `1 USD = ${rates.USD.toFixed(2)} VES`;
            } else if (to === 'USDT') {
                result = amountInUSD * rates.USD / rates.USDT;
                rateInfo = `1 USD = ${(rates.USD / rates.USDT).toFixed(4)} USDT`;
            }
        }

        resultEl.innerText = result.toFixed(2);
        rateInfoEl.innerText = rateInfo;
    },

    refreshRatesAndCalculate: async () => {
        const btn = document.querySelector('#view-calculator button i.fa-sync-alt');
        if (btn) btn.classList.add('animate-spin');

        try {
            await Promise.all([
                ui.fetchUsdOfficial(),
                ui.fetchUsdtParalelo()
            ]);
            ui.runCalculator();
        } catch (error) {
            console.error('Error refreshing rates:', error);
            ui.showAlert('No se pudieron actualizar las tasas.');
        } finally {
            if (btn) btn.classList.remove('animate-spin');
        }
    },

    swapCalculatorCurrencies: () => {
        const fromSelect = document.getElementById('calc-from');
        const toSelect = document.getElementById('calc-to');
        const temp = fromSelect.value;
        fromSelect.value = toSelect.value;
        toSelect.value = temp;
        ui.runCalculator();
    },

    openWishlistEditModal: async (id) => {
        try {
            const response = await fetch(`${app.db.baseUrl}/wishlist`);
            if (!response.ok) throw new Error('Error al cargar la wishlist');
            const wishlist = await response.json();
            const item = wishlist.find(i => i.id == id);
            if (!item) {
                ui.showAlert('Artículo no encontrado');
                return;
            }
            document.getElementById('wish-edit-id').value = item.id;
            document.getElementById('wish-edit-product-name').value = item.product_name;
            document.getElementById('wish-edit-price').value = item.price;
            document.getElementById('wish-edit-currency').value = item.currency;
            document.getElementById('wish-edit-details').value = item.details;
            document.getElementById('wishlist-edit-modal').classList.remove('hidden');
        } catch (error) {
            ui.showAlert(error.message);
        }
    },

    closeWishlistEditModal: () => {
        document.getElementById('wishlist-edit-modal').classList.add('hidden');
    },

    toggleWishlistForm: (force) => {
        const container = document.getElementById('wishlist-form-container');
        if (typeof force === 'boolean') {
            container.classList.toggle('hidden', !force);
        } else {
            container.classList.toggle('hidden');
        }
    },

    openWishlistEditModal: async (id) => {
        try {
            const response = await fetch(`${app.db.baseUrl}/wishlist`);
            if (!response.ok) throw new Error('Error al cargar la wishlist');
            const wishlist = await response.json();
            const item = wishlist.find(i => i.id == id);
            if (!item) {
                ui.showAlert('Artículo no encontrado');
                return;
            }
            document.getElementById('wish-edit-id').value = item.id;
            document.getElementById('wish-edit-product-name').value = item.product_name;
            document.getElementById('wish-edit-price').value = item.price;
            document.getElementById('wish-edit-currency').value = item.currency;
            document.getElementById('wish-edit-details').value = item.details;
            document.getElementById('wishlist-edit-modal').classList.remove('hidden');
        } catch (error) {
            ui.showAlert(error.message);
        }
    },

    closeWishlistEditModal: () => {
        document.getElementById('wishlist-edit-modal').classList.add('hidden');
    },

    renderWishlist: async () => {
        const container = document.getElementById('wishlist-items');
        const rates = ui.getRates();

        try {
            const response = await fetch(`${app.db.baseUrl}/wishlist`);
            if (!response.ok) throw new Error('Error al cargar la wishlist');
            const wishlist = await response.json();

            if (wishlist.length === 0) {
                container.innerHTML = `<div class="text-center py-8 text-slate-500">No hay artículos en tu wishlist.</div>`;
                return;
            }

            container.innerHTML = wishlist.map(item => {
                let priceInVes = '';
                if (item.currency === 'USD') {
                    priceInVes = `<p class="text-xs text-slate-400">Bs. ${(item.price * rates.USD).toFixed(2)}</p>`;
                } else if (item.currency === 'USDT') {
                    priceInVes = `<p class="text-xs text-slate-400">Bs. ${(item.price * rates.USDT).toFixed(2)}</p>`;
                }

                return `
                    <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="font-bold text-slate-200">${item.product_name}</p>
                                <p class="text-sm font-mono font-bold text-indigo-400">${ui.formatCurrency(item.price, item.currency)}</p>
                                ${priceInVes}
                                <p class="text-xs text-slate-400 mt-1">${item.details || ''}</p>
                            </div>
                            <div class="flex gap-3">
                                <button onclick="ui.openWishlistEditModal('${item.id}')" class="text-indigo-400 hover:text-indigo-300"><i class="fas fa-edit"></i></button>
                                <button onclick="app.deleteWishlistItem('${item.id}')" class="text-rose-500 hover:text-rose-400"><i class="fas fa-trash"></i></button>
                            </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            container.innerHTML = `<div class="text-center py-8 text-red-500">Error: ${error.message}</div>`;
        }
    },

    formatMoney: (amount, currency) => {
        const global = document.getElementById('currency-select')?.value || 'USD';
        const target = currency || global;
        const locale = target === 'VES' ? 'es-VE' : 'en-US';
        let code = target; if (target === 'USDT') code = 'USD';
        let fmt = new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(amount);
        if (target === 'USDT') fmt = fmt.replace('$', '₮');
        return fmt;
    },
    openManager: (type, force = true) => {
        const el = document.getElementById('manage-' + type);
        el.classList.toggle('hidden', !force);
        if (!el.classList.contains('hidden')) {
            ui.renderCRUD(type);
        } else {
            const crudEl = document.getElementById('crud-list-' + type);
            if (crudEl) {
                crudEl.classList.add('hidden');
            }
        }
    },
    toggleAccountDetails: async (accountId) => {
        const detailsEl = document.getElementById(`details-${accountId}`);
        if (!detailsEl) return;

        const isHidden = detailsEl.classList.toggle('hidden');

        if (!isHidden && detailsEl.innerHTML === '') {
            detailsEl.innerHTML = `<div class="text-center text-xs p-4">Cargando...</div>`;
            try {
                const transactions = await app.getTransactionsForAccount(accountId, 5);
                ui.renderAccountDetails(accountId, transactions);
            } catch (e) {
                console.error('Error fetching account details:', e);
                detailsEl.innerHTML = `<div class="text-center text-xs p-4 text-rose-400">Error al cargar movimientos.</div>`;
            }
        }
    },
    renderAccountDetails: (accountId, transactions) => {
        const detailsEl = document.getElementById(`details-${accountId}`);
        if (!detailsEl) return;

        let transactionsHtml = '<p class="text-xs text-slate-400 italic text-center p-2">No hay movimientos recientes.</p>';

        if (transactions && transactions.length > 0) {
            transactionsHtml = transactions.map(tx => {
                const isExpense = tx.type.includes('EXPENSE') || tx.type.includes('OUT');
                const color = isExpense ? 'text-rose-400' : 'text-emerald-400';
                const sign = isExpense ? '-' : '+';
                const acc = app.data.accounts.find(a => String(a.id) === String(tx.accountId));

                return `
                    <div class="flex justify-between items-center text-xs p-1.5 rounded-md hover:bg-slate-700/50">
                        <div>
                            <p class="font-medium text-slate-300">${tx.description}</p>
                            <p class="text-slate-500">${new Date(tx.date).toLocaleDateString()}</p>
                        </div>
                        <span class="font-mono font-bold ${color}">${sign}${ui.formatMoney(tx.amount, acc.currency)}</span>
                    </div>
                `;
            }).join('');
        }

        detailsEl.innerHTML = `
            <div class="space-y-2">
                <h5 class="text-xs font-bold text-slate-400 px-1 pt-2">Últimos Movimientos</h5>
                ${transactionsHtml}
            </div>
            <div class="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-700/50">
                <button onclick="ui.openEditAccountModal(${accountId}, 'ASSET')" class="text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-300 py-1.5 px-3 rounded-md transition">
                    <i class="fas fa-edit mr-1"></i> Modificar
                </button>
                <button onclick="app.deleteAccountWrapper(${accountId}, 'ASSET')" class="text-xs font-semibold bg-rose-800/70 hover:bg-rose-800 text-white py-1.5 px-3 rounded-md transition">
                    <i class="fas fa-trash-alt mr-1"></i> Borrar
                </button>
            </div>
        `;
    },
    openEditAccountModal: (id, type) => {
        const acc = app.data.accounts.find(a => a.id === id);
        if (!acc) { ui.showAlert('Cuenta no encontrada'); return; }
        document.getElementById('edit-account-id').value = acc.id;
        document.getElementById('edit-account-type').value = type;
        document.getElementById('edit-account-name').value = acc.name;
        document.getElementById('edit-account-currency').value = acc.currency;
        document.getElementById('edit-account-balance').value = acc.balance;

        if (window.datePickers && window.datePickers['edit-account-start']) {
            window.datePickers['edit-account-start'].setValue(acc.startDate);
        }
        if (window.datePickers && window.datePickers['edit-account-due']) {
            window.datePickers['edit-account-due'].setValue(acc.dueDate);
        }

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
        let listEl = document.getElementById('crud-list-' + type);
        listEl.classList.remove('hidden');
        listEl.innerHTML = '';
        let items = type === 'BUCKET' ? app.data.buckets : app.data.accounts.filter(a => a.type === type);
        items.forEach(item => {
            listEl.innerHTML += `<div class="flex justify-between items-center glass-panel p-2 rounded"><span class="text-white">${item.name}</span><div class="flex items-center gap-2"><button onclick="${type === 'BUCKET' ? `app.editBucketWrapper('${item.id}')` : `app.editAccountWrapper('${item.id}', '${type}')`}" class="text-indigo-500 px-2 backdrop-blur-sm hover:backdrop-blur-md transition"><i class="fas fa-edit"></i></button><button onclick="${type === 'BUCKET' ? `app.deleteBucketWrapper('${item.id}')` : `app.deleteAccountWrapper('${item.id}', '${type}')`}" class="text-rose-500 px-2 backdrop-blur-sm hover:backdrop-blur-md transition"><i class="fas fa-trash-alt"></i></button></div></div>`;
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
        app.data.buckets.forEach(buc => { bucSelect.innerHTML += `<option value="${buc.id}">${buc.name}</option>`; });
    },
    toggleFilters: () => { const panel = document.getElementById('filter-panel'); panel.classList.toggle('hidden'); },
    populateFilterSelects: () => { const bucketSelect = document.getElementById('filter-bucket'); const currentVal = bucketSelect.value; bucketSelect.innerHTML = '<option value="ALL">Todas</option>'; app.data.buckets.forEach(b => { bucketSelect.innerHTML += `<option value="${b.id}">${b.name}</option>`; }); bucketSelect.value = currentVal || "ALL"; },
    setFilterDate: (range) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        let startDate = new Date(now);
        let endDate = new Date(now);

        if (range === 'week') {
            const day = now.getDay();
            startDate.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
        } else if (range === 'fortnight') {
            if (now.getDate() <= 15) {
                startDate.setDate(1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 15);
            } else {
                startDate.setDate(16);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }
        } else if (range === 'month') {
            startDate.setDate(1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        const fmt = d => d.toISOString().split('T')[0];

        if (window.datePickers && window.datePickers['filter-start']) {
            window.datePickers['filter-start'].setValue(fmt(startDate));
        }
        if (window.datePickers && window.datePickers['filter-end']) {
            window.datePickers['filter-end'].setValue(fmt(endDate));
        }

        ui.applyFilters();
    },
    clearFilters: () => {
        document.getElementById('filter-search').value = '';
        if (window.datePickers && window.datePickers['filter-start']) {
            window.datePickers['filter-start'].setValue('');
        }
        if (window.datePickers && window.datePickers['filter-end']) {
            window.datePickers['filter-end'].setValue('');
        }
        document.getElementById('filter-type').value = 'ALL';
        document.getElementById('filter-bucket').value = 'ALL';
        document.getElementById('filter-min').value = '';
        document.getElementById('filter-max').value = '';
        ui.applyFilters();
    },
    applyFilters: () => {
        const filters = {
            search: document.getElementById('filter-search').value,
            start: document.getElementById('filter-start')?.dataset.isoDate,
            end: document.getElementById('filter-end')?.dataset.isoDate,
            type: document.getElementById('filter-type').value,
            bucket: document.getElementById('filter-bucket').value,
            min: document.getElementById('filter-min').value,
            max: document.getElementById('filter-max').value
        };
        const filteredTx = app.filterTransactions(filters);
        const globalCurr = document.getElementById('currency-select')?.value || 'USD';
        ui.renderTransactions(globalCurr, filteredTx);
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
        const list = document.getElementById(elementId);
        list.innerHTML = '';
        const items = app.data.accounts.filter(a => {
            if (a.type !== type) return false;
            if (type !== 'ASSET' && Math.abs(a.balance) < 0.009) return false;
            return true;
        });

        if (items.length === 0) {
            list.innerHTML = `<p class="text-xs text-slate-400 italic text-center">No hay registros</p>`;
            return;
        }

        list.innerHTML = items.map(acc => {
            let iconColor = 'bg-slate-800 text-slate-400';
            let icon = 'fa-wallet';
            let borderColor = 'border-slate-700';

            if (type === 'ASSET') {
                if (acc.currency === 'USD') {
                    iconColor = 'bg-blue-500/20 text-blue-400';
                    icon = 'fa-dollar-sign';
                    borderColor = 'border-blue-500/30';
                } else if (acc.currency === 'VES') {
                    iconColor = 'bg-indigo-500/20 text-indigo-400';
                    icon = 'fa-money-bill-wave';
                    borderColor = 'border-indigo-500/30';
                } else if (acc.currency === 'USDT') {
                    iconColor = 'bg-emerald-500/20 text-emerald-400';
                    icon = 'fa-coins';
                    borderColor = 'border-emerald-500/30';
                }
            } else if (type === 'LIABILITY') {
                iconColor = 'bg-rose-500/20 text-rose-400';
                icon = 'fa-file-invoice-dollar';
                borderColor = 'border-rose-500/30';
            } else if (type === 'RECEIVABLE') {
                iconColor = 'bg-emerald-500/20 text-emerald-400';
                icon = 'fa-hand-holding-dollar';
                borderColor = 'border-emerald-500/30';
            }

            let datesHtml = '';
            if (type !== 'ASSET') {
                const start = new Date(acc.startDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
                datesHtml += `<span class="mr-2"><i class="fas fa-calendar-check mr-1"></i>${start}</span>`;
                if (acc.dueDate) {
                    const due = new Date(acc.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
                    datesHtml += `<span><i class="fas fa-flag-checkered mr-1"></i>${due}</span>`;
                }
            }

            let actionBtn = '';
            if (type === 'LIABILITY') {
                actionBtn = `<button onclick="ui.openSettleModal('${acc.id}', 'LIABILITY')" class="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500/30 transition ml-2 backdrop-blur-sm"><i class="fas fa-check"></i></button>`;
            } else if (type === 'RECEIVABLE') {
                actionBtn = `<button onclick="ui.openSettleModal('${acc.id}', 'RECEIVABLE')" class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 transition ml-2 backdrop-blur-sm"><i class="fas fa-dollar-sign"></i></button>`;
            }

            if (type === 'ASSET') {
                return `
                    <div>
                        <div class="flex justify-between items-center p-3 bg-slate-800/50 border ${borderColor} rounded-xl shadow-sm hover:bg-slate-800 transition-colors cursor-pointer" onclick="ui.toggleAccountDetails('${acc.id}')">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full flex items-center justify-center ${iconColor}">
                                    <i class="fas ${icon}"></i>
                                </div>
                                <div>
                                    <p class="font-medium text-sm text-white dark:text-slate-200">${acc.name}</p>
                                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 w-fit">${acc.currency}</span>
                                </div>
                            </div>
                            <span class="font-bold ${acc.balance < 0 ? 'text-rose-500' : 'text-white dark:text-white'}">
                                ${ui.formatMoney(acc.balance, acc.currency)}
                            </span>
                        </div>
                        <div id="details-${acc.id}" class="hidden p-3 bg-slate-800/50 border ${borderColor} rounded-b-xl shadow-sm -mt-2"></div>
                    </div>
                `;
            } else {
                return `
                <div class="flex justify-between items-center p-3 bg-slate-800/50 border ${borderColor} rounded-xl shadow-sm hover:bg-slate-800 transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center ${iconColor}">
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
            }
        }).join('');
    },
    renderAll: () => {
        const globalCurr = document.getElementById('currency-select')?.value || 'USD';
        const rateUSD = parseFloat(document.getElementById('rate-usd').value) || 1;
        const rateUSDT = parseFloat(document.getElementById('rate-usdt').value) || 1;
        const balance = app.getBalanceSheet(globalCurr, rateUSD, rateUSDT);
        document.getElementById('display-assets').innerText = ui.formatMoney(balance.assets, globalCurr);
        document.getElementById('display-liabilities').innerText = ui.formatMoney(balance.liabilities, globalCurr);
        document.getElementById('display-receivables').innerText = ui.formatMoney(balance.receivables, globalCurr);
        document.getElementById('display-equity').innerText = ui.formatMoney(balance.equity, globalCurr);
        ui.renderList('ASSET', 'list-ASSET'); ui.renderList('LIABILITY', 'list-LIABILITY'); ui.renderList('RECEIVABLE', 'list-RECEIVABLE');
        // document.getElementById('buckets-list').innerHTML = app.data.buckets.map(b => `<div class="bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm"><p class="font-bold text-sm text-white dark:text-slate-200 truncate">${b.name}</p><p class="text-indigo-600 dark:text-indigo-400 font-bold mt-1">${ui.formatMoney(b.balance, globalCurr)}</p></div>`).join('');
        if (ui.currentView === 'home') { } else { ui.applyFilters(); }
    },
    renderBudgets: () => {
        const globalCurr = document.getElementById('currency-select')?.value || 'USD';
        const listEl = document.getElementById('buckets-list');
        if (!listEl) return;

        const buckets = app.data.buckets;

        if (!buckets || buckets.length === 0) {
            listEl.innerHTML = `<div class="col-span-2 text-center py-8 text-slate-500">No hay buckets definidos.</div>`;
            return;
        }
        
        listEl.innerHTML = buckets.map(b => {
            return `
            <div class="glass-panel p-4 rounded-2xl flex flex-col justify-between border border-white/5">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-bold text-white truncate">${b.name}</p>
                        <p class="text-xs text-slate-400">Disponible</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="ui.openEditBucketModal(${b.id})" class="text-slate-400 hover:text-indigo-400 transition-colors"><i class="fas fa-edit text-xs"></i></button>
                        <button onclick="app.deleteBucketWrapper(${b.id})" class="text-slate-400 hover:text-rose-400 transition-colors"><i class="fas fa-trash text-xs"></i></button>
                    </div>
                </div>
                <div class="text-right mt-4">
                    <p class="text-indigo-400 font-mono font-bold text-lg">${ui.formatMoney(b.balance, globalCurr)}</p>
                </div>
            </div>
            `;
        }).join('');
    }
};
