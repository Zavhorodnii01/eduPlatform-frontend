// components/StudentAssignmentPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Divider,
  CircularProgress,
  styled,
  Alert,
  Grid,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowBack,
  InsertDriveFile,
  CloudUpload,
  Grade,
  Comment,
} from '@mui/icons-material';

interface AssignmentDetailDto {
  id: number;
  courseId: number;
  title: string;
  description: string;
  dueDate: string | null | undefined;
  fileUrl?: string | null;

  // Submission details (null if not submitted)
  submissionId?: number | null;
  grade?: number | null;
  submissionText?: string | null;
  submissionFileUrl?: string | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
  comments?: string | null;
  status?: 'SUBMITTED' | 'GRADED'; // Only these two statuses exist for submissions
}

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const StudentAssignmentPage: React.FC = () => {
  const { courseId, assignmentId } = useParams<{
    courseId: string;
    assignmentId: string;
  }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<AssignmentDetailDto | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const API_BASE_URL = 'http://localhost:8081';

  const getFullFileUrl = (url?: string | null): string | null => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${API_BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
  };

  const fetchAssignmentDetails = async (): Promise<AssignmentDetailDto> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token missing.');
    }
    const response = await fetch(
      `/api/assignments/getAssignmentById/${assignmentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );
    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'Unknown fetch error');
      throw new Error(
        `Failed to fetch assignment details (${response.status}): ${errorText}`
      );
    }
    return await response.json();
  };

  useEffect(() => {
    const loadAssignment = async () => {
      if (!courseId || !assignmentId) {
        setError('Missing course or assignment ID.');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in.');
        setLoading(false);
        return;
      }

      try {
        const data = await fetchAssignmentDetails();
        setAssignment(data);
      } catch (err: any) {
        setError(`Failed to load assignment: ${err.message}`);
        console.error('Failed to load assignment:', err);
        setAssignment(null);
      } finally {
        setLoading(false);
      }
    };

    loadAssignment();
  }, [courseId, assignmentId]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleBackToCourse = () => navigate(`/course/${courseId}`);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSubmitError(null);
    setSuccessMessage(null);
    setSelectedFile(null);

    if (event.target.files?.length) {
      const file = event.target.files[0];
      const MAX_SIZE = 10 * 1024 * 1024;

      if (file.size > MAX_SIZE) {
        setSubmitError('File too large (limit 10MB).');
        const fileInput = event.target as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!selectedFile || !assignment || !assignment.id) {
      setSubmitError('Select a file and ensure assignment details are loaded.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setSubmitError('Authentication token not found. Please log in.');
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadRes = await fetch(`${API_BASE_URL}/api/files/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes
          .text()
          .catch(() => 'Unknown upload error');
        throw new Error(
          `File upload failed (${uploadRes.status}): ${errorText}`
        );
      }

      const fileUrl = await uploadRes.text();

      const submitRes = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignmentId: assignment.id,
          fileUrl: fileUrl,
        }),
      });

      if (!submitRes.ok) {
        const errorText = await submitRes
          .text()
          .catch(() => 'Unknown submission error');
        if (submitRes.status === 400) {
          setSubmitError('The submission is already sent.');
          return;
        }
        throw new Error(
          `Assignment submission failed (${submitRes.status}): ${errorText}`
        );
      }

      try {
        const updated = await fetchAssignmentDetails();
        setAssignment(updated);
        setSuccessMessage('Assignment submitted successfully!');
      } catch (refetchErr: any) {
        console.error('Failed to refetch assignment:', refetchErr);
        setSuccessMessage(
          'Submission successful! Please refresh for updated details.'
        );
      }

      setSelectedFile(null);
      const fileInput = document.querySelector(
        '#file-upload-button input[type="file"]'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      console.error('Submission failed:', err);
      setSubmitError(err.message || 'An unexpected error occurred.');
      setSuccessMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDueDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'No due date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleString([], {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString;
    }
  };

  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString;
    }
  };

  // Determines if submission exists and its status
  const getSubmissionStatus = (
    assignment: AssignmentDetailDto
  ): 'NOT_SUBMITTED' | 'SUBMITTED' | 'GRADED' => {
    if (!assignment.submissionId) return 'NOT_SUBMITTED';
    return assignment.status === 'GRADED' ? 'GRADED' : 'SUBMITTED';
  };

  if (loading)
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='200px'
      >
        <CircularProgress />
        <Typography ml={2}>Loading assignment...</Typography>
      </Box>
    );

  if (error) return <Typography color='error'>Error: {error}</Typography>;
  if (!assignment) return <Typography>Assignment data not found.</Typography>;

  const submissionStatus = getSubmissionStatus(assignment);
  const assignmentFileUrl = getFullFileUrl(assignment.fileUrl);
  const submissionFileUrl = getFullFileUrl(assignment.submissionFileUrl);
  const isSubmissionEditable = submissionStatus === 'NOT_SUBMITTED';

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={handleBackToCourse}
        sx={{ mb: 3 }}
      >
        Back to Course
      </Button>

      <Typography variant='h4' gutterBottom>
        {assignment.title}
      </Typography>

      <Box display='flex' flexWrap='wrap' alignItems='center' mb={2} gap={1}>
        <Chip
          label={`Status: ${submissionStatus.replace('_', ' ')}`}
          color={
            submissionStatus === 'GRADED'
              ? 'success'
              : submissionStatus === 'SUBMITTED'
              ? 'info'
              : 'default'
          }
        />
        <Typography variant='subtitle1' color='text.secondary'>
          Due: {formatDueDate(assignment.dueDate)}
        </Typography>
        {submissionStatus !== 'NOT_SUBMITTED' && (
          <Chip
            label={`Submitted: ${formatDateTime(assignment.submittedAt)}`}
            color='info'
          />
        )}
        {submissionStatus === 'GRADED' && (
          <>
            <Chip
              label={`Graded: ${formatDateTime(assignment.gradedAt)}`}
              color='success'
            />
            <Chip
              label={`Grade: ${
                assignment.grade !== null ? `${assignment.grade}%` : 'N/A'
              }`}
              color='primary'
            />
          </>
        )}
      </Box>

      {submissionStatus === 'GRADED' && (
        <Paper
          elevation={3}
          sx={{ p: 3, mb: 3, borderColor: 'success.main', border: '1px solid' }}
        >
          <Typography variant='h6' gutterBottom color='success.dark'>
            <Grade sx={{ verticalAlign: 'middle', mr: 1 }} />
            Grading Results
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant='subtitle1'>
                <strong>Grade:</strong>{' '}
                {assignment.grade !== null
                  ? `${assignment.grade}%`
                  : 'Not graded'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant='subtitle1'>
                <strong>Graded on:</strong>{' '}
                {formatDateTime(assignment.gradedAt)}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant='subtitle1'>
                <Comment sx={{ verticalAlign: 'middle', mr: 1 }} />
                <strong>Feedback:</strong>
              </Typography>
              <Typography
                sx={{ fontStyle: 'italic', whiteSpace: 'pre-wrap', mt: 1 }}
              >
                {assignment.comments?.trim() || 'No feedback provided.'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant='h6' gutterBottom>
          Description
        </Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>
          {assignment.description || 'No description available.'}
        </Typography>

        {assignmentFileUrl && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant='h6'>Assignment File</Typography>
            <Button
              variant='outlined'
              startIcon={<InsertDriveFile />}
              href={assignmentFileUrl}
              target='_blank'
              rel='noopener noreferrer'
            >
              View Assignment File
            </Button>
          </>
        )}

        {submissionStatus !== 'NOT_SUBMITTED' && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant='h6'>Your Submission</Typography>
            {assignment.submissionText && (
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                {assignment.submissionText}
              </Typography>
            )}
            {submissionFileUrl && (
              <Button
                variant='outlined'
                startIcon={<InsertDriveFile />}
                href={submissionFileUrl}
                target='_blank'
                rel='noopener noreferrer'
                sx={{ mt: 1 }}
              >
                View Submitted File
              </Button>
            )}
            {!assignment.submissionText && !submissionFileUrl && (
              <Typography color='text.secondary'>
                (Submission recorded but no content available)
              </Typography>
            )}
          </>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant='h6'>Submit Your Work</Typography>

        {isSubmissionEditable ? (
          <>
            <Button
              component='label'
              variant='contained'
              startIcon={<CloudUpload />}
              sx={{ mt: 2 }}
              disabled={isSubmitting}
              id='file-upload-button'
            >
              Select File
              <VisuallyHiddenInput
                type='file'
                accept='.pdf,.doc,.docx,.txt,.zip,.pptx,.xlsx,.jpg,.png'
                onChange={handleFileChange}
              />
            </Button>

            {selectedFile && (
              <Typography sx={{ mt: 1 }}>
                Selected: {selectedFile.name} (
                {Math.round(selectedFile.size / 1024)} KB)
              </Typography>
            )}

            {(selectedFile || submitError || successMessage) && (
              <Box
                mt={2}
                display='flex'
                alignItems='center'
                flexWrap='wrap'
                gap={2}
              >
                {selectedFile && (
                  <Button
                    variant='contained'
                    onClick={handleSubmitAssignment}
                    disabled={isSubmitting}
                    startIcon={
                      isSubmitting ? <CircularProgress size={20} /> : undefined
                    }
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                  </Button>
                )}

                {submitError && (
                  <Alert severity='error' sx={{ flexGrow: 1 }}>
                    {submitError}
                  </Alert>
                )}

                {successMessage && (
                  <Alert severity='success' sx={{ flexGrow: 1 }}>
                    {successMessage}
                  </Alert>
                )}
              </Box>
            )}

            {submitError && !selectedFile && (
              <Typography color='error' sx={{ mt: 1 }}>
                {submitError}
              </Typography>
            )}
          </>
        ) : (
          <Typography color='text.secondary' sx={{ mt: 1 }}>
            {submissionStatus === 'SUBMITTED'
              ? 'Your submission has been received and is awaiting grading.'
              : 'This assignment has been graded. No further submissions allowed.'}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default StudentAssignmentPage;
