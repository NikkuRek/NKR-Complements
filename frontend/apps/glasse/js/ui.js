class GlasseUI {
    constructor(app) {
        this.app = app;
    }

    init() {
        // Connect model updates to UI renders
        this.app.onUpdate = () => this.renderAll();

        // Provide some helper methods on app (backwards compatibility)
        this.app.openAddModal = this.openAddModal.bind(this);
        this.app.closeAddModal = this.closeAddModal.bind(this);
        this.app.adjustNewStock = this.adjustNewStock.bind(this);
        this.app.addNewProduct = this.addNewProduct.bind(this);
        this.app.confirmReset = this.confirmReset.bind(this);
        this.app.closeResetModal = this.closeResetModal.bind(this);
        this.app.resetData = this.resetData.bind(this);

        // Initial render
        this.renderAll();
    }

    renderAll() {
        // Delegate to model's render methods where present
        if (typeof this.app.renderInventory === 'function') this.app.renderInventory();
        if (typeof this.app.renderHistory === 'function') this.app.renderHistory();
        if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();
    }

    // UI helpers (formerly inline in HTML)
    openAddModal() {
        const modal = document.getElementById('modal-add');
        if (!modal) return;
        modal.classList.remove('hidden');
        const name = document.getElementById('new-cake-name');
        const stock = document.getElementById('new-cake-stock');
        if (name) name.value = '';
        if (stock) stock.value = '1';
    }
    closeAddModal() { const modal = document.getElementById('modal-add'); if (!modal) return; modal.classList.add('hidden'); }
    adjustNewStock(n) { const el = document.getElementById('new-cake-stock'); if (!el) return; el.value = Math.max(0, parseInt(el.value || 0) + n); }

    async addNewProduct() {
        const name = document.getElementById('new-cake-name')?.value.trim();
        const stock = parseInt(document.getElementById('new-cake-stock')?.value) || 0;
        if (!name) return alert('Nombre requerido');
        try {
            await this.app.createProduct(name, stock, 'bg-pink-500');
            this.closeAddModal();
            this.renderAll();
        } catch (err) { alert('Error: ' + err.message); }
    }

    confirmReset() { const modal = document.getElementById('modal-reset'); if (!modal) return; modal.classList.remove('hidden'); }
    closeResetModal() { const modal = document.getElementById('modal-reset'); if (!modal) return; modal.classList.add('hidden'); }
    resetData() { this.app.reset(); this.closeResetModal(); this.renderAll(); }
}

// Auto-instantiate if model is already present on window
if (window.app) {
    const ui = new GlasseUI(window.app);
    ui.init();
    window.ui = ui;
} else {
    // If not present yet, wait for load event then try again
    window.addEventListener('load', () => {
        if (window.app) {
            const ui = new GlasseUI(window.app);
            ui.init();
            window.ui = ui;
        }
    });
}
