import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Avatar,
  Chip, // Keep Chip import - it IS used later in rendering submissions
  Button,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowBack, InsertDriveFile } from '@mui/icons-material';

// --- Frontend Interfaces ---

interface UserDto {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

interface Submission {
  id: number;
  studentId: number;
  submittedAt: string;
  grade?: number | null;
  status: 'SUBMITTED' | 'GRADED';
  fileUrl?: string | null;
  comments?: string | null;
  gradedAt?: string | null;
}

interface AssignmentDetails {
  id: number;
  title: string;
  description?: string;
  dueDate: string;
  fileUrl?: string | null;
}

// --- Component ---

const TeacherAssignmentPage: React.FC = () => {
  const { courseId, assignmentId } = useParams();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignmentDetails, setAssignmentDetails] =
    useState<AssignmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDetailsMap, setUserDetailsMap] = useState<Record<number, UserDto>>(
    {}
  );
  const [loadingUsers, setLoadingUsers] = useState(false);

  const API_BASE_URL = 'http://localhost:8081'; // <-- Assuming your API runs on this URL

  const getFullFileUrl = (url?: string | null): string | null => {
    if (!url) return null;
    // Ensure URL is relative before prepending base (handle URLs starting with '/')
    const relativeUrl = url.startsWith('/') ? url.substring(1) : url;
    return `${API_BASE_URL}/${relativeUrl}`; // Construct full URL
  };

  // --- Helper function for fetching user details (used within useEffect) ---
  const fetchUserDetails = async (userId: number): Promise<UserDto> => {
    const token = localStorage.getItem('token');
    if (!token)
      throw new Error('Authentication token not found. Please log in.');
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json', // Added Accept header
      },
    });
    if (!response.ok) {
      // Attempt to read error message from backend
      const errorText = await response
        .text()
        .catch(() => 'Failed to fetch user details');
      throw new Error(
        `Failed to fetch user details: ${response.statusText} - ${errorText}`
      );
    }
    return await response.json();
  };

  // --- useEffect for Data Loading ---
  useEffect(() => {
    if (!assignmentId) {
      setLoading(false);
      setError('Assignment ID is missing from the URL.');
      return;
    }
    // assignmentId from useParams is a string, use it directly in template literals

    // Define fetch functions *inside* useEffect to use assignmentId directly and access other state/props
    const fetchAssignmentDetails = async (): Promise<AssignmentDetails> => {
      const token = localStorage.getItem('token');
      if (!token)
        throw new Error('Authentication token not found. Please log in.');
      const response = await fetch(
        `${API_BASE_URL}/api/assignments/getAssignmentById/${assignmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json', // Added Accept header
          },
        }
      );
      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => 'Failed to load assignment');
        throw new Error(
          `Failed to load assignment: ${response.statusText} - ${errorText}`
        );
      }
      return await response.json();
    };

    const fetchSubmissions = async (): Promise<Submission[]> => {
      const token = localStorage.getItem('token');
      if (!token)
        throw new Error('Authentication token not found. Please log in.');
      const response = await fetch(
        `${API_BASE_URL}/api/submissions/getSubmissionsByAssignmentId/${assignmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json', // Added Accept header
          },
        }
      );
      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => 'Failed to load submissions');
        throw new Error(
          `Failed to load submissions: ${response.statusText} - ${errorText}`
        );
      }
      return await response.json();
    };

    const fetchUserDetailsForSubmissions = async (
      submissions: Submission[] // Pass the fetched submissions list
    ) => {
      try {
        setLoadingUsers(true);
        // Extract unique student IDs from the provided submissions list
        const uniqueStudentIds = Array.from(
          new Set(submissions.map((s) => s.studentId))
        );

        // Create an object to build the user details map
        const userDetails: Record<number, UserDto> = {};
        // Fetch details for each unique student ID
        const userDetailsPromises = uniqueStudentIds.map(async (id) => {
          try {
            const user = await fetchUserDetails(id); // Use the outer helper function
            userDetails[id] = user; // Add to the map
          } catch (error) {
            console.error(`Failed to fetch details for user ID ${id}:`, error);
            // Optionally add a placeholder or null entry if user fetch fails
          }
        });

        // Wait for all user fetches to complete
        await Promise.all(userDetailsPromises);

        // Set the complete map
        setUserDetailsMap(userDetails);
      } catch (error) {
        console.error('Error fetching user details for submissions:', error);
        // Optionally set a specific error state for user details loading if critical
      } finally {
        setLoadingUsers(false);
      }
    };

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null); // Clear previous errors

        // Fetch assignment details and submissions concurrently
        const [assignment, submissions] = await Promise.all([
          fetchAssignmentDetails(),
          fetchSubmissions(),
        ]);

        setAssignmentDetails(assignment);
        setSubmissions(submissions);

        // Now fetch user details based on the fetched submissions
        await fetchUserDetailsForSubmissions(submissions);
      } catch (err: any) {
        // Catching any error type
        console.error('Load data error:', err); // Log the actual error
        setError(
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred during data loading.'
        );
      } finally {
        setLoading(false); // End main loading indicator
      }
    };

    // Start the data loading process
    loadData();

    // Depend on assignmentId. If the assignmentId param changes, useEffect will re-run.
  }, [assignmentId]); // Added assignmentId as dependency

  // --- Handlers ---

  const handleBack = () => navigate(`/course/${courseId}`); // Navigate back to the course page, needs courseId from params

  const handleViewSubmission = (submissionId: number) =>
    navigate(
      `/course/${courseId}/assignment/${assignmentId}/submission/${submissionId}` // Navigate to specific submission page, needs courseId and assignmentId
    );

  const formatDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid date
      return date.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        // Removed seconds for a slightly cleaner look, but keep if needed: second: '2-digit',
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString; // Return original string on error
    }
  };

  // --- Render Loading/Error States ---

  if (loading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='200px'
      >
        <CircularProgress />
        <Typography ml={2}>
          Loading assignment details and submissions...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color='error'>Error: {error}</Typography>{' '}
        {/* Display the error message */}
        <Button
          variant='outlined'
          sx={{ mt: 2 }}
          onClick={() => window.location.reload()} // Simple retry by reloading page
        >
          Retry
        </Button>
      </Box>
    );
  }

  // Ensure assignmentDetails is loaded before trying to access its properties
  if (!assignmentDetails) {
    return (
      <Box p={3}>
        <Typography>Assignment details could not be loaded.</Typography>
        <Button
          variant='outlined'
          sx={{ mt: 2 }}
          onClick={() => window.location.reload()}
        >
          Back / Retry
        </Button>
      </Box>
    );
  }

  const assignmentFileUrl = getFullFileUrl(assignmentDetails.fileUrl); // Use assignmentDetails directly now

  return (
    <Box sx={{ maxWidth: 1000, margin: 'auto', p: 3 }}>
      <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mb: 3 }}>
        Back to Course
      </Button>

      <Typography variant='h4' gutterBottom>
        {assignmentDetails.title || 'Assignment'}{' '}
        {/* Use assignmentDetails directly */}
      </Typography>

      {/* assignmentDetails check moved above, so this paper is always rendered if no error */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant='h6' gutterBottom>
          Assignment Details
        </Typography>
        <Typography paragraph>
          {assignmentDetails.description || 'No description provided.'}
        </Typography>
        <Typography color='text.secondary' gutterBottom>
          Due: {formatDateTime(assignmentDetails.dueDate)}
        </Typography>

        {assignmentFileUrl && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant='h6'>Assignment File</Typography>
            <Button
              variant='outlined'
              startIcon={<InsertDriveFile />}
              // Added check for assignmentFileUrl existence before href
              {...(assignmentFileUrl
                ? { href: assignmentFileUrl, target: '_blank' }
                : { disabled: true })}
              sx={{ mt: 1 }}
            >
              View Assignment File
            </Button>
          </>
        )}
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant='h6' gutterBottom>
          {submissions.length} Submission{submissions.length !== 1 ? 's' : ''}
        </Typography>

        {/* Show loading spinner specifically for user details if submissions loaded first */}
        {loadingUsers && submissions.length > 0 && (
          <Box display='flex' alignItems='center' p={2}>
            <CircularProgress size={20} />
            <Typography ml={2}>Loading student details...</Typography>
          </Box>
        )}

        {/* Show "No submissions" message only if not loading users AND submissions list is empty */}
        {!loadingUsers && submissions.length === 0 ? (
          <Typography variant='body1' color='text.secondary' sx={{ p: 2 }}>
            No submissions have been made yet for this assignment.
          </Typography>
        ) : (
          <List>
            {submissions.map((submission) => (
              <React.Fragment key={submission.id}>
                <ListItem
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => handleViewSubmission(submission.id)}
                >
                  {/* Render Avatar even if user details not loaded yet, using placeholder */}
                  <Avatar sx={{ mr: 2 }}>
                    {userDetailsMap[submission.studentId]?.fullName
                      ?.charAt(0)
                      .toUpperCase() || '?'}
                  </Avatar>
                  <ListItemText
                    primary={
                      // Use userDetailsMap if available, otherwise show generic or ID
                      userDetailsMap[submission.studentId]?.fullName ||
                      `Student ${submission.studentId}` // Fallback
                    }
                    secondary={
                      <>
                        <Typography
                          component='span'
                          display='block'
                          variant='body2'
                        >
                          {userDetailsMap[submission.studentId]?.email || ''}{' '}
                          {/* Show email if available */}
                        </Typography>
                        <Typography
                          component='span'
                          display='block'
                          variant='body2'
                          color='text.secondary'
                        >
                          Submitted: {formatDateTime(submission.submittedAt)}
                        </Typography>
                        {submission.gradedAt && (
                          <Typography
                            component='span'
                            display='block'
                            variant='body2'
                            color='text.secondary'
                          >
                            Graded: {formatDateTime(submission.gradedAt)}
                          </Typography>
                        )}
                        {submission.comments && (
                          <Typography
                            component='span'
                            display='block'
                            fontStyle='italic'
                            variant='body2'
                            color='text.secondary'
                            sx={{ mt: 0.5 }}
                          >
                            Feedback: {submission.comments}
                          </Typography>
                        )}
                      </>
                    }
                  />
                  <Chip
                    label={
                      submission.status === 'GRADED'
                        ? submission.grade !== null &&
                          submission.grade !== undefined
                          ? `${submission.grade}%`
                          : 'Graded' // Handle potential null/undefined grade
                        : 'Ungraded'
                    }
                    color={
                      submission.status === 'GRADED' ? 'primary' : 'default'
                    }
                    variant={
                      submission.status === 'GRADED' ? 'filled' : 'outlined'
                    }
                    sx={{ minWidth: 80, justifyContent: 'center' }} // Basic styling for consistent size
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default TeacherAssignmentPage;
