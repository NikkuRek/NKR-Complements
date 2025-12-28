
(async function initApp() {
    const db = new Database('http://localhost:3001/api');
    await db.init();

    const app = new Glasse(db);

    // Connect UI
    app.onUpdate = () => {
        if (app.currentView === 'inventory') app.renderInventory();
        else app.renderHistory();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    // Global helpers wrappers if needed by HTML onclicks
    // HTML onclicks look like: app.directSale(id)
    // So window.app needs to be the instance.
    window.app = app;

    // Initial render
    app.renderInventory();

    // UI Helpers (create new cake)
    // These need to be attached to app or window if HTML uses them.
    // HTML uses `app.toggleNewCakeModal()` ? No, likely stored in UI.js or app directly.
    // Let's check glasse.html actions.

    app.adjustNewStock = (delta) => {
        const input = document.getElementById('new-cake-stock');
        let val = parseInt(input.value) || 0;
        val += delta;
        if (val < 0) val = 0;
        input.value = val;
    };

    app.saveNewCake = async () => {
        const name = document.getElementById('new-cake-name').value;
        const stock = document.getElementById('new-cake-stock').value;
        if (!name) return alert('Nombre requerido');

        await app.createProduct(name, parseInt(stock));

        // Reset and close
        document.getElementById('new-cake-name').value = '';
        document.getElementById('new-cake-stock').value = '1';
        document.getElementById('new-cake-modal').classList.add('hidden');
    };

    app.resetData = () => {
        // Implement reset logic? Database.reset? 
        if (confirm('¿Seguro que quieres borrar todo?')) {
            localStorage.removeItem(db.key);
            location.reload();
        }
    };

})();
