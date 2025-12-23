/* glasse.js — class-based refactor to match denarius.js structure */

class Glasse {
    constructor(storageKey = 'cake_inventory_history_v1') {
        this.storageKey = storageKey;
        this.onUpdate = null; // UI can assign a callback

        this.initialData = {
            inventory: [
                { id: 1, name: 'Chocolate', totalStock: 6, reservations: [{ id: 'res-init-1', customerName: 'Eismel', date: new Date().toISOString() }], credits: [], imageColor: 'bg-amber-800' },
                { id: 2, name: 'Torta Quesillo', totalStock: 3, reservations: [], credits: [], imageColor: 'bg-yellow-400' },
                { id: 3, name: 'Marquesa', totalStock: 2, reservations: [], credits: [], imageColor: 'bg-orange-200' }
            ],
            history: []
        };

        this.data = this.load();
        this.currentView = 'inventory';
    }

    load() {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return JSON.parse(JSON.stringify(this.initialData));
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return { inventory: parsed, history: [] };
            return parsed;
        } catch (e) {
            return JSON.parse(JSON.stringify(this.initialData));
        }
    }

    async save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        if (this.onUpdate) this.onUpdate();
    }

    reset() {
        this.data = JSON.parse(JSON.stringify(this.initialData));
        this.save();
    }

    // --- CRUD helpers for products (accounts/buckets analog) ---
    async createProduct(name, initialStock = 0, imageColor = 'bg-pink-500') {
        const product = { id: Date.now(), name, totalStock: initialStock, reservations: [], credits: [], imageColor };
        this.data.inventory.push(product);
        await this.save();
        return product;
    }

    async deleteProduct(id) {
        this.data.inventory = this.data.inventory.filter(p => p.id !== id);
        await this.save();
    }

    async updateProduct(id, values) {
        const p = this.data.inventory.find(x => x.id === id);
        if (!p) return;
        Object.assign(p, values);
        await this.save();
    }

    // --- History helper ---
    addToHistory(type, cakeName, clientName, amount = 1) {
        this.data.history.unshift({ id: Date.now(), date: new Date().toISOString(), type, cakeName, clientName: clientName || '-', amount });
        if (this.data.history.length > 50) this.data.history.pop();
    }

    // --- Business logic (kept method names for compatibility with HTML) ---
    async directSale(id) {
        const cake = this.data.inventory.find(c => c.id === id);
        if (!cake) return;
        const available = cake.totalStock - (cake.reservations?.length || 0);
        if (available > 0) {
            cake.totalStock--;
            this.addToHistory('sale', cake.name, 'Venta de Mostrador');
            await this.save();
        }
    }

    async addReservation(id) {
        const input = document.getElementById(`input-${id}`);
        if (!input) return;
        const name = input.value.trim();
        if (!name) return alert('Por favor escribe un nombre');
        const cake = this.data.inventory.find(c => c.id === id);
        const available = cake.totalStock - (cake.reservations?.length || 0);
        if (available > 0) {
            cake.reservations.push({ id: Date.now().toString(), customerName: name, date: new Date().toISOString() });
            input.value = '';
            await this.save();
        }
    }

    async creditSale(id) {
        const input = document.getElementById(`input-${id}`);
        if (!input) return;
        const name = input.value.trim();
        if (!name) return alert('Por favor escribe un nombre para el fiado');
        const cake = this.data.inventory.find(c => c.id === id);
        const available = cake.totalStock - (cake.reservations?.length || 0);
        if (available > 0) {
            cake.totalStock--;
            if (!cake.credits) cake.credits = [];
            cake.credits.push({ id: Date.now().toString(), customerName: name, date: new Date().toISOString() });
            input.value = '';
            this.addToHistory('credit', cake.name, name);
            await this.save();
        }
    }

    async completeReservation(cakeId, resId) {
        const cake = this.data.inventory.find(c => c.id === cakeId);
        const res = cake?.reservations?.find(r => r.id === resId);
        if (res) {
            cake.totalStock--;
            cake.reservations = cake.reservations.filter(r => r.id !== resId);
            this.addToHistory('reservation_done', cake.name, res.customerName);
            await this.save();
        }
    }

    async settleCredit(cakeId, creditId) {
        const cake = this.data.inventory.find(c => c.id === cakeId);
        const credit = cake?.credits?.find(c => c.id === creditId);
        if (credit) {
            cake.credits = cake.credits.filter(c => c.id !== creditId);
            this.addToHistory('paid', cake.name, credit.customerName);
            await this.save();
        }
    }

    async cancelReservation(cakeId, resId) {
        const cake = this.data.inventory.find(c => c.id === cakeId);
        if (!cake) return;
        cake.reservations = cake.reservations.filter(r => r.id !== resId);
        await this.save();
    }

    async addStock(id) {
        const cake = this.data.inventory.find(c => c.id === id);
        if (!cake) return;
        cake.totalStock++;
        await this.save();
    }

    // --- View helpers (rendering handled by UIManager) ---
    switchView(viewName) {
        this.currentView = viewName;
        const tabInv = document.getElementById('tab-inventory');
        const tabHis = document.getElementById('tab-history');
        const activeClass = 'bg-slate-800 text-indigo-400 shadow-sm';
        const inactiveClass = 'text-slate-400 hover:bg-slate-800/75';

        const vInv = document.getElementById('view-inventory');
        const vHis = document.getElementById('view-history');
        if (!vInv || !vHis) return;

        if (viewName === 'inventory') {
            vInv.classList.remove('hidden'); vHis.classList.add('hidden');
            if (tabInv) tabInv.className = `flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeClass}`;
            if (tabHis) tabHis.className = `flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${inactiveClass}`;
        } else {
            vInv.classList.add('hidden'); vHis.classList.remove('hidden');
            if (tabInv) tabInv.className = `flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${inactiveClass}`;
            if (tabHis) tabHis.className = `flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeClass}`;
        }
        // Notify UI to re-render if needed
        if (this.onUpdate) this.onUpdate();
    }

    // Minimal init to trigger first render by UIManager
    init() {
        this.data = this.load();
        if (this.onUpdate) this.onUpdate();
    }

    renderHistory() {
        const list = document.getElementById('history-list');
        const empty = document.getElementById('empty-history');
        const count = document.getElementById('history-count');
        if (!list || !empty || !count) return;

        count.innerText = `${this.data.history.length} registros`;
        if (this.data.history.length === 0) { list.innerHTML = ''; empty.classList.remove('hidden'); empty.classList.add('flex'); return; }
        empty.classList.add('hidden'); empty.classList.remove('flex');

        list.innerHTML = this.data.history.map(item => {
            let icon, colorClass, label;
            const date = new Date(item.date).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

            switch(item.type) {
                case 'sale': icon = 'shopping-bag'; colorClass = 'bg-green-800 text-green-200'; label = 'Venta Efectivo'; break;
                case 'credit': icon = 'notebook-pen'; colorClass = 'bg-red-800 text-red-200'; label = 'Fiado (Crédito)'; break;
                case 'reservation_done': icon = 'calendar-check'; colorClass = 'bg-blue-800 text-blue-200'; label = 'Reserva Entregada'; break;
                case 'paid': icon = 'dollar-sign'; colorClass = 'bg-emerald-800 text-emerald-200'; label = 'Deuda Pagada'; break;
                default: icon = 'circle'; colorClass = 'bg-gray-700 text-gray-200'; label = 'Movimiento';
            }

            return `
                <div class="bg-slate-800/80 p-3 rounded-xl shadow-sm border border-slate-700 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="p-2 rounded-full ${colorClass}">
                            <i data-lucide="${icon}" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <p class="font-bold text-slate-100 text-sm">${label}</p>
                            <p class="text-xs text-slate-400">${item.cakeName} <span class="mx-1">•</span> ${item.clientName}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">${date}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderInventory() {
        const inventoryList = document.getElementById('inventory-list');
        const dashboard = document.getElementById('dashboard');
        if (!inventoryList || !dashboard) return;

        const totalStock = this.data.inventory.reduce((acc, item) => acc + item.totalStock, 0);
        const totalRes = this.data.inventory.reduce((acc, item) => acc + (item.reservations ? item.reservations.length : 0), 0);
        const totalFree = this.data.inventory.reduce((acc, item) => acc + (item.totalStock - (item.reservations ? item.reservations.length : 0)), 0);

        dashboard.innerHTML = `
            <div class="bg-slate-800/50 backdrop-blur-sm p-3 rounded-xl border border-slate-700 text-center">
                <p class="text-slate-300 text-xs uppercase font-bold tracking-wider">Total</p>
                <p class="text-2xl font-bold text-slate-100">${totalStock}</p>
            </div>
            <div class="bg-slate-800/50 backdrop-blur-sm p-3 rounded-xl border border-slate-700 text-center">
                <p class="text-blue-300 text-xs uppercase font-bold tracking-wider">Reservas</p>
                <p class="text-2xl font-bold text-blue-300">${totalRes}</p>
            </div>
            <div class="bg-slate-800/50 backdrop-blur-sm p-3 rounded-xl border border-slate-700 text-center">
                <p class="text-emerald-300 text-xs uppercase font-bold tracking-wider">Libres</p>
                <p class="text-2xl font-bold text-emerald-300">${totalFree}</p>
            </div>
        `;

        inventoryList.innerHTML = '';
        
        this.data.inventory.forEach(cake => {
            const reservations = cake.reservations || [];
            const credits = cake.credits || [];
            const available = cake.totalStock - reservations.length;
            const isOutOfStock = cake.totalStock === 0;
            
            const disabledClass = (available <= 0) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : '';
            const sellClass = (available > 0) ? 'bg-indigo-600 text-white shadow-lg active:scale-95 hover:bg-indigo-700' : disabledClass;
            const actionBtnClass = (available > 0) ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-700 text-slate-500';
            const creditBtnClass = (available > 0) ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-slate-700 text-slate-500';

            let resHtml = '';
            if (reservations.length > 0) {
                resHtml = `
                    <div class="bg-blue-50/50 rounded-lg p-3 border border-blue-100 mt-4">
                        <h3 class="text-xs font-bold text-blue-500 uppercase mb-2 flex items-center gap-1"><i data-lucide="calendar-clock" class="w-3 h-3"></i> Apartadas (${reservations.length})</h3>
                        <div class="space-y-2">
                            ${reservations.map(r => `
                                <div class="flex items-center justify-between bg-white p-2 rounded shadow-sm">
                                    <span class="text-sm font-medium text-slate-700 truncate flex-1">${r.customerName}</span>
                                    <div class="flex gap-1 ml-2">
                                        <button onclick="app.completeReservation(${cake.id}, '${r.id}')" class="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"><i data-lucide="check-circle" class="w-4 h-4"></i></button>
                                        <button onclick="app.cancelReservation(${cake.id}, '${r.id}')" class="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                    </div>
                                </div>`).join('')}
                        </div>
                    </div>`;
            }

            let credHtml = '';
            if (credits.length > 0) {
                credHtml = `
                    <div class="bg-red-50/50 rounded-lg p-3 border border-red-100 mt-4">
                        <h3 class="text-xs font-bold text-red-500 uppercase mb-2 flex items-center gap-1"><i data-lucide="notebook-pen" class="w-3 h-3"></i> Por Cobrar (${credits.length})</h3>
                        <div class="space-y-2">
                            ${credits.map(c => `
                                <div class="flex items-center justify-between bg-white p-2 rounded shadow-sm border-l-4 border-red-400">
                                    <div class="flex flex-col">
                                        <span class="text-sm font-bold text-slate-700">${c.customerName}</span>
                                        <span class="text-[10px] text-slate-400">Debe 1 ${cake.name}</span>
                                    </div>
                                    <button onclick="app.settleCredit(${cake.id}, '${c.id}')" class="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs font-bold">
                                        <i data-lucide="dollar-sign" class="w-3 h-3"></i> Pagó
                                    </button>
                                </div>`).join('')}
                        </div>
                    </div>`;
            }

            const cardHtml = `
                <div class="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-200">
                    <div class="p-4 border-b border-slate-100 flex justify-between items-start bg-gradient-to-r from-white to-slate-50">
                        <div class="flex gap-3 items-center">
                            <div class="h-12 w-12 rounded-full flex items-center justify-center text-white shadow-sm ${cake.imageColor}"><i class="fas fa-birthday-cake text-lg"></i></div>
                            <div>
                                <h2 class="font-bold text-lg text-slate-800">${cake.name}</h2>
                                <div class="flex gap-2 text-sm">
                                    <span class="font-medium text-slate-600">Físicas: ${cake.totalStock}</span>
                                    ${available > 0 ? `<span class="text-green-600 font-bold">(${available} libres)</span>` : ''}
                                    ${isOutOfStock ? `<span class="text-red-500 font-bold">(Agotadas)</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <button onclick="app.addStock(${cake.id})" class="bg-pink-50 text-pink-600 hover:bg-pink-100 p-2 rounded-full transition-colors" title="Agregar Stock"><i data-lucide="plus" class="w-5 h-5"></i></button>
                    </div>
                    <div class="p-4 bg-slate-50">
                        <div class="space-y-2">
                            <button onclick="app.directSale(${cake.id})" ${available <= 0 ? 'disabled' : ''} class="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all ${sellClass}">
                                <i data-lucide="shopping-bag" class="w-4 h-4"></i> Venta Rápida (Efectivo)
                            </button>
                            <div class="flex gap-1">
                                <input type="text" id="input-${cake.id}" placeholder="Nombre cliente..." ${available <= 0 ? 'disabled' : ''} class="flex-1 px-3 py-3 text-sm border border-slate-300 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <button onclick="app.addReservation(${cake.id})" ${available <= 0 ? 'disabled' : ''} class="px-3 flex flex-col items-center justify-center text-[10px] gap-1 min-w-[60px] transition-colors border-r border-white/20 ${actionBtnClass}"><i data-lucide="save" class="w-4 h-4"></i> Reservar</button>
                                <button onclick="app.creditSale(${cake.id})" ${available <= 0 ? 'disabled' : ''} class="px-3 rounded-r-xl flex flex-col items-center justify-center text-[10px] gap-1 min-w-[60px] transition-colors ${creditBtnClass}"><i data-lucide="notebook-pen" class="w-4 h-4"></i> Fiado</button>
                            </div>
                        </div>
                        ${resHtml}
                        ${credHtml}
                    </div>
                </div>`;
            inventoryList.insertAdjacentHTML('beforeend', cardHtml);
        });
    }
}

const app = new Glasse();
app.init?.();
window.app = app;