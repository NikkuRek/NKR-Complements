# NKR Complements

**NKR Complements** es un monorepo que alberga una suite de herramientas de gestión personalizadas ("complements"). Actualmente, el proyecto consta de dos aplicaciones web *Full Stack* diseñadas para resolver necesidades específicas de finanzas y gestión de inventario.

## 🚀 Aplicaciones Incluidas

### 1. 💰 Denarius (Gestión Financiera)
Un sistema contable personal robusto orientado a entornos **multimoneda**. Diseñado para manejar la complejidad de economías fluctuantes.

* **Multimoneda Real:** Soporte nativo para transacciones simultáneas en **USD, VES (Bolívares) y USDT**.
* **Contabilidad de Doble Entrada:** Gestión de **Cuentas** (Activos/Pasivos) separada de los **Buckets** (Sobres presupuestarios).
* **Conversión Automática:** Integración con APIs de terceros para obtener tasas de cambio en tiempo real y calcular el patrimonio neto unificado.
* **Transacciones Complejas:** Manejo de transferencias, ingresos y gastos con validación transaccional en base de datos.
* **Wishlist:** Módulo para planificación de compras futuras.

### 2. 🍰 Glasse (Inventario de Repostería)
Una herramienta optimizada para la gestión de micro-inventarios y flujo de ventas para negocios de repostería.

* **Ciclo de Venta Flexible:** Soporte para **Ventas Rápidas**, **Reservas** (apartado de stock) y **Fiados/Créditos**.
* **Indicadores Visuales:** Control de stock con alertas de disponibilidad por colores.
* **Historial Inmutable:** Registro detallado de cada movimiento de inventario.
* **Modo Offline (Fallback):** Capacidad de funcionamiento básico mediante almacenamiento local si la conexión al servidor falla.

---

## 🛠 Tech Stack

El proyecto comparte una arquitectura técnica coherente entre ambas aplicaciones:

* **Backend:** Node.js con Express.
* **Base de Datos:** MySQL (Driver `mysql2` con Promesas).
* **Frontend:** HTML5, JavaScript Vanilla (Arquitectura MVC manual), Tailwind CSS (vía CDN).
* **Infraestructura:** API RESTful.

---

## ⚙️ Instalación y Configuración

Sigue estos pasos para ejecutar el proyecto en tu entorno local.

### Prerrequisitos
* [Node.js](https://nodejs.org/) (v16 o superior recomendado)
* [MySQL](https://www.mysql.com/)

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/nkr-complements.git
cd nkr-complements
```

### 2. Configuración de Base de Datos (MySQL)
Debes crear dos bases de datos vacías en tu servidor MySQL:
```sql
CREATE DATABASE denarius_db;
CREATE DATABASE glasse_db;
```

### 3. Configuración del Backend
El proyecto tiene dos backends independientes. Debes configurar cada uno por separado.

**Para Denarius:**
```bash
cd backend/denarius
npm install
```
Crea un archivo `.env` en `backend/denarius` basado en el ejemplo de abajo.

Ejecuta las migraciones para crear las tablas:
```bash
npm run migrate
```

Inicia el servidor:
```bash
npm start
```

**Para Glasse:**
```bash
cd backend/glasse
npm install
```
Crea un archivo `.env` en `backend/glasse`.

Ejecuta las migraciones:
```bash
npm run migrate
```

Inicia el servidor:
```bash
npm start
```

### 4. Variables de Entorno (.env)

#### Backend
Crea un archivo `.env` dentro de cada carpeta de backend (`backend/denarius` y `backend/glasse`) con las siguientes variables:

```env
# Configuración del Servidor
PORT=3000 # Usa 3001 para Glasse si corres ambos simultáneamente

# Base de Datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=denarius_db # o glasse_db

# API URL (Backend)
# Para desarrollo local:
API_URL=http://localhost:3000
# Para producción en Render:
# API_URL=https://denarius-backend.onrender.com
```

#### Frontend (Next.js)
El nuevo frontend en Next.js utiliza variables de entorno separadas:

**Para desarrollo local** (`.env.local`):
```env
# Denarius Backend API
NEXT_PUBLIC_DENARIUS_API=http://localhost:3000/api

# Glasse Backend API
NEXT_PUBLIC_GLASSE_API=http://localhost:3001/api
```

**Para producción** (`.env.production`):
```env
# Denarius Backend API (Production)
NEXT_PUBLIC_DENARIUS_API=https://denarius-backend.onrender.com/api

# Glasse Backend API (Production - update when available)
NEXT_PUBLIC_GLASSE_API=http://localhost:3001/api
```

> 💡 **Tip**: Next.js automáticamente usa `.env.production` al hacer build para producción.

#### Cambiar entre Local y Producción

**Backend:**
- Edita el archivo `.env` y cambia `API_URL`
- Reinicia el servidor

**Frontend:**
- Para desarrollo: usa `.env.local`
- Para producción: usa `.env.production` (automático en build)
- O simplemente cambia la URL en `.env.local` según necesites

### 5. Ejecutar el Frontend
El frontend es estático y se encuentra en la carpeta `frontend`.

Puedes usar cualquier servidor estático (como "Live Server" en VS Code).

*   Abre `frontend/index.html` en tu navegador para ver el menú principal.
*   O navega directamente a las apps:
    *   `frontend/apps/denarius/denarius.html`
    *   `frontend/apps/glasse/glasse.html`

**Nota:** Asegúrate de que las URLs de la API en los archivos `js/Database.js` del frontend coincidan con el puerto donde corriste tus backends (por defecto suelen apuntar a `localhost:3000`).

### 📂 Estructura del Proyecto
```plaintext
nkr-complements/
├── backend/
│   ├── denarius/       # API y Lógica de Finanzas
│   │   ├── migrations/ # Scripts SQL
│   │   └── routes/     # Endpoints (accounts, buckets, etc.)
│   └── glasse/         # API y Lógica de Inventario
├── frontend/
│   ├── apps/
│   │   ├── denarius/   # UI Finanzas (HTML/JS/CSS)
│   │   └── glasse/     # UI Inventario (HTML/JS/CSS)
│   └── index.html      # Landing page
└── README.md
```

## 📄 Licencia
Este proyecto es de uso personal y privado.