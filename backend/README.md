# Backend FastAPI para Denarius

Pasos rápidos:

1. Crear un entorno virtual e instalar dependencias:

   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt

2. Copiar `.env.example` a `.env` y rellenar si deseas (ya incluye tus credenciales de Clever Cloud). 

3. Ejecutar (desde la raíz del repo si `complements/denarius` existe):

   uvicorn backend.main:app --reload

4. Endpoints útiles:
   - GET  /api/accounts
   - POST /api/accounts
   - PUT  /api/accounts/{id}
   - DELETE /api/accounts/{id}
   - GET  /api/buckets
   - POST /api/buckets
   - PUT  /api/buckets/{id}
   - DELETE /api/buckets/{id}
   - GET  /api/transactions
   - POST /api/transactions
   - PUT /api/transactions/{id}
   - DELETE /api/transactions/{id}
   - POST /api/sync  (sincroniza todo el dataset desde frontend)

5. Importar datos (ejemplos curl / PowerShell):

   # Import sample JSON payload
   curl -X POST http://localhost:8000/api/sync -H 'Content-Type: application/json' -d @backend/sample_sync_payload.json

   # PowerShell (ejecutar desde carpeta backend)
   .\curl_examples.ps1

6. Pruebas de integración (pytest):

   # Instala deps
   pip install -r requirements.txt

   # Ejecuta tests (asegúrate de que el servidor esté corriendo)
   pytest -q

7. Importar localStorage (importar datos del frontend)

   a) Exporta el localStorage desde la consola del navegador (abre la app y ejecuta este snippet en la consola):

   // Copia y pega en la consola del navegador
   (function(){ const key = 'denarius_db'; const v = localStorage.getItem(key); if(!v){ console.log('No se encontró ' + key); return; } const blob = new Blob([v], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'denarius_localstorage_export.json'; document.body.appendChild(a); a.click(); a.remove(); console.log('Archivo descargado'); })();

   b) Usa el script de importación (local) para normalizar y POSTear a `/api/sync`:

   # Desde la carpeta backend
   python tools/import_local_storage.py --file path/to/denarius_localstorage_export.json --url http://localhost:8000

   Opciones útiles:
     --dry-run   # solo normaliza y muestra el payload, no lo envía
     --pretty    # imprime el payload normalizado bonito

   c) También hay un ejemplo de export de muestra: `sample_localstorage_export.json` y un script PowerShell `curl_examples.ps1` para enviar manualmente `sample_sync_payload.json`.

Notas:
- El post a `/api/sync` reemplaza el contenido de las tablas en la base de datos con el payload enviado (útil para importaciones desde localStorage). Asegúrate de tener respaldo antes de importar en producción.
- Si prefieres, puedo añadir soporte incremental (crear/actualizar sin borrar tablas) en la API; dime si lo quieres.
