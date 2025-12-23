(async function initApp(){
    const db = new Database('/api');
    await db.init();
    const app = new denarius(db);

    // Conectar actualización de UI
    app.onUpdate = () => ui.renderAll();
    app.handleCreateAccount = async (type) => {
        const name = document.getElementById(`new-${type}-name`).value;
        const curr = document.getElementById(`new-${type}-currency`).value;
        const initBal = document.getElementById(`new-${type}-init`).value;
        const startDate = document.getElementById(`new-${type}-date`)?.value;
        const dueDate = document.getElementById(`new-${type}-due`)?.value;

        if (!name) { ui.showAlert("Requerido"); return; }
        try {
            await app.createAccount(name, type, curr, initBal, startDate, dueDate);
            ui.toggleManager(type);
            ui.renderCRUD(type);
            ui.renderAll();
        } catch (err) { ui.showAlert('Error: ' + err.message); }

        document.getElementById(`new-${type}-name`).value = '';
        document.getElementById(`new-${type}-init`).value = '';
        if (startDate) document.getElementById(`new-${type}-date`).value = '';
        if (dueDate) document.getElementById(`new-${type}-due`).value = '';
    };
    app.handleCreateBucket = async () => {
        const name = document.getElementById('new-BUCKET-name').value;
        const initBal = document.getElementById('new-BUCKET-init').value;
        if (!name) return;
        try {
            await app.createBucket(name, initBal);
            ui.toggleManager('BUCKET');
            ui.renderCRUD('BUCKET');
            ui.renderAll();
        } catch (err) { ui.showAlert('Error: ' + err.message); }
        document.getElementById('new-BUCKET-name').value = '';
        document.getElementById('new-BUCKET-init').value = '';
    };
    app.deleteAccountWrapper = (id, type) => { ui.showConfirm('¿Eliminar cuenta?', async () => { await app.deleteAccount(id); ui.renderCRUD(type); ui.renderAll(); }); };
    app.deleteBucketWrapper = (id) => { ui.showConfirm('¿Eliminar bucket?', async () => { await app.deleteBucket(id); ui.renderCRUD('BUCKET'); ui.renderAll(); }); };
    app.editAccountWrapper = (id, type) => { ui.openEditAccountModal(id, type); };
    app.editBucketWrapper = (id) => { ui.openEditBucketModal(id); };
    app.deleteTransactionWrapper = (id) => { ui.showConfirm('¿Borrar?', async () => { await app.deleteTransaction(id); ui.renderAll(); }); };
    app.resetDataWrapper = () => { ui.showConfirm('¿RESET?', () => { app.resetData(); }); };
    app.updateAccountWrapper = async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-account-id').value;
        const type = document.getElementById('edit-account-type').value;
        const name = document.getElementById('edit-account-name').value.trim();
        const currency = document.getElementById('edit-account-currency').value;
        const balance = parseFloat(document.getElementById('edit-account-balance').value) || 0;
        const start = document.getElementById('edit-account-start').value || null;
        const due = document.getElementById('edit-account-due').value || null;
        try {
            await app.updateAccount(id, { name, currency, balance, startDate: start, dueDate: due });
            ui.renderCRUD(type);
            ui.renderAll();
            document.getElementById('edit-account-modal').classList.add('hidden');
        } catch (err) { ui.showAlert('Error: ' + err.message); }
    };
    app.updateBucketWrapper = async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-bucket-id').value;
        const name = document.getElementById('edit-bucket-name').value.trim();
        const balance = parseFloat(document.getElementById('edit-bucket-balance').value) || 0;
        try {
            await app.updateBucket(id, { name, balance });
            ui.renderCRUD('BUCKET');
            ui.renderAll();
            document.getElementById('edit-bucket-modal').classList.add('hidden');
        } catch (err) { ui.showAlert('Error: ' + err.message); }
    };
    app.addTransactionWrapper = async (e) => { e.preventDefault(); try { await app.addTransaction(document.getElementById('tx-amount').value, document.getElementById('tx-type').value, document.getElementById('tx-account').value, document.getElementById('tx-bucket').value, document.getElementById('tx-desc').value); ui.closeModal(); ui.renderAll(); } catch (err) { ui.showAlert('Error: ' + err.message); } };

    window.app = app;
    ui.init();
})();
