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


def obtener_movimientos():
    """Devuelve el historial de movimientos guardado en SQL Server."""
    conexion = obtenerConexion()
    if not conexion:
        raise ConnectionError("No se pudo conectar a la base de datos")

    cursor = None
    try:
        cursor = conexion.cursor()
        cursor.execute(
            """
            SELECT
                M.id_movimiento,
                M.id_producto,
                CONVERT(VARCHAR(10), M.fecha_movimiento, 23) AS fecha,
                CONVERT(VARCHAR(33), M.fecha_movimiento, 126) AS creado,
                M.tipo_movimiento,
                M.cantidad,
                M.motivo,
                P.nombre_proveedor,
                ISNULL(V.stock_total, 0) - ISNULL(
                    SUM(
                        CASE
                            WHEN M.tipo_movimiento = 'ENTRADA' THEN M.cantidad
                            ELSE -M.cantidad
                        END
                    ) OVER (
                        PARTITION BY M.id_producto
                        ORDER BY M.fecha_movimiento, M.id_movimiento
                        ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING
                    ),
                    0
                ) AS stock_resultante
            FROM Movimientos M
            LEFT JOIN Proveedores P
                ON M.id_proveedor = P.id_proveedor
            LEFT JOIN VW_InventarioActual V
                ON M.id_producto = V.id_producto
            ORDER BY M.fecha_movimiento DESC, M.id_movimiento DESC
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

def registrar_entrada_multiple(items, id_proveedor=None):
    """Registra varios lotes y movimientos en una sola transacción."""

    if not items:
        raise ValueError("La entrada debe contener al menos un producto")

    conexion = obtenerConexion()
    if not conexion:
        raise ConnectionError("No se pudo conectar a la base de datos")

    cursor = None

    try:
        cursor = conexion.cursor()

        for item in items:
            id_producto = int(item["id_producto"])
            numero_lote = item["numero_lote"]
            fecha_vencimiento = item["fecha_vencimiento"]
            cantidad = int(item["cantidad"])

            if id_producto <= 0 or cantidad <= 0:
                raise ValueError("El producto y la cantidad deben ser válidos")

            cursor.execute(
                """
                INSERT INTO Lotes
                    (id_producto, numero_lote, fecha_vencimiento, stock_lote)
                VALUES (?, ?, ?, ?)
                """,
                (id_producto, numero_lote, fecha_vencimiento, cantidad),
            )

            cursor.execute(
                """
                INSERT INTO Movimientos
                    (id_producto, tipo_movimiento, cantidad, id_proveedor, motivo)
                VALUES (?, 'ENTRADA', ?, ?, 'Ingreso de mercadería vía Web')
                """,
                (id_producto, cantidad, id_proveedor),
            )

        conexion.commit()

    except Exception:
        conexion.rollback()
        raise

    finally:
        if cursor is not None:
            cursor.close()
        conexion.close()

def registrar_salida(id_producto, cantidad, motivo="Salida de inventario"):
    """Registra una salida y descuenta las unidades de los lotes."""

    conexion = obtenerConexion()
    if not conexion:
        raise ConnectionError("No se pudo conectar a la base de datos")

    cursor = None

    try:
        cursor = conexion.cursor()

        # Consultar lotes disponibles, priorizando los próximos a vencer
        cursor.execute(
            """
            SELECT id_lote, stock_lote
            FROM Lotes WITH (UPDLOCK, HOLDLOCK)
            WHERE id_producto = ? AND stock_lote > 0
            ORDER BY fecha_vencimiento ASC, id_lote ASC
            """,
            (id_producto,)
        )

        lotes = cursor.fetchall()
        stock_total = sum(lote.stock_lote for lote in lotes)

        if stock_total < cantidad:
            raise ValueError(
                f"Stock insuficiente. Disponible: {stock_total}"
            )

        pendiente = cantidad

        for lote in lotes:
            if pendiente <= 0:
                break

            descontar = min(lote.stock_lote, pendiente)

            cursor.execute(
                """
                UPDATE Lotes
                SET stock_lote = stock_lote - ?
                WHERE id_lote = ?
                """,
                (descontar, lote.id_lote)
            )

            pendiente -= descontar

        # Registrar el movimiento
        cursor.execute(
            """
            INSERT INTO Movimientos
                (id_producto, tipo_movimiento, cantidad, motivo)
            VALUES (?, 'SALIDA', ?, ?)
            """,
            (id_producto, cantidad, motivo)
        )

        conexion.commit()

    except Exception:
        conexion.rollback()
        raise

    finally:
        if cursor is not None:
            cursor.close()
        conexion.close()

def obtener_proximos_vencer():
    """Consulta productos que vencerán en los próximos 90 días."""

    conexion = obtenerConexion()
    if not conexion:
        raise ConnectionError("No se pudo conectar a la base de datos")

    cursor = None

    try:
        cursor = conexion.cursor()

        cursor.execute("""
            SELECT
                P.id_producto,
                P.nombre_producto,
                L.numero_lote,
                L.fecha_vencimiento,
                L.stock_lote
            FROM Productos P
            INNER JOIN Lotes L
                ON P.id_producto = L.id_producto
            WHERE L.fecha_vencimiento >= CAST(GETDATE() AS DATE)
              AND L.fecha_vencimiento <= DATEADD(DAY, 90, GETDATE())
              AND L.stock_lote > 0
            ORDER BY L.fecha_vencimiento ASC
        """)

        columnas = [columna[0] for columna in cursor.description]

        return [
            dict(zip(columnas, fila))
            for fila in cursor.fetchall()
        ]

    finally:
        if cursor is not None:
            cursor.close()
        conexion.close()

def obtener_stock_bajo():
    """Consulta productos cuyo stock está por debajo del mínimo."""

    conexion = obtenerConexion()
    if not conexion:
        raise ConnectionError("No se pudo conectar a la base de datos")

    cursor = None

    try:
        cursor = conexion.cursor()

        cursor.execute("""
            SELECT
                V.id_producto,
                V.codigo_barra,
                V.nombre_producto,
                V.precio_unitario,
                V.stock_total,
                P.stock_minimo
            FROM VW_InventarioActual V
            INNER JOIN Productos P
                ON V.id_producto = P.id_producto
            WHERE V.stock_total <= P.stock_minimo
            """)

        columnas = [columna[0] for columna in cursor.description]

        return [
            dict(zip(columnas, fila))
            for fila in cursor.fetchall()
        ]

    finally:
        if cursor is not None:
            cursor.close()
        conexion.close()

def obtener_lotes():
    """Consulta los lotes registrados en la base de datos."""

    conexion = obtenerConexion()
    if not conexion:
        raise ConnectionError("No se pudo conectar a la base de datos")

    cursor = None

    try:
        cursor = conexion.cursor()

        cursor.execute("""
            SELECT
                id_lote,
                id_producto,
                numero_lote,
                fecha_vencimiento,
                stock_lote
            FROM Lotes
        """)

        columnas = [columna[0] for columna in cursor.description]

        return [
            dict(zip(columnas, fila))
            for fila in cursor.fetchall()
        ]

    finally:
        if cursor is not None:
            cursor.close()
        conexion.close()


def obtener_productos():
    """Devuelve los productos registrados en la base de datos."""

    conexion = obtenerConexion()
    if not conexion:
        raise ConnectionError("No se pudo conectar a la base de datos")

    cursor = None

    try:
        cursor = conexion.cursor()
        cursor.execute(
            """
            SELECT
                id_producto,
                codigo_barra,
                nombre_producto,
                descripcion,
                precio_unitario,
                stock_minimo
            FROM Productos
            """
        )
        columnas = [columna[0] for columna in cursor.description]
        return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]

    finally:
        if cursor is not None:
            cursor.close()
        conexion.close()


def crear_producto(
    codigo_barra,
    nombre_producto,
    descripcion,
    precio_unitario,
    stock_minimo,
) -> int:
    """Registra un nuevo producto."""

    conexion = obtenerConexion()
    if not conexion:
        raise ConnectionError("No se pudo conectar a la base de datos")

    cursor = None

    try:
        cursor = conexion.cursor()
        cursor.execute(
            """
            INSERT INTO Productos (codigo_barra, nombre_producto, descripcion, precio_unitario, stock_minimo)
            OUTPUT INSERTED.id_producto
            VALUES (?, ?, ?, ?, ?)
            """,
            (codigo_barra, nombre_producto, descripcion, precio_unitario, stock_minimo),
        )
        fila = cursor.fetchone()
        if fila is None:
            raise RuntimeError("SQL Server no devolvió el ID del producto creado")
        conexion.commit()
        return int(fila[0])
    except Exception:
        conexion.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        conexion.close()


def actualizar_producto(
    id_producto,
    codigo_barra,
    nombre_producto,
    descripcion,
    precio_unitario,
    stock_minimo,
):
    """Actualiza un producto existente."""

    conexion = obtenerConexion()
    if not conexion:
        raise ConnectionError("No se pudo conectar a la base de datos")

    cursor = None

    try:
        cursor = conexion.cursor()
        cursor.execute(
            """
            UPDATE Productos
            SET codigo_barra = ?, nombre_producto = ?, descripcion = ?, precio_unitario = ?, stock_minimo = ?
            WHERE id_producto = ?
            """,
            (codigo_barra, nombre_producto, descripcion, precio_unitario, stock_minimo, id_producto),
        )
        conexion.commit()
    except Exception:
        conexion.rollback()
        raise
    finally:
        if cursor is not None:
            cursor.close()
        conexion.close()
