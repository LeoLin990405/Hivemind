import React from 'react';

interface TypographyProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'caption';
  color?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'success' | 'warning';
  bold?: boolean;
  italic?: boolean;
  children: React.ReactNode;
}

export const Typography: React.FC<TypographyProps> = ({ variant = 'body1', color = 'primary', bold = false, italic = false, children, className = '', ...props }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'h1':
        return 'text-4xl font-bold leading-tight';
      case 'h2':
        return 'text-3xl font-bold leading-tight';
      case 'h3':
        return 'text-2xl font-bold leading-tight';
      case 'h4':
        return 'text-xl font-semibold leading-snug';
      case 'h5':
        return 'text-lg font-semibold leading-snug';
      case 'h6':
        return 'text-base font-semibold leading-snug';
      case 'body1':
        return 'text-base leading-relaxed';
      case 'body2':
        return 'text-sm leading-relaxed';
      case 'caption':
        return 'text-xs leading-normal';
      default:
        return 'text-base';
    }
  };

  const getColorStyles = () => {
    switch (color) {
      case 'primary':
        return 'text-t-primary';
      case 'secondary':
        return 'text-t-secondary';
      case 'tertiary':
        return 'text-t-disabled';
      case 'error':
        return 'text-danger';
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      default:
        return 'text-t-primary';
    }
  };

  const Component = variant.startsWith('h') ? (variant as any) : 'div';

  return (
    <Component
      className={`
        ${getVariantStyles()}
        ${getColorStyles()}
        ${bold ? 'font-bold' : ''}
        ${italic ? 'italic' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </Component>
  );
};
