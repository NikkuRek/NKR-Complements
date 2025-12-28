# Denarius Backend

Este es el microservicio backend para la aplicación **Denarius**, construido con **Node.js**, **Express** y **MySQL**. Proporciona una API RESTful para gestionar cuentas, "buckets" (presupuestos), transacciones y sincronización de datos.

## Características

- **Gestión de Cuentas**: Endpoints para crear, leer, actualizar y eliminar cuentas financieras.
- **Gestión de Buckets**: Administración de categorías o botes de presupuesto.
- **Transacciones**: Registro y seguimiento de movimientos financieros.
- **Sincronización**: Capacidad de sincronizar el estado completo de la aplicación desde el frontend.

## Requisitos Previos

- **Node.js**: (versión 16 o superior recomendada)
- **MySQL**: Servidor de base de datos en ejecución.

## Instalación

1.  Navega al directorio del backend:
    ```bash
    cd backend/denarius
    ```

2.  Instala las dependencias del proyecto:
    ```bash
    npm install
    ```

## Configuración

Crea un archivo `.env` en la raíz del directorio `backend/denarius` con las variables de entorno necesarias para la conexión a la base de datos y el puerto del servidor.

Ejemplo de archivo `.env`:

```env
PORT=3000
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=denarius_db
```

## Configuración de Base de Datos

Para inicializar las tablas de la base de datos, ejecuta el script de migración. Asegúrate de tener un archivo `migrations.sql` válido con el esquema SQL en el directorio raíz.

```bash
npm run migrate
```

## Ejecución

Para iniciar el servidor en modo producción (o desarrollo simple):

```bash
npm start
```

El servidor estará escuchando en `http://localhost:3000` (o el puerto que hayas configurado).

## Endpoints de la API

### Cuentas (`/api/accounts`)
- `GET /`: Obtener todas las cuentas.
- `POST /`: Crear una nueva cuenta.
- `PUT /:id`: Actualizar una cuenta existente.
- `DELETE /:id`: Eliminar una cuenta.

### Buckets (`/api/buckets`)
- `GET /`: Obtener todos los buckets.
- `POST /`: Crear un nuevo bucket.
- `PUT /:id`: Actualizar un bucket.
- `DELETE /:id`: Eliminar un bucket.

### Transacciones (`/api/transactions`)
- `GET /`: Obtener todas las transacciones.
- `POST /`: Crear una nueva transacción.
- `PUT /:id`: Actualizar una transacción.
- `DELETE /:id`: Eliminar una transacción.

### Sincronización (`/api/sync`)
- `POST /`: Recibe un payload JSON completo para sobrescribir/sincronizar el estado de la base de datos (útil para importaciones masivas o restauración de estado).

## Estructura del Proyecto

- `index.js`: Punto de entrada de la aplicación. Configuración de Express y middlewares.
- `db.js`: Configuración de la conexión a la base de datos (MySQL pool).
- `migrations.js`: Script para ejecutar migraciones SQL.
- `routes/`: Definición de las rutas de la API para cada recurso.
