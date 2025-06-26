import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'default';
}

const colors = {
  primary: '#1976d2',
  secondary: '#9c27b0',
  default: '#e0e0e0',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'contained',
  color = 'primary',
  children,
  style,
  ...rest
}) => {
  const baseStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 'bold',
    color: variant === 'contained' ? 'white' : colors[color],
    backgroundColor: variant === 'contained' ? colors[color] : 'transparent',
    border: variant === 'outlined' ? `2px solid ${colors[color]}` : 'none',
    ...style,
  };

  return (
    <button style={baseStyle} {...rest}>
      {children}
    </button>
  );
};

export default Button;
