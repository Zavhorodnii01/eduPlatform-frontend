import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import Login from './components/Login';
import Home from './components/Home';
import StudentCoursePage from './components/StudentCoursePage';
import TeacherCoursePage from './components/TeacherCoursePage';
import StudentAssignmentPage from './components/StudentAssignmentPage';
import TeacherAssignmentPage from './components/TeacherAssignmentPage';
import SubmissionGradingPage from './components/SubmissionGradingPage';
import Layout from './components/Layout';
import { jwtDecode } from 'jwt-decode';
import { Typography, Box, CircularProgress } from '@mui/material';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

interface User {
  email: string;
  role: Role;
  userId?: number;
}

interface JwtPayload {
  email?: string;
  sub?: string;
  role?: string;
  exp?: number;
  userId?: number;
}

const isValidRole = (role: string | undefined | null): role is Role => {
  return (
    typeof role === 'string' &&
    (role === 'STUDENT' || role === 'TEACHER' || role === 'ADMIN')
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  useEffect(() => {
    console.log('App useEffect: Running token check...');
    const token = localStorage.getItem('token');

    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp && decoded.exp < currentTime) {
          console.warn('App useEffect: Token expired.');
          localStorage.removeItem('token');
          setUser(null);
        } else {
          const userEmail = decoded.sub || decoded.email || null;
          if (userEmail && isValidRole(decoded.role)) {
            const userData: User = {
              email: userEmail,
              role: decoded.role as Role,
              userId: decoded.userId,
            };
            setUser(userData);
          } else {
            console.warn('App useEffect: Invalid token payload');
            localStorage.removeItem('token');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('App useEffect: Token decode error:', error);
        localStorage.removeItem('token');
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoadingUser(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => {
    if (loadingUser) {
      return (
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          height='100vh'
          flexDirection='column'
        >
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>Loading user session...</Typography>
        </Box>
      );
    }

    if (!user) {
      return <Navigate to='/login' replace />;
    }

    return <>{children}</>;
  };

  return (
    <Router>
      <Routes>
        <Route
          path='/login'
          element={
            user && !loadingUser ? (
              <Navigate to='/' replace />
            ) : (
              <Login onLogin={setUser} />
            )
          }
        />

        <Route
          path='/'
          element={
            <ProtectedRoute>
              <Layout
                email={user?.email || null}
                role={user?.role || null}
                handleLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <Home
                role={user?.role || 'STUDENT'}
                userId={user?.userId || undefined}
              />
            }
          />
          <Route
            path='/course/:courseId'
            element={
              user?.role === 'TEACHER' ? (
                <TeacherCoursePage />
              ) : (
                <StudentCoursePage />
              )
            }
          />
          <Route
            path='course/:courseId/assignment/:assignmentId'
            element={
              user?.role === 'TEACHER' ? (
                <Navigate to={`submissions`} replace />
              ) : (
                <StudentAssignmentPage />
              )
            }
          />
          {/* New teacher-specific routes */}
          <Route
            path='course/:courseId/assignment/:assignmentId/submissions'
            element={<TeacherAssignmentPage />}
          />
          <Route
            path='course/:courseId/assignment/:assignmentId/submission/:submissionId'
            element={<SubmissionGradingPage />}
          />
          <Route
            path='*'
            element={
              <Box p={4}>
                <Typography variant='h4'>404 - Content Not Found</Typography>
                <Typography>
                  The requested content does not exist within this section.
                </Typography>
              </Box>
            }
          />
        </Route>

        <Route
          path='*'
          element={
            <Box
              display='flex'
              justifyContent='center'
              alignItems='center'
              height='100vh'
            >
              <Typography variant='h4'>404 - Page Not Found</Typography>
            </Box>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
