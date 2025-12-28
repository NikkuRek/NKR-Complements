class Database {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.data = { accounts: [], buckets: [], transactions: [] };
    }

    async init() {
        await this.refresh();
        return this.data;
    }

    load() { return this.data; }

    async refresh() {
        try {
            const [aRes, bRes, tRes] = await Promise.all([
                fetch(`${this.baseUrl}/accounts`),
                fetch(`${this.baseUrl}/buckets`),
                fetch(`${this.baseUrl}/transactions`)
            ]);

            if (!aRes.ok || !bRes.ok || !tRes.ok) throw new Error('Failed to fetch data');

            const [accounts, buckets, transactions] = await Promise.all([aRes.json(), bRes.json(), tRes.json()]);

            this.data.accounts = accounts.map(a => ({
                id: a.id.toString(),
                name: a.name,
                type: a.type,
                currency: a.currency,
                balance: parseFloat(a.balance || 0),
                startDate: a.start_date || null,
                dueDate: a.due_date || null
            }));

            this.data.buckets = buckets.map(b => ({
                id: b.id.toString(),
                name: b.name,
                balance: parseFloat(b.balance || 0)
            }));

            this.data.transactions = transactions.map(t => ({
                id: t.id.toString(),
                date: t.date,
                amount: parseFloat(t.amount),
                type: t.type.toUpperCase(),
                accountId: t.account_id ? t.account_id.toString() : null,
                bucketId: t.bucket_id ? t.bucket_id.toString() : null,
                description: t.description
            }));

            return this.data;
        } catch (err) {
            console.error('Error refreshing data:', err);
            // In a real app we might want to handle this gracefully in UI
            throw err;
        }
    }

    // ACCOUNTS
    async createAccount(payload) {
        const res = await fetch(`${this.baseUrl}/accounts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Error creando cuenta');
        const json = await res.json();
        await this.refresh();
        return this.data.accounts.find(a => a.id === String(json.id));
    }

    async updateAccount(id, payload) {
        const res = await fetch(`${this.baseUrl}/accounts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Error actualizando cuenta');
        await this.refresh();
        return this.data.accounts.find(a => a.id === String(id));
    }

    async deleteAccount(id) {
        const res = await fetch(`${this.baseUrl}/accounts/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error eliminando cuenta');
        await this.refresh();
        return true;
    }

    // BUCKETS
    async createBucket(payload) {
        const res = await fetch(`${this.baseUrl}/buckets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Error creando bucket');
        const json = await res.json();
        await this.refresh();
        return this.data.buckets.find(b => b.id === String(json.id));
    }

    async updateBucket(id, payload) {
        const res = await fetch(`${this.baseUrl}/buckets/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Error actualizando bucket');
        await this.refresh();
        return this.data.buckets.find(b => b.id === String(id));
    }

    async deleteBucket(id) {
        const res = await fetch(`${this.baseUrl}/buckets/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error eliminando bucket');
        await this.refresh();
        return true;
    }

    // TRANSACTIONS
    async createTransaction(payload) {
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
        const res = await fetch(`${this.baseUrl}/transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Error actualizando transacción');
        await this.refresh();
        return this.data.transactions.find(t => t.id === String(id));
    }

    async deleteTransaction(id) {
        const res = await fetch(`${this.baseUrl}/transactions/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error eliminando transacción');
        await this.refresh();
        return true;
    }
}
