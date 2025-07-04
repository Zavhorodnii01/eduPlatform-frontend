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
import TeacherAssignmentPage from './components/TeacherAssignmentPage'; // For viewing submissions list
import SubmissionGradingPage from './components/SubmissionGradingPage';
// Import CreateAssignmentPage directly
import CreateAssignmentPage from './components/CreateAssignmentPage'; // <-- Import the component directly
// Remove import for TeacherOnlyCreateAssignmentPage if you had it

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
          {/* Nested routes within the Layout */}
          <Route
            index // This is the default route for '/'
            element={
              <Home
                role={user?.role || 'STUDENT'}
                userId={user?.userId || undefined}
              />
            }
          />
          <Route
            path='course/:courseId'
            element={
              user?.role === 'TEACHER' ? (
                <TeacherCoursePage />
              ) : (
                <StudentCoursePage />
              )
            }
          />

          {/* Route for creating assignment */}
          {/* Pass the userRole down to the CreateAssignmentPage */}
          <Route
            path='course/:courseId/create-assignment' // <-- This path
            // Render CreateAssignmentPage directly and pass userRole
            element={<CreateAssignmentPage userRole={user?.role || null} />} // <-- Pass userRole here
          />

          {/* Student Assignment View */}
          <Route
            path='course/:courseId/assignment/:assignmentId'
            element={
              user?.role === 'TEACHER' ? (
                // Teachers go to submissions relative to the current route
                <Navigate to={`submissions`} replace />
              ) : (
                <StudentAssignmentPage /> // Students go to assignment view
              )
            }
          />

          {/* Teacher-specific assignment routes (Submissions List and Grading) */}
          {/* These routes might still benefit from passing userRole or having internal checks
             if they are strictly teacher-only, but the initial error is resolved
             by passing userRole to CreateAssignmentPage.
             Let's keep the existing checks/redirects in these routes for now.
          */}
          <Route
            path='course/:courseId/assignment/:assignmentId/submissions'
            element={
              user?.role === 'TEACHER' ? (
                <TeacherAssignmentPage /> // Teacher views submissions
              ) : (
                // Redirect non-teachers away
                <Navigate
                  to={`/course/:courseId/assignment/:assignmentId`}
                  replace
                />
              )
            }
          />
          <Route
            path='course/:courseId/assignment/:assignmentId/submission/:submissionId'
            element={
              user?.role === 'TEACHER' ? (
                <SubmissionGradingPage /> // Teacher views/grades a specific submission
              ) : (
                // Redirect non-teachers away
                <Navigate
                  to={`/course/:courseId/assignment/:assignmentId`}
                  replace
                />
              )
            }
          />

          {/* Catch-all for routes UNDER / that don't match (e.g., /some-bad-path) */}
          {/* This should be the last route within the Layout */}
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

        {/* Catch-all for routes OUTSIDE / (e.g., /login/extra or /another-bad-path) */}
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
