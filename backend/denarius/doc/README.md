# 📚 Documentación API - Denarius

Esta carpeta contiene la documentación completa de la API REST de Denarius usando el estándar OpenAPI 3.0 (Swagger).

## 📁 Estructura de Archivos

```
doc/
├── swagger.yaml       # Configuración principal y esquemas
├── accounts.yaml      # Endpoints de cuentas
├── buckets.yaml       # Endpoints de presupuestos
├── transactions.yaml  # Endpoints de transacciones
├── wishlist.yaml      # Endpoints de wishlist
├── utils.yaml         # Endpoints de utilidades (migrations, sync)
└── README.md          # Este archivo
```

## 🎯 Características

- **OpenAPI 3.0**: Estándar de documentación de APIs
- **Modular**: Cada recurso en su propio archivo YAML
- **Completo**: Todos los endpoints documentados con ejemplos
- **Tipos Definidos**: Schemas reutilizables para todos los modelos
- **Respuestas Estándar**: Componentes compartidos para errores

## 📖 Acceso a la Documentación

### Swagger UI (Interfaz Web)
```
http://localhost:3000/api-docs
```

La interfaz Swagger UI permite:
- ✅ Explorar todos los endpoints
- ✅ Ver schemas y modelos de datos
- ✅ Probar requests directamente desde el navegador
- ✅ Ver ejemplos de request/response
- ✅ Descargar la especificación OpenAPI

### Archivo JSON
```
http://localhost:3000/api-docs.json
```

## 📝 Esquemas Principales

### Account
Representa una cuenta financiera (activo, deuda, cuenta por cobrar).

**Tipos de cuenta:**
- `ASSET`: Cuenta de activos (banco, efectivo, crypto)
- `LIABILITY`: Deuda o pasivo
- `RECEIVABLE`: Cuenta por cobrar (préstamos dados)

**Campos especiales:**
- `start_date`: Fecha de inicio (para LIABILITY y RECEIVABLE)
- `due_date`: Fecha de vencimiento (para LIABILITY y RECEIVABLE)

### Bucket
Representa un presupuesto o categoría de gasto.

### Transaction
Representa una transacción financiera.

**Tipos de transacción:**
- `INCOME`: Ingreso a una cuenta
- `EXPENSE`: Gasto desde una cuenta
- `TRANSFER_IN`: Transferencia hacia un bucket
- `TRANSFER_OUT`: Transferencia desde un bucket
- `BUCKET_XFER`: Transferencia entre buckets

### WishlistItem
Representa un producto en la lista de deseos.

## 🔧 Mantenimiento

### Agregar un Nuevo Endpoint

1. Edita el archivo YAML correspondiente al recurso
2. Sigue el formato de los endpoints existentes
3. Asegúrate de incluir:
   - Tag apropiado
   - Summary y description
   - Request body (si aplica)
   - Todas las posibles responses
   - Ejemplos

### Agregar un Nuevo Recurso

1. Crea un nuevo archivo `{recurso}.yaml` en `doc/`
2. Define los endpoints siguiendo el formato estándar
3. Agrega el schema del modelo en `swagger.yaml` bajo `components/schemas`
4. Importa el archivo en `swagger.js`:
   ```javascript
   const nuevoRecursoSpec = YAML.load(path.join(__dirname, 'doc', 'nuevo-recurso.yaml'));
   ```
5. Agrégalo al merge de paths:
   ```javascript
   mainSpec.paths = {
     ...accountsSpec,
     ...nuevoRecursoSpec  // Agregar aquí
   };
   ```

### Modificar Schemas

Los schemas se definen en `swagger.yaml` bajo `components/schemas`. Cualquier cambio aquí se reflejará automáticamente en todos los endpoints que lo referencien.

## 🎨 Personalización

### Swagger UI

La configuración de Swagger UI está en `index.js`:

```javascript
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Denarius API Documentation',
};
```

Puedes agregar:
- CSS personalizado (`customCss`)
- Logo personalizado (`customfavIcon`)
- Título personalizado (`customSiteTitle`)

## 📊 Ejemplo de Uso

### Crear una Cuenta

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Banco Principal",
    "type": "ASSET",
    "currency": "USD",
    "balance": 0
  }'
```

### Obtener Todas las Cuentas

```bash
curl http://localhost:3000/api/accounts
```

### Crear una Transacción

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-01-15T10:30:00Z",
    "amount": 1500.00,
    "type": "INCOME",
    "account_id": 123,
    "bucket_id": 456,
    "description": "Salario mensual"
  }'
```

## 🔍 Validación

Para validar que la especificación OpenAPI es correcta:

```bash
npm install -g @apidevtools/swagger-cli
swagger-cli validate doc/swagger.yaml
```

## 📚 Recursos Adicionales

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [OpenAPI Examples](https://github.com/OAI/OpenAPI-Specification/tree/main/examples)

## 🤝 Contribuir

Al agregar nuevos endpoints o modificar existentes, asegúrate de:

1. ✅ Documentar todos los parámetros
2. ✅ Incluir ejemplos realistas
3. ✅ Definir todas las posibles respuestas
4. ✅ Mantener consistencia con el estilo existente
5. ✅ Actualizar este README si es necesario

---

**Última actualización:** 2025-01-15  
**Versión de la API:** 1.0.0
