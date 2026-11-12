const API_URL = 'http://localhost:5000/api';

// Tipos de datos
export interface ProductoInventario {
  id_producto: number;
  codigo_barra: string;
  nombre_producto: string;
  precio_unitario: number;
  stock_total: number;
  stock_minimo?: number;
}

export interface LoteInventario {
  id_lote: number;
  id_producto: number;
  numero_lote: string;
  fecha_vencimiento: string;
  stock_lote: number;
}

// Consultar inventario
export async function obtenerInventario(): Promise<ProductoInventario[]> {
  const respuesta = await fetch(`${API_URL}/inventario`);

  if (!respuesta.ok) {
    throw new Error('No se pudo consultar el inventario');
  }

  return await respuesta.json();
}

// Consultar lotes
export async function obtenerLotes(): Promise<LoteInventario[]> {
  const respuesta = await fetch(`${API_URL}/lotes`);

  if (!respuesta.ok) {
    throw new Error('No se pudieron consultar los lotes');
  }

  return await respuesta.json();
}

// Consultar vencimientos
export async function obtenerVencimientos() {
  const respuesta = await fetch(`${API_URL}/vencimientos`);

  if (!respuesta.ok) {
    throw new Error('No se pudieron consultar los vencimientos');
  }

  return await respuesta.json();
}

// Consultar stock bajo
export async function obtenerStockBajo() {
  const respuesta = await fetch(`${API_URL}/stock-bajo`);

  if (!respuesta.ok) {
    throw new Error('No se pudo consultar el stock bajo');
  }

  return await respuesta.json();
}

// Registrar entrada de varios productos
export async function registrarEntrada(data: {
  items: {
    id_producto: number;
    numero_lote: string;
    fecha_vencimiento: string;
    cantidad: number;
  }[];
  id_proveedor?: number;
}) {
  const respuesta = await fetch(`${API_URL}/entradas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(resultado.error || 'Error al registrar la entrada');
  }

  return resultado;
}

// Registrar salida
export async function registrarSalida(data: {
  id_producto: number;
  cantidad: number;
  motivo?: string;
}) {
  const respuesta = await fetch(`${API_URL}/salidas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(resultado.error || 'No se pudo registrar la salida');
  }

  return resultado;
}