USE master;
GO

--Crear el Login a nivel de servidor
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'user_stockcare')
BEGIN
    CREATE LOGIN user_stockcare 
    WITH PASSWORD = 'StockCare2026!',  -- Cambia la contraseña por una segura
         DEFAULT_DATABASE = DB_StockCare,
         CHECK_EXPIRATION = OFF,
         CHECK_POLICY = OFF;
END
GO

USE DB_StockCare;
GO

--Crear el Usuario dentro de la Base de Datos DB_StockCare
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'user_stockcare')
BEGIN
    CREATE USER user_stockcare FOR LOGIN user_stockcare;
END
GO

-- 3. Asignar roles de lectura y escritura de datos
ALTER ROLE db_datareader ADD MEMBER user_stockcare; -- Permite SELECT (incluye vistas como VW_InventarioActual)
ALTER ROLE db_datawriter ADD MEMBER user_stockcare; -- Permite INSERT, UPDATE, DELETE
GO