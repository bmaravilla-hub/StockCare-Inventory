import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  Clock,
  PackageX,
  XCircle,
} from 'lucide-react';
import type {
  BatchExpiryStatus,
  MovementType,
  ProductStatus,
  StockLevelStatus,
  SupplierStatus,
} from '../types';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  tone?: BadgeTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-rose-50 text-rose-800 border-rose-200',
  info: 'bg-teal-50 text-teal-800 border-teal-200',
};

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  icon,
  children,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {icon && <span className="shrink-0 inline-flex">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export const BatchStatusBadge: React.FC<{
  status: BatchExpiryStatus;
  labelOverride?: string;
}> = ({ status, labelOverride }) => {
  if (status === 'Vencido') {
    return (
      <Badge tone="danger" icon={<XCircle className="h-3.5 w-3.5" aria-hidden="true" />}>
        {labelOverride ?? 'Vencido'}
      </Badge>
    );
  }
  if (status === 'ProximoAVencer') {
    return (
      <Badge tone="warning" icon={<Clock className="h-3.5 w-3.5" aria-hidden="true" />}>
        {labelOverride ?? 'Próximo a vencer'}
      </Badge>
    );
  }
  return (
    <Badge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}>
      {labelOverride ?? 'Vigente'}
    </Badge>
  );
};

export const StockLevelBadge: React.FC<{ status: StockLevelStatus }> = ({
  status,
}) => {
  if (status === 'SinExistencias') {
    return (
      <Badge tone="danger" icon={<PackageX className="h-3.5 w-3.5" aria-hidden="true" />}>
        Sin existencias
      </Badge>
    );
  }
  if (status === 'StockBajo') {
    return (
      <Badge tone="warning" icon={<AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}>
        Stock bajo
      </Badge>
    );
  }
  return (
    <Badge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}>
      Normal
    </Badge>
  );
};

export const MovementTypeBadge: React.FC<{ type: MovementType }> = ({ type }) => {
  if (type === 'Entrada') {
    return (
      <Badge tone="info" icon={<ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />}>
        Entrada
      </Badge>
    );
  }
  return (
    <Badge tone="warning" icon={<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />}>
      Salida
    </Badge>
  );
};

export const ProductStatusBadge: React.FC<{ status: ProductStatus }> = ({
  status,
}) => {
  if (status === 'Activo') {
    return (
      <Badge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}>
        Activo
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" icon={<Ban className="h-3.5 w-3.5" aria-hidden="true" />}>
      Inactivo
    </Badge>
  );
};

export const SupplierStatusBadge: React.FC<{ status: SupplierStatus }> = ({
  status,
}) => {
  if (status === 'Activo') {
    return (
      <Badge tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}>
        Activo
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" icon={<Ban className="h-3.5 w-3.5" aria-hidden="true" />}>
      Inactivo
    </Badge>
  );
};

