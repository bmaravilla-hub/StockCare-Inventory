--Se valida si existe ya la base de datos creada se borra para ejecutarla nuevamente desde cero
USE master;
GO
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'DB_StockCare')
BEGIN
    ALTER DATABASE DB_StockCare SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE DB_StockCare;
END
GO

--Crear la base de datos
CREATE DATABASE DB_StockCare;
GO

USE DB_StockCare;
GO

--Tabla de Proveedores
CREATE TABLE Proveedores (
    id_proveedor INT IDENTITY(1,1) PRIMARY KEY,
    nombre_proveedor VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(100)
);
GO

--Tabla de Productos
CREATE TABLE Productos (
    id_producto INT IDENTITY(1,1) PRIMARY KEY,
    codigo_barra VARCHAR(50) UNIQUE NOT NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    stock_minimo INT DEFAULT 5 -- Útil para alertas de stock bajo
);
GO

--Tabla de Lotes y Vencimientos
CREATE TABLE Lotes (
    id_lote INT IDENTITY(1,1) PRIMARY KEY,
    id_producto INT FOREIGN KEY REFERENCES Productos(id_producto),
    numero_lote VARCHAR(50) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    stock_lote INT NOT NULL -- Cantidad disponible específica de este lote
);
GO

--Tabla de Movimientos
CREATE TABLE Movimientos (
    id_movimiento INT IDENTITY(1,1) PRIMARY KEY,
    id_producto INT FOREIGN KEY REFERENCES Productos(id_producto),
    tipo_movimiento VARCHAR(20) CHECK (tipo_movimiento IN ('ENTRADA', 'SALIDA')),
    cantidad INT NOT NULL,
    fecha_movimiento DATETIME DEFAULT GETDATE(),
    id_proveedor INT NULL FOREIGN KEY REFERENCES Proveedores(id_proveedor), -- Nulo si es salida por venta
    motivo VARCHAR(255) -- Ej: 'Compra a proveedor', 'Venta a cliente', 'Descarte por vencimiento'
);
GO
--Se crea la vista para consultar de forma rápida el stock total disponible por producto agrupando los lotes
CREATE VIEW VW_InventarioActual AS
SELECT 
    p.id_producto,
    p.codigo_barra,
    p.nombre_producto,
    p.precio_unitario,
    ISNULL(SUM(l.stock_lote), 0) AS stock_total
FROM Productos p
LEFT JOIN Lotes l ON p.id_producto = l.id_producto
GROUP BY p.id_producto, p.codigo_barra, p.nombre_producto, p.precio_unitario;
GO