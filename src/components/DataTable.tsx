import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  Inbox,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from './Button';

export interface TableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  caption?: string;
  enablePagination?: boolean;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  error = null,
  onRetry,
  emptyTitle = 'No se encontraron registros',
  emptyDescription = 'Intente ajustar los filtros o registre un nuevo elemento.',
  emptyAction,
  onRowClick,
  caption,
  enablePagination = true,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50],
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const totalPages = useMemo(() => {
    if (!enablePagination || pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(data.length / pageSize));
  }, [data.length, pageSize, enablePagination]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const { paginatedData, startIndex, endIndex } = useMemo(() => {
    if (!enablePagination) {
      return {
        paginatedData: data,
        startIndex: 0,
        endIndex: data.length,
      };
    }
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, data.length);
    return {
      paginatedData: data.slice(start, end),
      startIndex: start,
      endIndex: end,
    };
  }, [data, currentPage, pageSize, enablePagination]);

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        {/* Esqueleto de tarjetas en móvil */}
        <div className="divide-y divide-slate-100 p-4 md:hidden space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="space-y-2.5 py-2 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-20 rounded bg-slate-200" />
                <div className="h-3.5 w-32 rounded bg-slate-200" />
              </div>
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-24 rounded bg-slate-200" />
                <div className="h-5 w-20 rounded-full bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
        {/* Esqueleto de filas en escritorio */}
        <div className="hidden md:block divide-y divide-slate-100 p-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-4 py-3.5 animate-pulse">
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="h-4 flex-1 rounded bg-slate-200" />
              <div className="h-4 w-28 rounded bg-slate-200" />
              <div className="h-6 w-20 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
        <p className="sr-only">Cargando información...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-slate-900">
          Error al cargar los datos
        </h3>
        <p className="mt-1 max-w-md text-xs text-slate-600">{error}</p>
        {onRetry && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={onRetry}
            >
              Reintentar
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Inbox className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-slate-900">{emptyTitle}</h3>
        <p className="mt-1 max-w-md text-xs text-slate-500">{emptyDescription}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      {/* Vista móvil: Tarjetas apiladas (visible solo en pantallas menores a md) */}
      <div className="divide-y divide-slate-100 md:hidden bg-white">
        {paginatedData.map((row) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`p-4 transition-colors space-y-2.5 ${
              onRowClick
                ? 'cursor-pointer hover:bg-teal-50/40 active:bg-teal-50'
                : 'hover:bg-slate-50/60'
            }`}
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className="flex items-start justify-between gap-3 text-sm py-1 border-b border-slate-50 last:border-0"
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0 mt-0.5">
                  {col.header}
                </span>
                <div
                  className={`text-slate-800 ${
                    col.align === 'right' ? 'text-right' : 'text-right'
                  }`}
                >
                  {col.render(row)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Vista de escritorio: Tabla tradicional (oculta en móviles, visible en md+) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                  } ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedData.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={
                  onRowClick
                    ? 'cursor-pointer transition-colors hover:bg-teal-50/40'
                    : 'hover:bg-slate-50/70 transition-colors'
                }
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3.5 text-slate-700 align-middle ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    } ${col.className ?? ''}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {enablePagination && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center justify-between sm:justify-start w-full sm:w-auto gap-2.5">
            <span>
              Mostrando <strong className="font-semibold text-slate-900">{data.length === 0 ? 0 : startIndex + 1}</strong> a{' '}
              <strong className="font-semibold text-slate-900">{endIndex}</strong> de{' '}
              <strong className="font-semibold text-slate-900">{data.length}</strong> registros
            </span>

            <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-slate-300">
              <label htmlFor="pageSizeSelect" className="text-slate-500 whitespace-nowrap">
                Filas:
              </label>
              <select
                id="pageSizeSelect"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-2xs focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-center w-full sm:w-auto gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
              title="Primera página"
              aria-label="Primera página"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              title="Página anterior"
              aria-label="Página anterior"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-2 font-medium text-slate-700">
              Página {currentPage} de {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              title="Página siguiente"
              aria-label="Página siguiente"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              title="Última página"
              aria-label="Última página"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
