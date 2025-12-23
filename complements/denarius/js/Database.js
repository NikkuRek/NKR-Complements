const DB_CONFIG = {
    KEY: 'denarius_db',
    INITIAL_DATA: {
        accounts: [
            { id: '1', name: 'Banco', type: 'ASSET', currency: 'VES', balance: 30000},
            { id: '2', name: 'Efectivo Bs', type: 'ASSET', currency: 'VES', balance: 5000 },
            { id: '3', name: 'Binance', type: 'ASSET', currency: 'USDT', balance: 50 },
            { id: '4', name: 'Brownies', type: 'LIABILITY', currency: 'VES', balance: -500, startDate: new Date().toISOString(), dueDate: null },
            { id: '5', name: 'Torta Quesillo', type: 'RECEIVABLE', currency: 'VES', balance: 670, startDate: new Date().toISOString(), dueDate: '2024-12-12' }
        ],
        buckets: [{ id: '1', name: 'General', balance: 100 }, { id: '2', name: 'Ocio', balance: 100 }],
        transactions: [
            { id: 1, date: new Date().toISOString(), amount: 15.00, type: 'EXPENSE', accountId: 2, bucketId: 2, description: 'Suscripción Netflix' }
        ]
    }
};

class Database {
    constructor(baseUrl = '/api') {
        this.key = DB_CONFIG.KEY;
        this.baseUrl = baseUrl;
        this.data = JSON.parse(JSON.stringify(DB_CONFIG.INITIAL_DATA));
        this.online = true;
    }

    // Inicialización asíncrona: intenta cargar desde API; si falla cae a localStorage
    async init() {
        try {
            const [aRes, bRes, tRes] = await Promise.all([
                fetch(`${this.baseUrl}/accounts`),
                fetch(`${this.baseUrl}/buckets`),
                fetch(`${this.baseUrl}/transactions`)
            ]);

            if (aRes.ok && bRes.ok && tRes.ok) {
                const [accounts, buckets, transactions] = await Promise.all([aRes.json(), bRes.json(), tRes.json()]);
                // Normalizar nombres de campos a los que usa la app
                this.data.accounts = accounts.map(a => ({ id: a.id.toString(), name: a.name, type: a.type, currency: a.currency, balance: parseFloat(a.balance || 0), startDate: a.start_date || null, dueDate: a.due_date || null }));
                this.data.buckets = buckets.map(b => ({ id: b.id.toString(), name: b.name, balance: parseFloat(b.balance || 0) }));
                this.data.transactions = transactions.map(t => ({ id: t.id.toString(), date: t.date, amount: parseFloat(t.amount), type: t.type.toUpperCase(), accountId: t.account_id ? t.account_id.toString() : null, bucketId: t.bucket_id ? t.bucket_id.toString() : null, description: t.description }));
                this.online = true;
            } else {
                this._loadFromLocal();
                this.online = false;
            }
        } catch (err) {
            console.warn('API no disponible, usando datos locales', err);
            this._loadFromLocal();
            this.online = false;
        }
        return this.data;
    }

    _loadFromLocal() {
        const stored = localStorage.getItem(this.key);
        if (stored) this.data = JSON.parse(stored);
        else this.data = JSON.parse(JSON.stringify(DB_CONFIG.INITIAL_DATA));
    }

    load() { return this.data; }

    // Guarda: intenta sincronizar por /api/sync; si falla guarda localmente
    async save(data) {
        if (!this.online) {
            localStorage.setItem(this.key, JSON.stringify(data));
            return;
        }
        try {
            const res = await fetch(`${this.baseUrl}/sync`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Sync failed');
        } catch (err) {
            console.error('Sync failed, guardando localmente', err);
            localStorage.setItem(this.key, JSON.stringify(data));
        }
    }

    async reset() {
        // Si hay endpoint reset implementado podríamos llamarlo; por ahora limpiamos local y forzamos recarga
        localStorage.removeItem(this.key);
        try { await fetch(`${this.baseUrl}/sync`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(DB_CONFIG.INITIAL_DATA) }); } catch(e) { /* ignore */ }
        location.reload();
    }

    async refresh() {
        try {
            const [aRes, bRes, tRes] = await Promise.all([
                fetch(`${this.baseUrl}/accounts`),
                fetch(`${this.baseUrl}/buckets`),
                fetch(`${this.baseUrl}/transactions`)
            ]);
            if (aRes.ok && bRes.ok && tRes.ok) {
                const [accounts, buckets, transactions] = await Promise.all([aRes.json(), bRes.json(), tRes.json()]);
                this.data.accounts = accounts.map(a => ({ id: a.id.toString(), name: a.name, type: a.type, currency: a.currency, balance: parseFloat(a.balance || 0), startDate: a.start_date || null, dueDate: a.due_date || null }));
                this.data.buckets = buckets.map(b => ({ id: b.id.toString(), name: b.name, balance: parseFloat(b.balance || 0) }));
                this.data.transactions = transactions.map(t => ({ id: t.id.toString(), date: t.date, amount: parseFloat(t.amount), type: t.type.toUpperCase(), accountId: t.account_id ? t.account_id.toString() : null, bucketId: t.bucket_id ? t.bucket_id.toString() : null, description: t.description }));
                this.online = true;
                return this.data;
            }
        } catch (err) {
            console.warn('Refresh failed, switching to offline mode', err);
            this.online = false;
            this._loadFromLocal();
            return this.data;
        }
    }

    // ACCOUNTS CRUD
    async createAccount(payload) {
        if (!this.online) {
            const newId = Date.now();
            const acc = { id: String(newId), name: payload.name, type: payload.type, currency: payload.currency || 'USD', balance: parseFloat(payload.balance || 0), startDate: payload.start_date || null, dueDate: payload.due_date || null };
            this.data.accounts.push(acc);
            await this.save(this.data);
            return acc;
        }
        const res = await fetch(`${this.baseUrl}/accounts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Error creando cuenta');
        const json = await res.json();
        await this.refresh();
        return this.data.accounts.find(a => a.id === String(json.id));
    }

    async updateAccount(id, payload) {
        if (!this.online) {
            const acc = this.data.accounts.find(a => a.id === String(id));
            if (!acc) throw new Error('Cuenta no encontrada');
            acc.name = payload.name || acc.name; acc.currency = payload.currency || acc.currency; acc.balance = typeof payload.balance !== 'undefined' ? parseFloat(payload.balance) : acc.balance; acc.startDate = payload.start_date || acc.startDate; acc.dueDate = payload.due_date || acc.dueDate;
            await this.save(this.data);
            return acc;
        }
        const res = await fetch(`${this.baseUrl}/accounts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Error actualizando cuenta');
        await this.refresh();
        return this.data.accounts.find(a => a.id === String(id));
    }

    async deleteAccount(id) {
        if (!this.online) {
            this.data.accounts = this.data.accounts.filter(a => a.id !== String(id));
            await this.save(this.data);
            return true;
        }
        const res = await fetch(`${this.baseUrl}/accounts/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error eliminando cuenta');
        await this.refresh();
        return true;
    }

    // BUCKETS CRUD
    async createBucket(payload) {
        if (!this.online) {
            const newId = Date.now();
            const b = { id: String(newId), name: payload.name, balance: parseFloat(payload.balance || 0) };
            this.data.buckets.push(b);
            await this.save(this.data);
            return b;
        }
        const res = await fetch(`${this.baseUrl}/buckets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Error creando bucket');
        const json = await res.json();
        await this.refresh();
        return this.data.buckets.find(b => b.id === String(json.id));
    }

    async updateBucket(id, payload) {
        if (!this.online) {
            const b = this.data.buckets.find(x => x.id === String(id));
            if (!b) throw new Error('Bucket no encontrado');
            b.name = payload.name || b.name; b.balance = typeof payload.balance !== 'undefined' ? parseFloat(payload.balance) : b.balance;
            await this.save(this.data);
            return b;
        }
        const res = await fetch(`${this.baseUrl}/buckets/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Error actualizando bucket');
        await this.refresh();
        return this.data.buckets.find(b => b.id === String(id));
    }

    async deleteBucket(id) {
        if (!this.online) {
            this.data.buckets = this.data.buckets.filter(b => b.id !== String(id));
            await this.save(this.data);
            return true;
        }
        const res = await fetch(`${this.baseUrl}/buckets/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error eliminando bucket');
        await this.refresh();
        return true;
    }

    // TRANSACTIONS CRUD
    async createTransaction(payload) {
        if (!this.online) {
            const newId = Date.now();
            const tx = { id: String(newId), date: payload.date || new Date().toISOString(), amount: parseFloat(payload.amount), type: payload.type, accountId: payload.account_id ? String(payload.account_id) : null, bucketId: payload.bucket_id ? String(payload.bucket_id) : null, description: payload.description };
            this.data.transactions.unshift(tx);
            await this.save(this.data);
            return tx;
        }
        const res = await fetch(`${this.baseUrl}/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error('Error creando transacción: ' + txt);
        }
        const json = await res.json();
        await this.refresh();
        return this.data.transactions.find(t => t.id === String(json.id));
    }

    async updateTransaction(id, payload) {
        if (!this.online) {
            const tx = this.data.transactions.find(t => t.id === String(id));
            if (!tx) throw new Error('Transacción no encontrada');
            tx.date = payload.date || tx.date; tx.amount = typeof payload.amount !== 'undefined' ? parseFloat(payload.amount) : tx.amount; tx.type = payload.type || tx.type; tx.accountId = payload.account_id ? String(payload.account_id) : tx.accountId; tx.bucketId = payload.bucket_id ? String(payload.bucket_id) : tx.bucketId; tx.description = payload.description || tx.description;
            await this.save(this.data);
            return tx;
        }
        const res = await fetch(`${this.baseUrl}/transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Error actualizando transacción');
        await this.refresh();
        return this.data.transactions.find(t => t.id === String(id));
    }

    async deleteTransaction(id) {
        if (!this.online) {
            this.data.transactions = this.data.transactions.filter(t => t.id !== String(id));
            await this.save(this.data);
            return true;
        }
        const res = await fetch(`${this.baseUrl}/transactions/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error eliminando transacción');
        await this.refresh();
        return true;
    }
}

