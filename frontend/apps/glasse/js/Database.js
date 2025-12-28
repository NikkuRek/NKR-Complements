
const GLASSE_DB_CONFIG = {
    KEY: 'glasse_db',
    INITIAL_DATA: {
        cakes: [
            { id: '1', name: 'Tres Leches', stock: 10, price: 5.0, imageColor: 'bg-pink-500', reservations: [], credits: [] },
        ],
        history: []
    }
};

class Database {
    constructor(baseUrl = 'http://localhost:3001/api') {
        this.key = GLASSE_DB_CONFIG.KEY;
        this.baseUrl = baseUrl;
        this.data = JSON.parse(JSON.stringify(GLASSE_DB_CONFIG.INITIAL_DATA));
        this.online = true;
    }

    async init() {
        try {
            const [cRes, hRes] = await Promise.all([
                fetch(`${this.baseUrl}/cakes`),
                fetch(`${this.baseUrl}/history`)
            ]);

            if (cRes.ok && hRes.ok) {
                const [cakes, history] = await Promise.all([cRes.json(), hRes.json()]);
                this.data.cakes = cakes.map(c => ({
                    id: String(c.id),
                    name: c.name,
                    stock: parseInt(c.stock),
                    price: parseFloat(c.price),
                    imageColor: c.image_color,
                    reservations: (typeof c.reservations === 'string' ? JSON.parse(c.reservations) : c.reservations) || [],
                    credits: (typeof c.credits === 'string' ? JSON.parse(c.credits) : c.credits) || []
                }));
                this.data.history = history.map(h => ({
                    id: String(h.id),
                    cakeId: String(h.cake_id),
                    type: h.type,
                    amount: parseInt(h.amount),
                    date: h.date,
                    description: h.description,
                    clientName: h.client_name,
                    cakeName: h.cake_name
                }));
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
        else this.data = JSON.parse(JSON.stringify(GLASSE_DB_CONFIG.INITIAL_DATA));
    }

    load() { return this.data; }

    async save(data) {
        if (!this.online) {
            localStorage.setItem(this.key, JSON.stringify(data));
        }
    }

    async refresh() {
        // Reuse init logic for refresh is easiest
        return this.init();
    }

    // CAKES CRUD
    async createCake(payload) {
        if (!this.online) {
            const newId = String(Date.now());
            const cake = {
                id: newId,
                name: payload.name,
                stock: parseInt(payload.stock),
                price: parseFloat(payload.price || 0),
                imageColor: payload.imageColor || 'bg-pink-500',
                reservations: [],
                credits: []
            };
            this.data.cakes.push(cake);
            await this.save(this.data);
            return cake;
        }

        // Ensure camelCase to snake_case mapping is handled by the backend receiving generic payload 
        // or we map it here. My backend expects reservations, credits, imageColor.

        const res = await fetch(`${this.baseUrl}/cakes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Error creando torta');
        await this.refresh();
        const json = await res.json();
        return this.data.cakes.find(c => c.id === String(json.id));
    }

    async updateCake(id, payload) {
        if (!this.online) {
            const cake = this.data.cakes.find(c => c.id === String(id));
            if (!cake) throw new Error('Torta no encontrada');
            Object.assign(cake, payload);
            await this.save(this.data);
            return cake;
        }
        const res = await fetch(`${this.baseUrl}/cakes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Error actualizando torta');
        await this.refresh();
        return this.data.cakes.find(c => c.id === String(id));
    }

    async deleteCake(id) {
        if (!this.online) {
            this.data.cakes = this.data.cakes.filter(c => c.id !== String(id));
            await this.save(this.data);
            return true;
        }
        const res = await fetch(`${this.baseUrl}/cakes/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error eliminando torta');
        await this.refresh();
        return true;
    }

    // HISTORY LOGIC
    async addHistory(payload) {
        // payload: { cake_id, type: 'IN'/'OUT', amount, description, clientName }
        if (!this.online) {
            const newId = String(Date.now());
            const entry = {
                id: newId,
                cakeId: String(payload.cake_id),
                type: payload.type, // 'sale', 'credit', etc.
                amount: parseInt(payload.amount),
                date: payload.date || new Date().toISOString(),
                description: payload.description,
                clientName: payload.clientName
            };

            // Map types to simple IN/OUT for stock adjustment if needed, but the caller (core.js) usually handles stock update separately or expects this to do it?
            // In Denarius Database.js, addTransaction updated balance.
            // Here, let's keep it simple: core.js calls updateCake AND addHistory separately? 
            // Or addHistory triggers stock update?
            // core.js currently does: cake.stock-- then save().
            // Ideally: updateCake for stock, addHistory for log.

            this.data.history.unshift(entry);
            await this.save(this.data);
            return entry;
        }

        const res = await fetch(`${this.baseUrl}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Error registrando historial');
        // We don't necessarily need to refresh everything for history push, but good for consistency
        await this.refresh();
        return true;
    }
}
