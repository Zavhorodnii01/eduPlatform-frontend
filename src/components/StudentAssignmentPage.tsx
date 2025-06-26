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
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowBack, InsertDriveFile, CloudUpload } from '@mui/icons-material';

interface AssignmentDetailDto {
  id: number;
  courseId: number;
  title: string;
  description: string;
  dueDate: string;
  fileUrl?: string | null;
  teacherId?: number;
  grade?: number | null;
  submissionText?: string | null;
  submissionFileUrl?: string | null;
  feedback?: string | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchAssignmentDetails = async (): Promise<AssignmentDetailDto> => {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `/api/assignments/getAssignmentById/${assignmentId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );
    return await response.json();
  };

  useEffect(() => {
    const loadAssignment = async () => {
      if (!courseId || !assignmentId) {
        setError('Course or Assignment ID missing from URL.');
        setLoading(false);
        return;
      }

      const parsedCourseId = Number(courseId);
      const parsedAssignmentId = Number(assignmentId);
      if (isNaN(parsedCourseId) || isNaN(parsedAssignmentId)) {
        setError('Invalid Course or Assignment ID in URL.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found. Please log in.');
          setLoading(false);
          return;
        }

        const data = await fetchAssignmentDetails();
        setAssignment(data);
      } catch (err: any) {
        console.error('Error fetching assignment:', err);
        setError(`Failed to load assignment: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadAssignment();
  }, [assignmentId, courseId]);

  const handleBackToCourse = () => {
    navigate(`/course/${courseId}`);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const MAX_FILE_SIZE = 10 * 1024 * 1024;

      if (file.size > MAX_FILE_SIZE) {
        setSubmitError(
          `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`
        );
        return;
      }

      setSelectedFile(file);
      setSubmitError(null);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!selectedFile || !assignment) {
      setSubmitError('Please select a file to upload');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    const token = localStorage.getItem('token');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch(
        'http://localhost:8081/api/files/upload',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error((await uploadResponse.text()) || 'File upload failed');
      }

      const fileUrl = await uploadResponse.text();

      const submissionResponse = await fetch(
        'http://localhost:8081/api/submissions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            assignmentId: assignment.id,
            fileUrl: fileUrl,
          }),
        }
      );

      if (!submissionResponse.ok) {
        throw new Error(
          (await submissionResponse.text()) || 'Submission creation failed'
        );
      }

      const updatedAssignment = await fetchAssignmentDetails();
      setAssignment(updatedAssignment);
      setSelectedFile(null);
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return dateString;
    }
  };

  const computeStatus = (assignment: AssignmentDetailDto): string => {
    if (assignment.gradedAt) return 'Graded';
    if (assignment.submittedAt) return 'Submitted';
    return 'Not Submitted';
  };

  if (loading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='200px'
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading assignment details...</Typography>
      </Box>
    );
  }

  if (error) return <Typography color='error'>{error}</Typography>;
  if (!assignment)
    return <Typography>Assignment not found or failed to load.</Typography>;

  const status = computeStatus(assignment);
  const servableAssignmentFileUrl = assignment.fileUrl
    ? assignment.fileUrl.startsWith('/')
      ? `http://localhost:8081${assignment.fileUrl}`
      : `http://localhost:8081/${assignment.fileUrl}`
    : null;

  const servableSubmissionFileUrl = assignment.submissionFileUrl
    ? assignment.submissionFileUrl.startsWith('/')
      ? `http://localhost:8081${assignment.submissionFileUrl}`
      : `http://localhost:8081/${assignment.submissionFileUrl}`
    : null;

  return (
    <Box sx={{ maxWidth: 900, margin: 'auto' }}>
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

      <Box display='flex' alignItems='center' mb={2} flexWrap='wrap'>
        <Chip
          label={`Status: ${status}`}
          color={
            status === 'Graded'
              ? 'success'
              : status === 'Submitted'
              ? 'info'
              : 'default'
          }
          sx={{ mr: 1, mb: 1 }}
        />
        <Typography variant='subtitle1' color='text.secondary' sx={{ mr: 2 }}>
          Due Date: {formatDateTime(assignment.dueDate)}
        </Typography>
        {assignment.submittedAt && (
          <Chip
            label={`Submitted: ${formatDateTime(assignment.submittedAt)}`}
            color='info'
            sx={{ mr: 1 }}
          />
        )}
        {assignment.gradedAt && (
          <Chip
            label={`Graded: ${formatDateTime(assignment.gradedAt)}`}
            color='success'
            sx={{ mr: 1 }}
          />
        )}
        {assignment.gradedAt &&
          (assignment.grade !== null ? (
            <Chip label={`Grade: ${assignment.grade}%`} color='primary' />
          ) : (
            <Chip label='Ungraded' color='warning' />
          ))}
      </Box>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant='h6' gutterBottom>
          Description
        </Typography>
        <Typography variant='body1' paragraph>
          {assignment.description || 'No description provided.'}
        </Typography>

        {servableAssignmentFileUrl && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant='h6' gutterBottom>
              Assignment File
            </Typography>
            <Button
              variant='outlined'
              startIcon={<InsertDriveFile />}
              href={servableAssignmentFileUrl}
              target='_blank'
              rel='noopener noreferrer'
            >
              View Assignment File
            </Button>
          </>
        )}

        {(assignment.submissionText || assignment.submissionFileUrl) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant='h6' gutterBottom>
              Your Submission
            </Typography>
            {assignment.submissionText && (
              <Typography
                variant='body2'
                sx={{ whiteSpace: 'pre-wrap', mb: 1 }}
              >
                {assignment.submissionText}
              </Typography>
            )}
            {servableSubmissionFileUrl && (
              <Button
                variant='outlined'
                startIcon={<InsertDriveFile />}
                href={servableSubmissionFileUrl}
                target='_blank'
                rel='noopener noreferrer'
              >
                View Submitted File
              </Button>
            )}
          </>
        )}

        {assignment.feedback && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant='h6' gutterBottom>
              Teacher Feedback
            </Typography>
            <Typography variant='body2' sx={{ fontStyle: 'italic' }}>
              {assignment.feedback}
            </Typography>
          </>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant='h6' gutterBottom>
          Submit Your Work
        </Typography>

        {status === 'Not Submitted' ? (
          <>
            <Button
              component='label'
              variant='contained'
              startIcon={<CloudUpload />}
              sx={{ mr: 2 }}
              disabled={isSubmitting}
            >
              Select File
              <VisuallyHiddenInput
                type='file'
                onChange={handleFileChange}
                accept='.pdf,.doc,.docx,.txt,.zip,.pptx,.xlsx,.jpg,.png'
              />
            </Button>

            {selectedFile && (
              <Typography variant='body2' sx={{ mt: 1 }}>
                Selected: {selectedFile.name} (
                {Math.round(selectedFile.size / 1024)} KB)
              </Typography>
            )}

            {selectedFile && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant='contained'
                  color='primary'
                  onClick={handleSubmitAssignment}
                  disabled={isSubmitting}
                  startIcon={
                    isSubmitting ? <CircularProgress size={20} /> : null
                  }
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                </Button>
              </Box>
            )}

            {submitError && (
              <Typography color='error' sx={{ mt: 1 }}>
                {submitError}
              </Typography>
            )}
          </>
        ) : (
          <Typography color='text.secondary'>
            {status === 'Submitted'
              ? 'You have already submitted this assignment.'
              : 'This assignment has been graded.'}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default StudentAssignmentPage;
