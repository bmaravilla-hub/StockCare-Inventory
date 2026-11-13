--10 Proveedores
INSERT INTO Proveedores (nombre_proveedor, telefono, correo) VALUES
('Droguería Santa Lucía S.A. de C.V.', '2222-3333', 'ventas@santalucia.sv'),
('Laboratorios y Medicamentos de C.A.', '2511-4444', 'pedidos@labmedica.com'),
('Distribuidora Farmacéutica Global', '2234-5566', 'contacto@globalpharma.sv'),
('Droguería Central El Salvador', '2288-9900', 'info@drogueriacentral.sv'),
('Pharma Supplies C.A.', '2500-1122', 'servicio@pharmasupplies.com'),
('Laboratorios Suizos', '2225-7788', 'contacto@labsuizos.sv'),
('Distribuidora Médica Cuscatlán', '2231-0011', 'ventas@medcuscatlan.sv'),
('Droguería Americana', '2271-4455', 'pedidos@americana.com.sv'),
('Importadora Farmacéutica San José', '2298-3322', 'contacto@sanjosepharma.sv'),
('Laboratorios Biogalenic', '2525-6677', 'ventas@biogalenic.com');
GO

--15 Productos
INSERT INTO Productos (codigo_barra, nombre_producto, descripcion, precio_unitario, stock_minimo) VALUES
('741001001', 'Paracetamol 500mg - Caja x 100', 'Analgésico y antipirético', 12.50, 10),
('741001002', 'Ibuprofeno 400mg - Caja x 50', 'Antiinflamatorio no esteroideo', 8.75, 8),
('741001003', 'Amoxicilina 500mg - Cápsulas', 'Antibiótico de amplio espectro', 22.00, 5),
('741001004', 'Loratadina 10mg - Tableta', 'Antihistamínico para alergias', 5.00, 10),
('741001005', 'Omeprazol 20mg - Cápsulas', 'Inhibidor de bomba de protones', 15.00, 6),
('741001006', 'Vitamina C 1000mg - Efervescente', 'Suplemento vitamínico', 6.50, 15),
('741001007', 'Alcohol Gel 70% 500ml', 'Desinfectante antiséptico', 3.25, 20),
('741001008', 'Azitromicina 500mg - Caja x 3', 'Antibiótico macrólido', 18.00, 4),
('741001009', 'Jarabe para la Tos 120ml', 'Expectorante y mucolítico', 7.80, 5),
('741001010', 'Suero Oral Electrolitos 500ml', 'Solución rehidratante', 2.50, 25),
('741001011', 'Losartán 50mg - Caja x 30', 'Antihipertensivo', 14.20, 10),
('741001012', 'Metformina 850mg - Caja x 60', 'Hipoglucemiante oral', 11.00, 10),
('741001013', 'Complejo B Inyectable - Ampolla', 'Vitamínico neurotrópico', 4.50, 12),
('741001014', 'Gasas Estériles 10x10cm - Sobre', 'Material de curación', 0.75, 50),
('741001015', 'Clorfeniramina 4mg - Jarabe', 'Antihistamínico pediátrico', 4.00, 8);
GO

--15 Lotes y Vencimientos
INSERT INTO Lotes (id_producto, numero_lote, fecha_vencimiento, stock_lote) VALUES
(1, 'LOT-PAR-2026-01', '2027-06-15', 50),
(1, 'LOT-PAR-2026-02', '2028-01-10', 30),
(2, 'LOT-IBU-2026-01', '2026-12-01', 40), -- Próximo a vencer para pruebas
(3, 'LOT-AMX-2026-01', '2027-03-20', 25),
(4, 'LOT-LOR-2026-01', '2028-08-30', 60),
(5, 'LOT-OMP-2026-01', '2027-11-05', 45),
(6, 'LOT-VIT-2026-01', '2027-09-15', 70),
(7, 'LOT-ALG-2026-01', '2029-01-01', 100),
(8, 'LOT-AZI-2026-01', '2026-12-20', 15), -- Próximo a vencer para pruebas
(9, 'LOT-JAR-2026-01', '2027-04-10', 30),
(10, 'LOT-SUE-2026-01', '2028-02-28', 80),
(11, 'LOT-LOS-2026-01', '2027-08-14', 50),
(12, 'LOT-MET-2026-01', '2027-10-22', 65),
(13, 'LOT-CPB-2026-01', '2026-11-30', 20), -- Vence muy pronto (ideal para alerta crítica)
(14, 'LOT-GAS-2026-01', '2030-05-01', 200);
GO

--15 Movimientos de Inventario
INSERT INTO Movimientos (id_producto, tipo_movimiento, cantidad, id_proveedor, motivo) VALUES
(1, 'ENTRADA', 50, 1, 'Ingreso inicial por compra según factura F-001'),
(1, 'ENTRADA', 30, 2, 'Ingreso secundario según factura F-045'),
(2, 'ENTRADA', 40, 1, 'Ingreso por compra según factura F-002'),
(3, 'ENTRADA', 25, 3, 'Ingreso por compra según factura F-102'),
(4, 'ENTRADA', 60, 4, 'Ingreso por compra según factura F-554'),
(5, 'ENTRADA', 45, 5, 'Ingreso por compra según factura F-890'),
(6, 'ENTRADA', 70, 6, 'Ingreso por compra según factura F-321'),
(7, 'ENTRADA', 100, 7, 'Ingreso por compra según factura F-678'),
(8, 'ENTRADA', 15, 2, 'Ingreso por compra según factura F-099'),
(9, 'ENTRADA', 30, 8, 'Ingreso por compra según factura F-411'),
(10, 'ENTRADA', 80, 9, 'Ingreso por compra según factura F-765'),
(11, 'ENTRADA', 50, 10, 'Ingreso por compra según factura F-888'),
(1, 'SALIDA', 5, NULL, 'Venta a cliente en mostrador'),
(2, 'SALIDA', 2, NULL, 'Venta a cliente en mostrador'),
(4, 'SALIDA', 10, NULL, 'Venta a cliente en mostrador');
GO