import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  variant?: 'outlined' | 'filled' | 'standard';
  error?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  variant = 'outlined',
  error = false,
  ...rest
}) => {
  const baseStyle = {
    padding: '8px',
    borderRadius: '4px',
    border: variant === 'outlined' ? '1px solid #ccc' : 'none',
    backgroundColor: variant === 'filled' ? '#f2f2f2' : 'white',
    outline: error ? '2px solid red' : 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  return (
    <label style={{ display: 'block', marginBottom: '8px' }}>
      {label && (
        <span style={{ marginBottom: '4px', display: 'block' }}>{label}</span>
      )}
      <input style={baseStyle} {...rest} />
    </label>
  );
};

export default Input;
