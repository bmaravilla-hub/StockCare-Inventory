"""Operaciones de inventario contra SQL Server."""

from database.connection import obtenerConexion


def obtener_inventario():
    """Devuelve el inventario actual como una lista de diccionarios."""
    conexion = obtenerConexion()
    if not conexion:
        raise ConnectionError("No se pudo conectar a la base de datos")

    cursor = None
    try:
        cursor = conexion.cursor()
        cursor.execute(
            """
            SELECT id_producto, codigo_barra, nombre_producto,
                   precio_unitario, stock_total
            FROM VW_InventarioActual
            """
        )
        columnas = [columna[0] for columna in cursor.description]
        return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]
    finally:
        if cursor is not None:
            cursor.close()
        conexion.close()


def registrar_entrada(
    id_producto,
    numero_lote,
    fecha_vencimiento,
    cantidad,
    id_proveedor=None,
):
    """Registra un lote nuevo y su movimiento de entrada."""
    conexion = obtenerConexion()
    if not conexion:
        raise ConnectionError("No se pudo conectar a la base de datos")

    cursor = None
    try:
        cursor = conexion.cursor()
        cursor.execute(
            """
            INSERT INTO Lotes (id_producto, numero_lote, fecha_vencimiento, stock_lote)
            VALUES (?, ?, ?, ?)
            """,
            (id_producto, numero_lote, fecha_vencimiento, cantidad),
        )
        cursor.execute(
            """
            INSERT INTO Movimientos (id_producto, tipo_movimiento, cantidad, id_proveedor, motivo)
            VALUES (?, 'ENTRADA', ?, ?, 'Ingreso de mercadería vía Web')
            """,
            (id_producto, cantidad, id_proveedor),
        )
        conexion.commit()
    except Exception:
        try:
            conexion.rollback()
        except Exception:
            pass
        raise
    finally:
        if cursor is not None:
            cursor.close()
        conexion.close()
