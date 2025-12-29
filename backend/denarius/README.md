# 💰 Denarius Backend

**Backend RESTful API para el sistema de gestión financiera Denarius**

Sistema completo de gestión financiera construido con **Node.js**, **Express** y **MySQL**. Proporciona una API RESTful robusta con documentación Swagger, panel de migraciones web, logging HTTP con Morgan y soporte completo para gestión de cuentas, presupuestos, transacciones y wishlist.

---

## ✨ Características

### 📊 Gestión Financiera
- **Cuentas Financieras**: CRUD completo para activos, deudas y cuentas por cobrar
  - Soporte para fechas de inicio y vencimiento (deudas/préstamos)
  - Múltiples monedas: USD, VES, USDT
- **Presupuestos (Buckets)**: Categorización y control de gastos
- **Transacciones**: Registro completo de movimientos financieros
  - Tipos: INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT, BUCKET_XFER
- **Wishlist**: Lista de deseos con precios y detalles

### 🛠️ Herramientas de Desarrollo
- **📚 Swagger/OpenAPI 3.0**: Documentación interactiva de la API
- **🗄️ Panel de Migraciones**: Interfaz web para ejecutar migraciones
- **📝 Morgan Logger**: Registro HTTP con colores en consola
- **🔄 Auto Sync**: Endpoint de sincronización de datos

---

## 🚀 Inicio Rápido

### Requisitos Previos
- **Node.js** >= 16.x
- **MySQL** >= 5.7 o MariaDB >= 10.2
- **npm** >= 7.x

### Instalación

1. **Navegar al directorio:**
   ```bash
   cd backend/denarius
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   
   Crea un archivo `.env` en la raíz:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=tu_usuario
   DB_PASSWORD=tu_contraseña
   DB_NAME=denarius_db
   ```

4. **Ejecutar migraciones:**
   
   Opción A - Desde la terminal:
   ```bash
   node migrations.js
   ```
   
   Opción B - Desde el navegador:
   ```
   Iniciar el servidor y visitar:
   http://localhost:3000/migrations.html
   ```

5. **Iniciar el servidor:**
   ```bash
   npm start
   ```

El servidor estará disponible en `http://localhost:3000`

---

## 📖 Documentación

### Acceso Rápido

| Recurso | URL | Descripción |
|---------|-----|-------------|
| **Landing Page** | `http://localhost:3000` | Página principal con enlaces |
| **Swagger UI** | `http://localhost:3000/api-docs` | Documentación interactiva de la API |
| **Panel de Migraciones** | `http://localhost:3000/migrations.html` | Ejecutar migraciones desde el navegador |

### Documentación Swagger

La documentación completa de la API está disponible en formato OpenAPI 3.0:

- **Interfaz Web**: `/api-docs` - Swagger UI interactivo
- **Archivos YAML**: `doc/` - Documentación modular por recurso
- **README**: `doc/README.md` - Guía completa de la documentación

#### Archivos de Documentación:
```
doc/
├── swagger.yaml       # Configuración principal + schemas
├── accounts.yaml      # Endpoints de cuentas
├── buckets.yaml       # Endpoints de presupuestos
├── transactions.yaml  # Endpoints de transacciones
├── wishlist.yaml      # Endpoints de wishlist
├── utils.yaml         # Endpoints de utilidades
└── README.md          # Guía de documentación
```

---

## 🔌 Endpoints de la API

### 🏦 Accounts (`/api/accounts`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/` | Listar todas las cuentas |
| `POST` | `/` | Crear nueva cuenta |
| `GET` | `/:id` | Obtener cuenta específica |
| `PUT` | `/:id` | Actualizar cuenta |
| `DELETE` | `/:id` | Eliminar cuenta |

**Tipos de cuenta:**
- `ASSET` - Activos (banco, efectivo, crypto)
- `LIABILITY` - Deudas
- `RECEIVABLE` - Cuentas por cobrar (préstamos dados)

**Campos especiales:**
- `start_date` - Fecha de inicio (LIABILITY/RECEIVABLE)
- `due_date` - Fecha de vencimiento (LIABILITY/RECEIVABLE)

### 📦 Buckets (`/api/buckets`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/` | Listar todos los buckets |
| `POST` | `/` | Crear nuevo bucket |
| `GET` | `/:id` | Obtener bucket específico |
| `PUT` | `/:id` | Actualizar bucket |
| `DELETE` | `/:id` | Eliminar bucket |

### 💸 Transactions (`/api/transactions`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/` | Listar todas las transacciones |
| `POST` | `/` | Crear nueva transacción |
| `GET` | `/:id` | Obtener transacción específica |
| `DELETE` | `/:id` | Eliminar transacción |

**Tipos de transacción:**
- `INCOME` - Ingreso a cuenta
- `EXPENSE` - Gasto desde cuenta
- `TRANSFER_IN` - Transferencia hacia bucket
- `TRANSFER_OUT` - Transferencia desde bucket
- `BUCKET_XFER` - Transferencia entre buckets

### 🎁 Wishlist (`/api/wishlist`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/` | Listar todos los items |
| `POST` | `/` | Agregar item |
| `GET` | `/:id` | Obtener item específico |
| `PUT` | `/:id` | Actualizar item |
| `DELETE` | `/:id` | Eliminar item |

### 🔧 Utilities

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/migrate` | Ejecutar migraciones de BD |
| `GET` | `/api/check-db` | Verificar conexión a BD |
| `POST` | `/api/sync` | Sincronizar datos |

---

## 🗄️ Panel de Migraciones

Interfaz web moderna para gestionar migraciones de base de datos:

### Características:
- ✅ Ejecutar migraciones con un click
- ✅ Verificar estado de la base de datos
- ✅ Logs en tiempo real con colores
- ✅ Indicadores de estado (idle, running, success, error)
- ✅ Mensajes de advertencia y confirmación

### Acceso:
```
http://localhost:3000/migrations.html
```

### Uso:
1. Abrir el panel en el navegador
2. (Opcional) Click en "Verificar Estado" para confirmar conexión
3. Click en "Ejecutar Migraciones"
4. Revisar logs en la consola del panel

---

## 📝 Logging con Morgan

El servidor utiliza Morgan para registrar todas las peticiones HTTP:

### Formato 'dev':
```
GET /api/accounts 200 15.234 ms - 1234
POST /api/transactions 201 42.156 ms - 567
DELETE /api/accounts/123 200 8.921 ms - 89
```

### Información Registrada:
- Método HTTP
- Ruta
- Status Code
- Tiempo de respuesta (ms)
- Tamaño de respuesta (bytes)

### Códigos de Colores:
- 🟢 Verde: 2xx (Success)
- 🔵 Cyan: 3xx (Redirect)
- 🟡 Amarillo: 4xx (Client Error)
- 🔴 Rojo: 5xx (Server Error)

---

## 📁 Estructura del Proyecto

```
backend/denarius/
├── doc/                      # Documentación Swagger
│   ├── swagger.yaml          # Config principal + schemas
│   ├── accounts.yaml         # Endpoints de cuentas
│   ├── buckets.yaml          # Endpoints de buckets
│   ├── transactions.yaml     # Endpoints de transacciones
│   ├── wishlist.yaml         # Endpoints de wishlist
│   ├── utils.yaml            # Endpoints de utilidades
│   └── README.md             # Guía de documentación
├── migrations/               # Archivos de migración SQL
│   └── migrations.sql        # Esquema de base de datos
├── public/                   # Archivos estáticos
│   └── migrations.html       # Panel de migraciones
├── routes/                   # Definición de rutas
│   ├── accounts.js           # Rutas de cuentas
│   ├── buckets.js            # Rutas de buckets
│   ├── transactions.js       # Rutas de transacciones
│   ├── wishlist.js           # Rutas de wishlist
│   ├── migrations.js         # Rutas de migraciones
│   └── sync.js               # Rutas de sincronización
├── .env                      # Variables de entorno
├── db.js                     # Configuración MySQL pool
├── index.js                  # Punto de entrada
├── migrations.js             # Script CLI de migraciones
├── swagger.js                # Configuración Swagger
├── package.json              # Dependencias
└── README.md                 # Este archivo
```

---

## 🔧 Comandos Disponibles

```bash
# Iniciar servidor
npm start

# Ejecutar migraciones (CLI)
node migrations.js

# Verificar conexión a BD
node check_db.js
```

---

## 🌐 Variables de Entorno

| Variable | Descripción | Ejemplo | Requerido |
|----------|-------------|---------|-----------|
| `PORT` | Puerto del servidor | `3000` | No (default: 3000) |
| `DB_HOST` | Host de MySQL | `localhost` | Sí |
| `DB_USER` | Usuario de BD | `root` | Sí |
| `DB_PASSWORD` | Contraseña de BD | `password123` | Sí |
| `DB_NAME` | Nombre de la BD | `denarius_db` | Sí |

---

## 📦 Dependencias

### Producción
- **express** - Framework web
- **mysql2** - Cliente MySQL con promises
- **cors** - CORS middleware
- **dotenv** - Variables de entorno
- **swagger-ui-express** - Interfaz Swagger UI
- **swagger-jsdoc** - Generador de specs OpenAPI
- **yamljs** - Parser de YAML
- **morgan** - HTTP request logger

### Desarrollo
- Sin dependencias de desarrollo por ahora

---

## 🚦 Estado de la API

### Recursos Implementados:
- ✅ Accounts (CRUD completo)
- ✅ Buckets (CRUD completo)
- ✅ Transactions (Crear, Listar, Eliminar)
- ✅ Wishlist (CRUD completo)
- ✅ Migrations (UI + API)
- ✅ Database Check
- ⏳ Sync (En desarrollo)

### Features:
- ✅ Documentación Swagger completa
- ✅ Panel de migraciones web
- ✅ Logging HTTP (Morgan)
- ✅ CORS habilitado
- ✅ Error handling
- ✅ Connection pooling

---

## 🔒 Seguridad

> **Nota**: Esta es una versión de desarrollo. Para producción, considera:
> - Implementar autenticación (JWT, OAuth)
> - Agregar rate limiting
> - Validación de inputs
> - Sanitización de queries SQL
> - HTTPS
> - Variables de entorno seguras

---

## 🐛 Troubleshooting

### Error de conexión a MySQL
```bash
Error: User 'username' has exceeded the 'max_user_connections' resource
```
**Solución**: Verifica el límite de conexiones en MySQL o usa connection pooling adecuadamente.

### Puerto en uso
```bash
Error: listen EADDRINUSE: address already in use :::3000
```
**Solución**: Cambia el puerto en `.env` o detén el proceso que usa el puerto 3000.

### Migraciones fallan
**Solución**: 
1. Verifica que el archivo `migrations/migrations.sql` existe
2. Revisa que las credenciales de BD sean correctas
3. Usa el panel web de migraciones para ver logs detallados

---

## 📚 Recursos Adicionales

- [Documentación de Express](https://expressjs.com/)
- [MySQL2 Documentation](https://github.com/sidorares/node-mysql2)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Morgan Documentation](https://github.com/expressjs/morgan)

---

## 👨‍💻 Desarrollo

### Agregar Nuevo Endpoint

1. Crear/modificar archivo en `routes/`
2. Agregar documentación en `doc/{recurso}.yaml`
3. Registrar ruta en `index.js`
4. Actualizar `swagger.js` si es un nuevo recurso

### Testing Manual

Usa Swagger UI en `/api-docs` para probar todos los endpoints interactivamente.

---

## 📄 Licencia

MIT

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

**Última actualización:** 2025-12-29  
**Versión:** 1.0.0  
**Estado:** Activo en desarrollo
