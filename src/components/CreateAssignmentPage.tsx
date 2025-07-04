// src/components/CreateAssignmentPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Container,
  Chip,
  Stack,
} from '@mui/material';
import { ArrowBack, Save, AttachFile, Cancel } from '@mui/icons-material';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

// Ensure you have date-fns installed: npm install date-fns @mui/x-date-pickers

// Define the DTO structure based on your backend's expected @RequestBody
// Matches your provided AssignmentDto (single fileUrl)
interface AssignmentDto {
  title: string;
  description?: string;
  dueDate: string; // Send as ISO string
  courseId: number;
  fileUrl?: string | null; // Changed to single fileUrl (optional/nullable)
  // Note: teacherId is handled by the backend based on the token
}

// Define the expected user role type
type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

interface CreateAssignmentPageProps {
  userRole: Role | null;
}

const CreateAssignmentPage: React.FC<CreateAssignmentPageProps> = ({
  userRole,
}) => {
  // --- React Hooks must be called unconditionally at the top ---
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  // State for the SINGLE selected file
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false); // Main loading state
  const [uploading, setUploading] = useState<boolean>(false); // Specific state for file upload
  const [submissionError, setSubmissionError] = useState<string | null>(null); // Error from API submission (incl. upload)
  const [success, setSuccess] = useState<string | null>(null);

  // Ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  const courseIdNum = Number(courseId);

  // --- Conditional rendering/returns happen AFTER all hooks ---

  // 1. Check if the user is a teacher - this happens first
  if (userRole !== 'TEACHER') {
    // Use courseId from useParams to construct the redirect path
    return <Navigate to={`/course/${courseId || ''}`} replace />;
  }

  // 2. Check if the courseId from the URL is valid *after* hooks and role check
  if (isNaN(courseIdNum)) {
    return (
      <Container maxWidth='sm' sx={{ mt: 4 }}>
        <Typography variant='h6' color='error' gutterBottom>
          Invalid Course ID
        </Typography>
        <Alert severity='error'>
          The course ID provided in the URL is not valid.
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Back to Courses
        </Button>
      </Container>
    );
  }

  // --- Handlers ---

  // Handles file selection from the input
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      // Set the FIRST selected file (since backend supports only one)
      setSelectedFile(event.target.files[0]);
      // Reset the input value so selecting the same file again triggers onChange
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      // If user cancels file selection
      setSelectedFile(null);
    }
    setSubmissionError(null); // Clear potential errors related to previous file selection/upload
  };

  // Handles removing the selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    // Reset the input value so user can select a file again immediately
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Triggers the hidden file input click
  const handleAttachButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Basic client-side validation
    if (!title || !dueDate) {
      setSubmissionError('Title and Due Date are required.');
      return;
    }

    setLoading(true); // Start main loading
    setUploading(false); // Reset upload state
    setSubmissionError(null);
    setSuccess(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setSubmissionError('Authentication token not found. Please log in.');
      setLoading(false);
      return;
    }

    let uploadedFileUrl: string | null = null; // Variable to hold the single uploaded URL

    // --- Step 1: Upload File if one is selected ---
    if (selectedFile) {
      // Check if a single file is selected
      setUploading(true); // Start upload specific loading
      const formData = new FormData();
      formData.append('file', selectedFile); // 'file' must match your backend @RequestParam name

      try {
        // CORRECTED: Use the full backend path /api/files/upload
        const uploadResponse = await fetch('/api/files/upload', {
          // <-- Corrected URL
          method: 'POST',
          headers: {
            // 'Content-Type': 'multipart/form-data' is automatically set by fetch when using FormData
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorBody = await uploadResponse.text();
          // Include status code and text in the error message
          throw new Error(
            `File upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorBody}`
          );
        }

        // Assuming your backend /api/files/upload returns the file URL as a string directly in the body
        uploadedFileUrl = await uploadResponse.text(); // Store the single URL

        // If your backend returns JSON like { url: "..." } you'd do:
        // const uploadResult = await uploadResponse.json();
        // uploadedFileUrl = uploadResult.url;
      } catch (uploadErr: any) {
        console.error('File upload error:', uploadErr);
        setSubmissionError(
          `File upload failed: ${
            uploadErr.message || 'An unknown upload error occurred'
          }`
        );
        setLoading(false); // Stop main loading on upload failure
        setUploading(false); // Stop upload loading
        return; // Stop the process if upload fails
      } finally {
        setUploading(false); // Stop upload specific loading
      }
    }

    // --- Step 2: Create Assignment including the single file URL ---

    const assignmentData: AssignmentDto = {
      title: title,
      description: description,
      dueDate: dueDate.toISOString(),
      courseId: courseIdNum,
      fileUrl: uploadedFileUrl, // Pass the single uploaded URL (can be null if no file selected)
    };

    console.log('Sending assignment data:', assignmentData);

    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(assignmentData),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          'API Error Response:',
          response.status,
          response.statusText,
          errorBody
        );
        let errorMessage = `Failed to create assignment: ${response.status} ${response.statusText}`;
        try {
          const errorJson = JSON.parse(errorBody);
          if (errorJson.message) errorMessage = errorJson.message;
          else if (errorBody) errorMessage += ` - ${errorBody}`;
        } catch (e) {
          if (errorBody) errorMessage += ` - ${errorBody}`;
        }
        throw new Error(errorMessage);
      }

      const createdAssignment = await response.json();
      setSuccess('Assignment created successfully!');
      console.log('Assignment created:', createdAssignment);

      setTimeout(() => {
        navigate(`/course/${courseId}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error creating assignment:', err);
      setSubmissionError(
        `Error creating assignment: ${
          err.message || 'An unexpected error occurred'
        }`
      );
    } finally {
      setLoading(false); // Stop main loading
    }
  };

  const handleBack = () => {
    navigate(`/course/${courseId}`);
  };

  // If userRole is TEACHER and courseId is valid, render the form
  // This return happens only if the checks above did NOT trigger an early return
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth='md' sx={{ mt: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mb: 3 }}>
          Back to Course
        </Button>

        <Typography variant='h4' component='h1' gutterBottom>
          Create New Assignment
        </Typography>

        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <form onSubmit={handleSubmit}>
            <TextField
              label='Assignment Title'
              fullWidth
              margin='normal'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading || uploading}
            />
            <TextField
              label='Description (Optional)'
              fullWidth
              margin='normal'
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading || uploading}
            />
            <Box sx={{ my: 2 }}>
              <DateTimePicker
                label='Due Date and Time'
                value={dueDate}
                onChange={(newValue) => setDueDate(newValue)}
                slotProps={{ textField: { fullWidth: true, required: true } }}
                disabled={loading || uploading}
              />
            </Box>

            {/* --- File Attachment Section (Single File) --- */}
            <Box sx={{ my: 2 }}>
              <Typography variant='subtitle2' gutterBottom>
                Attachment (Optional)
              </Typography>
              {/* Hidden file input - removed 'multiple' */}
              <input
                type='file'
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: 'none' }} // Hide the default input
                disabled={loading || uploading}
              />
              {/* Button to trigger the file input */}
              <Button
                variant='outlined'
                startIcon={<AttachFile />}
                onClick={handleAttachButtonClick}
                // Disable button if already loading/uploading or if a file is already selected
                disabled={loading || uploading || !!selectedFile}
              >
                {selectedFile ? 'Change File' : 'Attach File'}{' '}
                {/* Button text changes based on selection */}
              </Button>

              {/* Display selected file as a Chip */}
              {selectedFile && ( // Display only if a file is selected
                <Stack
                  direction='row'
                  spacing={1}
                  sx={{ mt: 2, flexWrap: 'wrap' }}
                >
                  <Chip
                    label={selectedFile.name}
                    onDelete={handleRemoveFile} // Remove the single file
                    deleteIcon={<Cancel />}
                    disabled={loading || uploading}
                  />
                </Stack>
              )}
            </Box>
            {/* --- End File Attachment Section --- */}

            {/* Display submission errors */}
            {submissionError && (
              <Alert severity='error' sx={{ mt: 2 }}>
                {submissionError}
              </Alert>
            )}

            {/* Display success message */}
            {success && (
              <Alert severity='success' sx={{ mt: 2 }}>
                {success}
              </Alert>
            )}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type='submit'
                variant='contained'
                startIcon={<Save />}
                // Disable if main loading, required fields missing, OR file is uploading
                disabled={loading || !title || !dueDate || uploading}
              >
                {loading || uploading ? (
                  <CircularProgress size={24} color='inherit' />
                ) : (
                  'Create Assignment'
                )}
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
    </LocalizationProvider>
  );
};

export default CreateAssignmentPage;
