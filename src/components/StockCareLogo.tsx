import React from 'react';
import stockCareLogoImg from '../assets/stockcare-logo.png';

interface StockCareLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  subtitle?: string;
  card?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<StockCareLogoProps['size']>, string> = {
  sm: 'h-10',
  md: 'h-16',
  lg: 'h-24',
  xl: 'h-28',
};

export const StockCareLogo: React.FC<StockCareLogoProps> = ({
  size = 'md',
  subtitle,
  card = false,
  className = '',
}) => {
  const content = (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <img
        src={stockCareLogoImg}
        alt="StockCare - Sistema de Gestión y Control de Inventario de Farmacia"
        className={`${SIZE_CLASSES[size]} w-auto object-contain`}
      />
      {subtitle && (
        <span className="mt-1 text-[11px] font-semibold tracking-wide text-slate-500">
          {subtitle}
        </span>
      )}
    </div>
  );

  if (card) {
    return (
      <div className="inline-flex items-center justify-center rounded-xl bg-white p-3.5 shadow-sm">
        {content}
      </div>
    );
  }

  return content;
};
