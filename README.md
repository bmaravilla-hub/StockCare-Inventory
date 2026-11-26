# StockCare

## INTEGRANTES

- Rebeca Marcela Orozco Arévalo (OA241153)       
- Blanca Esmeralda Maravilla Cruz (MC240030)       
- Alexis Ernesto Hernández Monge (HM253055)       
- Joel Ernesto Granados Mejia (GM251189)

## Requisitos

- Python 3.10 o superior.
- SQL Server 2019 o 2022.
- ODBC Driver 18 for SQL Server.
- Node.js 20 o superior y npm, para el frontend.
- Git.



## 1. Base de datos

### Configurar SQL Server

1. Habilitar autenticación mixta: **SQL Server and Windows Authentication mode**.
2. Habilitar **TCP/IP** y fijar el puerto `1433`.
3. Permitir TCP `1433` en el firewall de Windows.
4. Reiniciar el servicio de SQL Server.

### Crear el login

En SSMS, con autenticación de Windows:

```sql
USE master;
GO

IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = 'user_stockcare')
    CREATE LOGIN user_stockcare
    WITH PASSWORD = 'TuClaveSegura', CHECK_POLICY = OFF;
GO
```

### Crear la base y las tablas

Abrir y ejecutar el script:

```text
database/FormandoBaseDatos.sql
```

Ese script crea `DB_StockCare`, las tablas `Proveedores`, `Productos`, `Lotes` y `Movimientos`, y la vista `VW_InventarioActual`.

> El script elimina y vuelve a crear la base si ya existe. No ejecutar si hay datos que se deseen conservar.

### Crear el usuario de la base

```sql
USE DB_StockCare;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'user_stockcare')
    CREATE USER user_stockcare FOR LOGIN user_stockcare;
GO

ALTER ROLE db_datareader ADD MEMBER user_stockcare;
ALTER ROLE db_datawriter ADD MEMBER user_stockcare;
GO
```

Verificar:

```sql
SELECT COUNT(*) AS productos FROM dbo.VW_InventarioActual;
```

La base queda vacía hasta que se carguen productos y lotes.

---

## 2. Backend

Desde la raíz del proyecto:

```bash
cd stockcare_backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Editar `.env`:

```env
DB_SERVER=172.21.80.1
DB_PORT=1433
DB_NAME=DB_StockCare
DB_USER=user_stockcare
DB_PASSWORD=TuClaveSegura
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_ENCRYPT=yes
DB_TRUST_SERVER_CERTIFICATE=yes
```


Ejecutar:

```bash
python app.py
```

La API queda disponible en `http://localhost:5000`.

---

## 3. Frontend

El frontend está en `FrontEnd/` y usa React, TypeScript, Vite y Tailwind.

Desde la raíz del proyecto:

```bash
cd stockcare_backend/FrontEnd
npm install
npm run dev
```

Queda disponible en `http://localhost:5173`.

Cuentas demo: `admin` (administrador) y `bodega` (encargado de bodega).

La URL del backend está configurada en `FrontEnd/src/services/api.ts`:

```ts
const API_URL = 'http://localhost:5000/api';
```

Si el backend corre en otro host o puerto, actualizar esa constante.

Para generar la versión de producción:

```bash
npm run build
```

---

## 4. API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/inventario` | Stock actual por producto. |
| `GET` | `/api/lotes` | Lotes registrados. |
| `GET` | `/api/movimientos` | Historial de entradas y salidas guardado en SQL Server. |
| `GET` | `/api/vencimientos` | Lotes que vencen en los próximos 90 días. |
| `GET` | `/api/stock-bajo` | Productos con stock igual o inferior al mínimo. |
| `POST` | `/api/entradas` | Registra uno o varios lotes de entrada. |
| `POST` | `/api/salidas` | Registra una salida y descuenta stock. |

### Registrar una entrada

```bash
curl -X POST http://localhost:5000/api/entradas \
  -H "Content-Type: application/json" \
  -d '{
    "id_proveedor": 1,
    "items": [
      {
        "id_producto": 1,
        "numero_lote": "L-2026-001",
        "fecha_vencimiento": "2027-06-30",
        "cantidad": 50
      }
    ]
  }'
```

Respuesta `201`:

```json
{
  "mensaje": "Entrada registrada exitosamente"
}
```

### Registrar una salida

```bash
curl -X POST http://localhost:5000/api/salidas \
  -H "Content-Type: application/json" \
  -d '{
    "id_producto": 1,
    "cantidad": 10,
    "motivo": "Venta"
  }'
```

Respuesta `201`:

```json
{
  "mensaje": "Salida registrada exitosamente"
}
```

Códigos principales:

- `200`: consulta correcta.
- `201`: entrada o salida registrada.
- `400`: datos inválidos o stock insuficiente.
- `500`: error inesperado del servidor.
- `503`: no se pudo conectar a SQL Server.

---

## 5. Estructura

```text
stockcare_backend/
├── app.py
├── dao/
│   └── inventory_dao.py
├── database/
│   ├── connection.py
│   └── FormandoBaseDatos.sql
├── FrontEnd/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/api.ts
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── data/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── .env.example
├── requirements.txt
└── README.md
```

