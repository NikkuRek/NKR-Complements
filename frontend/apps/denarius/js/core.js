class denarius {
    constructor(db) {
        this.db = db;
        this.data = this.db.load();
        this.onUpdate = null; // Callback for updates
    }



    async createAccount(name, type, currency, initialBalance = 0, startDate = null, dueDate = null) {
        const payload = { name, type, currency, balance: 0, start_date: startDate || null, due_date: dueDate || null };
        const created = await this.db.createAccount(payload);
        if (initialBalance && initialBalance > 0) {
            let txType = 'INCOME';
            if (type === 'LIABILITY') txType = 'EXPENSE';
            await this.addTransaction(initialBalance, txType, created.id, null, 'Saldo Inicial');
        } else {
            // refresh local cache
            await this.db.refresh();
            this.data = this.db.load();
            if (this.onUpdate) this.onUpdate();
        }
    }

    async deleteAccount(id) {
        await this.db.deleteAccount(id);
        await this.db.refresh();
        this.data = this.db.load();
        if (this.onUpdate) this.onUpdate();
    }

    async createBucket(name, initialBalance = 0) {
        const created = await this.db.createBucket({ name, balance: 0 });
        if (initialBalance && initialBalance > 0) {
            // Create an initial transaction that will adjust bucket balance via triggers
            await this.addTransaction(parseFloat(initialBalance), 'INCOME', null, created.id, 'Fondo Inicial');
        } else {
            await this.db.refresh();
            this.data = this.db.load();
            if (this.onUpdate) this.onUpdate();
        }
    }

    async deleteBucket(id) {
        await this.db.deleteBucket(id);
        await this.db.refresh();
        this.data = this.db.load();
        if (this.onUpdate) this.onUpdate();
    }

    async updateAccount(id, values) {
        await this.db.updateAccount(id, values);
        await this.db.refresh();
        this.data = this.db.load();
        if (this.onUpdate) this.onUpdate();
    }

    async updateBucket(id, values) {
        await this.db.updateBucket(id, values);
        await this.db.refresh();
        this.data = this.db.load();
        if (this.onUpdate) this.onUpdate();
    }

    async addTransaction(amount, type, accountId, bucketId, description) {
        amount = parseFloat(amount);
        // Validation: for INCOME or EXPENSE the account must be of type 'ASSET'
        if ((type === 'INCOME' || type === 'EXPENSE') && accountId) {
            const account = this.data.accounts.find(a => a.id === String(accountId));
            if (!account || account.type !== 'ASSET') { ui.showAlert('Para ingresos/egresos, seleccione una cuenta de tipo ASSET.'); return; }
        }

        // Call backend to create transaction; DB triggers will update balances server-side
        await this.db.createTransaction({ date: new Date().toISOString(), amount, type, account_id: accountId ? parseInt(accountId) : null, bucket_id: bucketId ? parseInt(bucketId) : null, source_bucket_id: null, description });

        // Refresh local cache
        await this.db.refresh();
        this.data = this.db.load();
        if (this.onUpdate) this.onUpdate();
    }

    async deleteTransaction(id) {
        await this.db.deleteTransaction(id);
        await this.db.refresh();
        this.data = this.db.load();
        if (this.onUpdate) this.onUpdate();
    }

    async executeSettle(event) {
        event.preventDefault();
        const accId = document.getElementById('settle-id').value;
        const type = document.getElementById('settle-type').value;
        const relatedAccId = document.getElementById('settle-source').value;
        const amount = parseFloat(document.getElementById('settle-amount').value);

        if (!amount || amount <= 0) { ui.showAlert("Monto inválido"); return; }

        const mainAcc = this.data.accounts.find(a => a.id === accId);
        const relatedAcc = this.data.accounts.find(a => a.id === relatedAccId);

        const rateUSD = parseFloat(document.getElementById('rate-usd').value) || 1;
        const rateUSDT = parseFloat(document.getElementById('rate-usdt').value) || 1;

        let relatedAmount = amount;

        if (mainAcc.currency !== relatedAcc.currency) {
            const s = relatedAcc.currency;
            const t = mainAcc.currency;

            if (t === 'USD' && s === 'VES') relatedAmount = amount * rateUSD;
            else if (t === 'USDT' && s === 'VES') relatedAmount = amount * rateUSDT;
            else if (t === 'VES' && s === 'USD') relatedAmount = amount / rateUSD;
            else if (t === 'VES' && s === 'USDT') relatedAmount = amount / rateUSDT;
            else if (t === 'USD' && s === 'USDT') relatedAmount = amount;
            else if (t === 'USDT' && s === 'USD') relatedAmount = amount;
        }

        if (type === 'LIABILITY') {
            if (!relatedAcc) { ui.showAlert('Cuenta origen inválida'); return; }
            await this.addTransaction(relatedAmount, 'EXPENSE', relatedAccId, null, `Pago a ${mainAcc.name}`);

            // Update liability balance (Debt is negative, paying adds to it towards 0)
            mainAcc.balance += amount;
            await this.updateAccount(mainAcc.id, { balance: mainAcc.balance });
        } else {
            if (!relatedAcc) { ui.showAlert('Cuenta destino inválida'); return; }
            await this.addTransaction(relatedAmount, 'INCOME', relatedAccId, null, `Cobro de ${mainAcc.name}`);

            // Update receivable balance (Positive, collecting reduces it)
            mainAcc.balance -= amount;
            await this.updateAccount(mainAcc.id, { balance: mainAcc.balance });
        }

        document.getElementById('settle-modal').classList.add('hidden');
    }

    async executeTransfer(event) {
        event.preventDefault();
        const sourceId = document.getElementById('t-source').value;
        const targetId = document.getElementById('t-target').value;
        const amount = parseFloat(document.getElementById('t-amount').value);
        if (sourceId === targetId || !amount) return;
        const sourceAcc = this.data.accounts.find(a => a.id === sourceId);
        const targetAcc = this.data.accounts.find(a => a.id === targetId);
        const rateUSD = parseFloat(document.getElementById('rate-usd').value) || 1;
        const rateUSDT = parseFloat(document.getElementById('rate-usdt').value) || 1;
        let finalAmount = amount;
        if (sourceAcc.currency !== targetAcc.currency) {
            const s = sourceAcc.currency; const t = targetAcc.currency;
            if (s === 'USD' && t === 'VES') finalAmount = amount * rateUSD;
            else if (s === 'USDT' && t === 'VES') finalAmount = amount * rateUSDT;
            else if (s === 'VES' && t === 'USD') finalAmount = amount / rateUSD;
            else if (s === 'VES' && t === 'USDT') finalAmount = amount / rateUSDT;
            else if (s === 'USD' && t === 'USDT') finalAmount = (amount * rateUSD) / rateUSDT;
            else if (s === 'USDT' && t === 'USD') finalAmount = (amount * rateUSDT) / rateUSD;
        }
        await this.addTransaction(amount, 'TRANSFER_OUT', sourceId, null, `Transferencia a ${targetAcc.name}`);
        await this.addTransaction(finalAmount, 'TRANSFER_IN', targetId, null, `Recibido de ${sourceAcc.name}`);
        document.getElementById('transfer-modal').classList.add('hidden');
        document.getElementById('t-amount').value = '';
    }

    async executeBucketTransfer(event) {
        event.preventDefault();
        const sourceId = document.getElementById('bt-source').value;
        const targetId = document.getElementById('bt-target').value;
        const amount = parseFloat(document.getElementById('bt-amount').value);
        if (sourceId === targetId || !amount || amount <= 0) { ui.showAlert("Datos inválidos"); return; }
        // Use a transaction of type 'bucket_move' to let DB triggers update both buckets
        await this.db.createTransaction({ date: new Date().toISOString(), amount, type: 'bucket_move', account_id: null, bucket_id: parseInt(targetId), source_bucket_id: parseInt(sourceId), description: `Reasignación: ${sourceId} ➝ ${targetId}` });
        await this.db.refresh();
        this.data = this.db.load();
        if (this.onUpdate) this.onUpdate();
        document.getElementById('bucket-transfer-modal').classList.add('hidden');
        document.getElementById('bt-amount').value = '';
    }

    getBalanceSheet(globalCurrency, rateUSD, rateUSDT) {
        const convert = (amount, currency) => {
            if (currency === globalCurrency) return amount;
            if (globalCurrency === 'VES') { if (currency === 'USD') return amount * rateUSD; if (currency === 'USDT') return amount * rateUSDT; }
            if (globalCurrency === 'USD') { if (currency === 'VES') return amount / rateUSD; if (currency === 'USDT') return (amount * rateUSDT) / rateUSD; }
            if (globalCurrency === 'USDT') { if (currency === 'VES') return amount / rateUSDT; if (currency === 'USD') return (amount * rateUSD) / rateUSDT; }
            return amount;
        };
        let assets = 0, liabilities = 0, receivables = 0;
        this.data.accounts.forEach(acc => {
            const val = convert(acc.balance, acc.currency);
            if (acc.type === 'ASSET') assets += val;
            else if (acc.type === 'LIABILITY') liabilities += Math.abs(val);
            else if (acc.type === 'RECEIVABLE') receivables += Math.abs(val);
        });
        const equity = assets + receivables - liabilities;
        return { assets, liabilities, receivables, equity };
    }

    async addWishlistItem() {
        const product_name = document.getElementById('wish-product-name').value;
        const price = parseFloat(document.getElementById('wish-price').value);
        const currency = document.getElementById('wish-currency').value;
        const details = document.getElementById('wish-details').value;

        if (!product_name || !price) {
            ui.showMessageModal('Error', 'El nombre y el precio son obligatorios.');
            return;
        }

        try {
            const response = await fetch(`${this.db.baseUrl}/wishlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_name, price, currency, details })
            });
            if (!response.ok) throw new Error('Error al guardar el artículo');

            document.getElementById('wish-product-name').value = '';
            document.getElementById('wish-price').value = '';
            document.getElementById('wish-currency').value = 'USD';
            document.getElementById('wish-details').value = '';
            ui.toggleWishlistForm(false);

            ui.renderWishlist();
        } catch (error) {
            ui.showMessageModal('Error', error.message);
        }
    }

    async updateWishlistItem(id, data) {
        try {
            const response = await fetch(`${this.db.baseUrl}/wishlist/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Error al actualizar el artículo');
            ui.renderWishlist(); // Re-render to show changes
        } catch (error) {
            ui.showMessageModal('Error', error.message);
        }
    }

    async deleteWishlistItem(id) {
        try {
            const response = await fetch(`${this.db.baseUrl}/wishlist/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Error al eliminar el artículo');
            ui.renderWishlist();
        } catch (error) {
            ui.showMessageModal('Error', error.message);
        }
    }

    filterTransactions(filters) {
        return this.data.transactions.filter(tx => {
            if (filters.search && !tx.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
            const txDate = new Date(tx.date);
            if (filters.start) { const [y, m, d] = filters.start.split('-').map(Number); if (txDate < new Date(y, m - 1, d)) return false; }
            if (filters.end) { const [y, m, d] = filters.end.split('-').map(Number); const ed = new Date(y, m - 1, d); ed.setHours(23, 59, 59, 999); if (txDate > ed) return false; }
            if (filters.type !== 'ALL') {
                if (filters.type === 'INCOME' && !(tx.type.includes('INCOME') || tx.type.includes('TRANSFER_IN'))) return false;
                if (filters.type === 'EXPENSE' && !(tx.type.includes('EXPENSE') || tx.type.includes('TRANSFER_OUT'))) return false;
            }
            if (filters.bucket !== 'ALL') if (tx.bucketId !== filters.bucket) return false;
            if (filters.min && tx.amount < parseFloat(filters.min)) return false;
            if (filters.max && tx.amount > parseFloat(filters.max)) return false;
            return true;
        });
    }
}
