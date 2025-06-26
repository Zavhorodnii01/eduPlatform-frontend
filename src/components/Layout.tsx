// components/Layout.tsx
import React from 'react';
import { Box, Typography, Avatar, Button } from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom'; // Import Outlet and useNavigate

interface LayoutProps {
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | null; // Allow null if role isn't loaded yet
  email: string | null; // Allow null if email isn't loaded yet
  handleLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ role, email, handleLogout }) => {
  // No need for local state or effects in Layout, it just renders structure

  return (
    <Box display='flex' height='100vh'>
      {/* Sidebar */}
      {/* You might want to conditionally hide the sidebar on certain routes (e.g., login) */}
      {/* But for routes wrapped by this layout, it should show */}
      <Box
        width='250px'
        bgcolor='#f5f5f5'
        p={2}
        sx={{
          borderRight: '1px solid #e0e0e0',
          flexShrink: 0,
          overflowY: 'auto',
        }} // Added overflowY for long sidebar content
      >
        <Typography variant='h6' sx={{ fontWeight: 'bold', mb: 3 }}>
          EduPlatform
        </Typography>

        {/* User Info (Conditionally render if role/email are available) */}
        <Box display='flex' alignItems='center' mb={2}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 1.5 }}>
            {email?.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant='subtitle2'>{email}</Typography>
            <Typography variant='caption' color='text.secondary'>
              {role?.toLowerCase()}
            </Typography>
          </Box>
        </Box>

        <Button
          variant='contained'
          color='secondary'
          onClick={handleLogout}
          sx={{ mt: 2, width: '100%' }}
        >
          Logout
        </Button>
        {/* Add common navigation links here */}
        {/* Example: */}
        {/* <Box mt={3}>
            <Button component={RouterLink} to="/" startIcon={<HomeIcon />} sx={{ width: '100%', justifyContent: 'flex-start' }}>
               Dashboard
             </Button>
             {role === 'STUDENT' && (
                 <Button component={RouterLink} to="/my-courses" startIcon={<SchoolIcon />} sx={{ width: '100%', justifyContent: 'flex-start' }}>
                    My Courses
                  </Button>
             )}
             {role === 'TEACHER' && ( ... )}
         </Box> */}
      </Box>

      {/* Main Content - Renders the matched child route */}
      <Box flex={1} p={4} sx={{ overflowY: 'auto' }}>
        <Outlet /> {/* <-- This is where the content of child routes goes */}
      </Box>
    </Box>
  );
};

export default Layout;
