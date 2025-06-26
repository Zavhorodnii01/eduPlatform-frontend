import React, { useState, ChangeEvent } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import TextField from './common/TextField';
import Button from './common/Button';
import { useNavigate } from 'react-router-dom';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

interface LoginProps {
  onLogin: (user: { email: string; role: Role; userId?: number }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Login failed');
      }

      const token = await response.text();

      if (!token) {
        throw new Error('No authentication token received');
      }

      // Store token and decode to get user info
      localStorage.setItem('token', token);
      const payload = JSON.parse(atob(token.split('.')[1]));

      if (!payload.sub || !payload.role) {
        throw new Error('Token missing required claims');
      }

      onLogin({
        email: payload.sub,
        role: payload.role,
        userId: payload.userId,
      });
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      localStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      display='flex'
      justifyContent='center'
      alignItems='center'
      height='100vh'
      bgcolor='background.default'
    >
      <Paper elevation={3} sx={{ p: 4, width: 320 }}>
        <Typography variant='h5' gutterBottom align='center'>
          Login
        </Typography>
        {error && (
          <Typography color='error' align='center' sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <form onSubmit={handleSubmit}>
          <TextField
            label='Email'
            type='email'
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            required
            //fullWidth
            //sx={{ mb: 2 }}
          />
          <TextField
            label='Password'
            type='password'
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            required
            //fullWidth
            //sx={{ mb: 3 }}
          />
          <Button
            type='submit'
            disabled={isLoading}
            //fullWidth
            variant='contained'
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default Login;
