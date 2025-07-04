import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Avatar,
  Divider,
  Rating,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowBack, Check, Close, InsertDriveFile } from '@mui/icons-material'; // Added InsertDriveFile

// We'll fetch student details separately, so the submission interface
// doesn't strictly need studentName if the backend doesn't provide it.
// Let's align it more closely with the Submission interface from TeacherAssignmentPage
interface Submission {
  id: number;
  studentId: number;
  submittedAt: string;
  fileUrl?: string | null; // Make optional as per TeacherAssignmentPage
  text?: string | null; // Make optional as per TeacherAssignmentPage (assuming text submission is optional)
  grade?: number | null;
  comments?: string | null; // Align field name with TeacherAssignmentPage
  gradedAt?: string | null;
  status: 'SUBMITTED' | 'GRADED'; // Add status field
}

// Define UserDto as used in TeacherAssignmentPage
interface UserDto {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

const SubmissionGradingPage: React.FC = () => {
  // Get courseId and assignmentId for potential back navigation
  const { courseId, assignmentId, submissionId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [studentDetails, setStudentDetails] = useState<UserDto | null>(null); // State to store student details
  const [grade, setGrade] = useState<number | null>(null);
  const [comments, setComments] = useState(''); // Renamed from feedback to comments
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = 'http://localhost:8081'; // Define base URL

  // Function to fetch user details by ID (copied from TeacherAssignmentPage)
  const fetchUserDetails = async (userId: number): Promise<UserDto> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('User details fetch failed:', response.status, errorText);
      // Throw an error to be caught by the outer try/catch
      throw new Error(
        `Failed to fetch user details: ${
          response.statusText || response.status
        }`
      );
    }
    return await response.json();
  };

  useEffect(() => {
    // Ensure submissionId is available
    if (!submissionId) {
      setError('Submission ID is missing in URL.');
      setLoading(false);
      return; // Stop execution if ID is missing
    }

    const fetchSubmissionAndStudent = async () => {
      try {
        setLoading(true);
        setError(null); // Clear previous errors

        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found.');
          setLoading(false);
          return; // Stop execution if token is missing
        }

        // 1. Fetch submission details (FIXED URL TYPO - assuming /api/submissions is the base)
        const submissionRes = await fetch(
          `${API_BASE_URL}/api/submissions/getSubmissionById/${submissionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!submissionRes.ok) {
          const errorText = await submissionRes.text();
          console.error(
            'Submission fetch failed:',
            submissionRes.status,
            errorText
          );
          // Throw an error to be caught by the outer try/catch
          throw new Error(
            `Failed to load submission: ${
              submissionRes.statusText || submissionRes.status
            }`
          );
        }

        const submissionData: Submission = await submissionRes.json();
        setSubmission(submissionData);

        // Initialize grade and comments from fetched data
        // Use the grade and comments from the fetched submission data
        setGrade(submissionData.grade ?? null); // Use ?? null to ensure null if backend sends 0 or undefined
        setComments(submissionData.comments ?? ''); // Use ?? '' to ensure empty string if null/undefined

        // 2. Fetch student details using the studentId from the submission
        if (submissionData.studentId) {
          try {
            const studentData = await fetchUserDetails(
              submissionData.studentId
            );
            setStudentDetails(studentData);
          } catch (userError) {
            console.error(
              'Error fetching student details for submission:',
              userError
            );
            // Don't block rendering if student details fail, show a placeholder name
            setStudentDetails(null);
          }
        } else {
          console.warn(`Submission ${submissionData.id} has no studentId.`);
          setStudentDetails(null);
        }
      } catch (err) {
        console.error('Error loading submission or student:', err);
        // Set error state based on the error caught
        setError(
          err instanceof Error ? err.message : 'Unknown error loading data'
        );
        setSubmission(null); // Ensure submission state is clear on error
        setStudentDetails(null); // Ensure student details state is clear on error
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissionAndStudent();
  }, [submissionId, API_BASE_URL]); // Depend on submissionId and API_BASE_URL

  // MODIFIED handleSaveGrade FUNCTION
  const handleSaveGrade = async () => {
    if (!submissionId) {
      console.error('Cannot save grade: submissionId is missing.');
      setError('Cannot save grade: Submission ID is missing.');
      return;
    }
    // Basic validation before sending
    if (grade === null || grade < 0 || grade > 100) {
      setError('Please enter a valid grade between 0 and 100.');
      return;
    }

    try {
      setSaving(true);
      setError(null); // Clear previous errors before saving
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found.');
        setSaving(false);
        return;
      }

      // --- ALIGNING WITH BACKEND ---
      // Method: PATCH
      // Endpoint: /api/submissions/grade/{submissionId} (assuming /api/submissions is the base)
      // Body: { grade: number, comments: string }
      const res = await fetch(
        `${API_BASE_URL}/api/submissions/grade/${submissionId}`,
        {
          method: 'PATCH', // Changed from POST to PATCH
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          // Send 'comments' field, as expected by GradeRequest
          body: JSON.stringify({ grade, comments }), // Changed 'feedback' to 'comments'
        }
      );

      if (!res.ok) {
        const errorText = await res.text(); // Attempt to get error message from body
        console.error('Save grade failed:', res.status, errorText);
        // Throw an error to be caught by the catch block
        throw new Error(
          `Failed to save grade: ${res.statusText || res.status} - ${
            errorText || 'Server error'
          }`
        );
      }

      // Backend returns the updated SubmissionDto on success
      const updatedSubmissionData: Submission = await res.json();

      // Update the local state with the data from the backend response
      setSubmission(updatedSubmissionData);

      // Also update the grade and comments state from the response in case backend modified them
      setGrade(updatedSubmissionData.grade ?? null);
      setComments(updatedSubmissionData.comments ?? '');

      // Optional: Show a success message (e.g., using a Snackbar)
      console.log('Grade saved successfully!', updatedSubmissionData);

      // Optional: Navigate back after successful save
      // handleBack();
    } catch (err) {
      console.error('Error saving grade:', err);
      // Set error state based on the error caught
      setError(
        err instanceof Error ? err.message : 'Unknown error saving grade'
      );
    } finally {
      setSaving(false);
    }
  };

  // Function to navigate back, potentially to the teacher assignment page
  const handleBack = () => {
    // Assuming the previous page was the submissions list for this assignment
    // The route is course/:courseId/assignment/:assignmentId/submissions
    if (courseId && assignmentId) {
      navigate(`/course/${courseId}/assignment/${assignmentId}/submissions`);
    } else {
      // Fallback or more generic back if IDs aren't in params
      navigate(-1); // Go back one step in history
    }
  };

  const formatDateTime = (date: string | undefined | null): string => {
    if (!date) return 'N/A';
    try {
      // Ensure the date is a valid date string or Date object
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        // Check if date parsing resulted in an invalid date
        console.warn('Invalid date format received:', date);
        return 'Invalid Date';
      }
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.error('Error formatting date:', date, e);
      return 'Invalid Date';
    }
  };

  // --- Render Logic ---

  if (loading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='200px'
      >
        <CircularProgress />
        <Typography ml={2}>Loading submission...</Typography>
      </Box>
    );
  }

  // Show error message if loading failed
  if (error && !submission) {
    // Only show critical error if submission couldn't load at all
    return (
      <Box p={3}>
        <Typography color='error'>{error}</Typography>
        <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Assignment Submissions
        </Button>
        {/* Optional: Add a retry button */}
        {!loading && ( // Only show retry if not loading
          <Button
            variant='outlined'
            sx={{ mt: 2, ml: 2 }}
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        )}
      </Box>
    );
  }

  // If not loading and no submission, it means submissionId might be invalid or fetch failed silently
  if (!submission && !loading) {
    return (
      <Box p={3}>
        <Typography>Submission not found or failed to load.</Typography>
        <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Assignment Submissions
        </Button>
      </Box>
    );
  }

  // Construct the file URL using the API base URL
  const submissionFileUrl = submission?.fileUrl
    ? `${API_BASE_URL}${submission.fileUrl.startsWith('/') ? '' : '/'}${
        submission.fileUrl
      }`
    : null;

  return (
    <Box sx={{ maxWidth: 1200, margin: 'auto', p: 3 }}>
      <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mb: 4 }}>
        Back to Assignment Submissions
      </Button>

      <Typography variant='h4' gutterBottom>
        Grade Submission
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display='flex' alignItems='center' mb={3}>
          <Avatar sx={{ mr: 2, width: 56, height: 56 }}>
            {/* Use studentDetails?.fullName with optional chaining */}
            {studentDetails?.fullName
              ? studentDetails.fullName.charAt(0).toUpperCase()
              : '?'}
          </Avatar>
          <Box>
            {/* Display student name if available, fallback to ID */}
            <Typography variant='h6'>
              {studentDetails?.fullName ||
                `Student ID: ${submission?.studentId ?? 'N/A'}`}
            </Typography>
            {studentDetails?.email && (
              <Typography variant='body2' color='text.secondary'>
                {studentDetails.email}
              </Typography>
            )}
            {/* Use optional chaining for submission properties just in case */}
            <Typography variant='body2' color='text.secondary'>
              Submitted: {formatDateTime(submission?.submittedAt)}
            </Typography>
            {submission?.gradedAt && (
              <Typography variant='body2' color='text.secondary'>
                Graded: {formatDateTime(submission.gradedAt)}
              </Typography>
            )}
            {submission?.status && (
              <Typography variant='body2' color='text.secondary'>
                Status: {submission.status}
              </Typography>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {submission?.text && (
          <Box mb={3}>
            <Typography variant='h6' gutterBottom>
              Text Submission
            </Typography>
            <Paper
              variant='outlined'
              sx={{ p: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {' '}
              {/* Added whiteSpace and wordBreak */}
              <Typography>{submission.text}</Typography>
            </Paper>
          </Box>
        )}

        {submissionFileUrl && (
          <Box mb={3}>
            <Typography variant='h6' gutterBottom>
              Attached File
            </Typography>
            <Button
              variant='contained'
              href={submissionFileUrl}
              target='_blank'
              rel='noopener noreferrer' // Good practice for target="_blank"
              startIcon={<InsertDriveFile />}
            >
              View Submission File
            </Button>
          </Box>
        )}

        <Box mb={3}>
          <Typography variant='h6' gutterBottom>
            Grade ({grade ?? submission?.grade ?? 0}%){' '}
            {/* Show current state grade, fallback to fetched, then 0 */}
          </Typography>
          <Rating
            name='grade-rating'
            // Use current state grade for rating, fallback to fetched grade
            value={
              grade !== null
                ? grade / 20
                : submission?.grade !== null && submission?.grade !== undefined
                ? submission.grade / 20
                : null
            }
            max={5}
            precision={0.5} // Allow half stars if desired
            onChange={(_, newValue) => {
              // Convert back to 0-100, set to null if newValue is null
              setGrade(newValue !== null ? Math.round(newValue * 20) : null); // Round to nearest integer percentage
            }}
            disabled={saving}
          />
          <TextField
            label='Percentage'
            type='number'
            value={grade === null ? '' : grade} // Use null/'' for controlled input, display null as empty
            onChange={(e) => {
              const value = e.target.value;
              // Allow empty string temporarily for user input, but store as null if empty
              // Clamp between 0 and 100 and parse as integer
              setGrade(
                value === ''
                  ? null
                  : Math.max(0, Math.min(100, parseInt(value, 10)))
              );
            }}
            sx={{ ml: 2, width: 120 }} // Increased width slightly
            inputProps={{ min: 0, max: 100, step: 1 }} // Allow steps of 1
            disabled={saving}
            error={grade !== null && (grade < 0 || grade > 100)} // Basic validation error
            helperText={
              grade !== null && (grade < 0 || grade > 100)
                ? 'Grade must be between 0 and 100'
                : ''
            }
          />
        </Box>

        <TextField
          label='Feedback'
          multiline
          rows={4}
          fullWidth
          value={comments} // Use comments state
          onChange={(e) => setComments(e.target.value)} // Update comments state
          sx={{ mb: 3 }}
          disabled={saving}
        />

        {/* Display save error if exists */}
        {error &&
          saving === false && ( // Show save error only after trying to save
            <Typography color='error' sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

        <Box display='flex' justifyContent='flex-end'>
          <Button
            variant='contained'
            color='primary'
            startIcon={
              saving ? (
                <CircularProgress size={20} color='inherit' />
              ) : (
                <Check />
              )
            } // Use color="inherit" for CircularProgress inside Button
            onClick={handleSaveGrade}
            disabled={saving || grade === null || grade < 0 || grade > 100} // Disable if saving, grade is null, or invalid
            sx={{ mr: 2 }}
          >
            {saving ? 'Saving...' : 'Save Grade'}
          </Button>
          <Button
            variant='outlined'
            startIcon={<Close />}
            onClick={handleBack} // Use handleBack for consistent navigation
            disabled={saving}
          >
            Cancel
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SubmissionGradingPage;
