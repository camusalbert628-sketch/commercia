import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle' | 'card' | 'stat-card' | 'table-row';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
  style = {},
}) => {
  const getStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'circle':
        return {
          width: width || '40px',
          height: height || '40px',
          borderRadius: '50%',
        };
      case 'card':
        return {
          width: width || '100%',
          height: height || '160px',
          borderRadius: '16px',
        };
      case 'stat-card':
        return {
          width: width || '100%',
          height: height || '120px',
          borderRadius: '16px',
        };
      case 'table-row':
        return {
          width: width || '100%',
          height: height || '48px',
          borderRadius: '8px',
          margin: '6px 0',
        };
      case 'rect':
        return {
          width: width || '100%',
          height: height || '24px',
          borderRadius: '8px',
        };
      case 'text':
      default:
        return {
          width: width || '100%',
          height: height || '16px',
          borderRadius: '6px',
        };
    }
  };

  const elements = Array.from({ length: count }, (_, idx) => (
    <div
      key={idx}
      className={`skeleton-shimmer ${className}`}
      style={{
        ...getStyles(),
        ...style,
      }}
    />
  ));

  return count === 1 ? elements[0] : <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>{elements}</div>;
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="page-wrapper" style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Top Banner Skeleton */}
      <Skeleton variant="card" height="72px" style={{ marginBottom: '24px', borderRadius: '16px' }} />

      {/* KPI Stat Grid Skeleton */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
      </div>

      {/* Copilot Card Skeleton */}
      <Skeleton variant="card" height="150px" style={{ marginBottom: '24px', borderRadius: '18px' }} />

      {/* Charts Skeleton Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <Skeleton variant="card" height="320px" style={{ borderRadius: '18px' }} />
        <Skeleton variant="card" height="320px" style={{ borderRadius: '18px' }} />
      </div>

      {/* Recent Sales Table Skeleton */}
      <Skeleton variant="card" height="260px" style={{ borderRadius: '18px' }} />
    </div>
  );
};
