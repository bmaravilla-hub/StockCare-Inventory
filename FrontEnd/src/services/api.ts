const API_URL = 'http://localhost:5000/api';

const TOKEN_KEY = 'stockcare_token';

export const obtenerToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const headersConToken = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = obtenerToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export async function login({ username, password }: { username: string; password: string }) {
  const respuesta = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(resultado.error || 'Error al iniciar sesión');
  }

  localStorage.setItem(TOKEN_KEY, resultado.token);
  return resultado;
}

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
  const respuesta = await fetch(`${API_URL}/inventario`, { headers: headersConToken() });

  if (!respuesta.ok) {
    throw new Error('No se pudo consultar el inventario');
  }

  return await respuesta.json();
}

// Consultar lotes
export async function obtenerLotes(): Promise<LoteInventario[]> {
  const respuesta = await fetch(`${API_URL}/lotes`, { headers: headersConToken() });

  if (!respuesta.ok) {
    throw new Error('No se pudieron consultar los lotes');
  }

  return await respuesta.json();
}

export interface MovimientoBackend {
  id_movimiento: number;
  id_producto: number;
  fecha: string;
  creado: string;
  tipo_movimiento: 'ENTRADA' | 'SALIDA';
  cantidad: number;
  motivo: string | null;
  nombre_proveedor: string | null;
  stock_resultante: number;
}

export async function obtenerMovimientos(): Promise<MovimientoBackend[]> {
  const respuesta = await fetch(`${API_URL}/movimientos`, { headers: headersConToken() });

  if (!respuesta.ok) {
    throw new Error('No se pudieron consultar los movimientos');
  }

  return await respuesta.json();
}

// Consultar vencimientos
export async function obtenerVencimientos() {
  const respuesta = await fetch(`${API_URL}/vencimientos`, { headers: headersConToken() });

  if (!respuesta.ok) {
    throw new Error('No se pudieron consultar los vencimientos');
  }

  return await respuesta.json();
}

// Consultar stock bajo
export async function obtenerStockBajo() {
  const respuesta = await fetch(`${API_URL}/stock-bajo`, { headers: headersConToken() });

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
    headers: headersConToken(),
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
    headers: headersConToken(),
    body: JSON.stringify(data),
  });

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(resultado.error || 'No se pudo registrar la salida');
  }

  return resultado;
}

// Tipos de productos devueltos por el backend
export interface ProductoBackend {
  id_producto: number;
  codigo_barra: string;
  nombre_producto: string;
  descripcion?: string | null;
  precio_unitario: number;
  stock_minimo: number;
}

// Consultar productos
export async function obtenerProductos(): Promise<ProductoBackend[]> {
  const respuesta = await fetch(`${API_URL}/productos`, { headers: headersConToken() });

  if (!respuesta.ok) {
    throw new Error('No se pudo consultar los productos');
  }

  return await respuesta.json();
}

// Registrar producto
export async function crearProducto(data: {
  codigo_barra: string;
  nombre_producto: string;
  descripcion?: string;
  precio_unitario: number;
  stock_minimo: number;
}): Promise<{ id_producto: number; mensaje: string }> {
  const respuesta = await fetch(`${API_URL}/productos`, {
    method: 'POST',
    headers: headersConToken(),
    body: JSON.stringify(data),
  });

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(resultado.error || 'Error al registrar el producto');
  }

  if (!Number.isInteger(resultado.id_producto) || resultado.id_producto <= 0) {
    throw new Error('La API no devolvió un ID válido para el producto registrado');
  }

  return resultado;
}

// Actualizar producto
export async function actualizarProducto(
  id: number,
  data: {
    codigo_barra: string;
    nombre_producto: string;
    descripcion?: string;
    precio_unitario: number;
    stock_minimo: number;
  }
) {
  const respuesta = await fetch(`${API_URL}/productos/${id}`, {
    method: 'PUT',
    headers: headersConToken(),
    body: JSON.stringify(data),
  });

  const resultado = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(resultado.error || 'Error al actualizar el producto');
  }

  return resultado;
}