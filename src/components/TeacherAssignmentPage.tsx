// components/TeacherAssignmentPage.tsx
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
  Chip,
  Button,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowBack, Assignment, Grading } from '@mui/icons-material';

interface Submission {
  id: number;
  studentId: number;
  studentName: string;
  submittedAt: string;
  grade?: number | null;
  status: 'SUBMITTED' | 'GRADED';
}

const TeacherAssignmentPage: React.FC = () => {
  const { courseId, assignmentId } = useParams();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDetails, setAssignmentDetails] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const [assignmentRes, submissionsRes] = await Promise.all([
          fetch(`/api/assignments/getAssignmentById/${assignmentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(
            `/api/submissions/getSubmissionsByAssignmentId/${assignmentId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
        ]);

        if (!assignmentRes.ok || !submissionsRes.ok) {
          throw new Error('Failed to load data');
        }

        const assignment = await assignmentRes.json();
        const submissionsData = await submissionsRes.json();

        setAssignmentTitle(assignment.title);
        setAssignmentDetails(assignment);
        setSubmissions(submissionsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [assignmentId]);

  const handleViewSubmission = (submissionId: number) => {
    navigate(
      `/course/${courseId}/assignment/${assignmentId}/submission/${submissionId}`
    );
  };

  const handleBackToCourse = () => {
    navigate(`/course/${courseId}`);
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
        <Typography sx={{ ml: 2 }}>Loading submissions...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color='error'>{error}</Typography>
        <Button
          variant='outlined'
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, margin: 'auto', p: 3 }}>
      <Box display='flex' alignItems='center' mb={4}>
        <ArrowBack
          onClick={handleBackToCourse}
          sx={{ cursor: 'pointer', mr: 2 }}
        />
        <Typography variant='h4'>Submissions for {assignmentTitle}</Typography>
      </Box>

      {assignmentDetails && (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant='h6' gutterBottom>
            Assignment Details
          </Typography>
          <Typography paragraph>
            {assignmentDetails.description || 'No description provided.'}
          </Typography>
          <Typography color='text.secondary'>
            Due: {new Date(assignmentDetails.dueDate).toLocaleString()}
          </Typography>
        </Paper>
      )}

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box
          display='flex'
          justifyContent='space-between'
          alignItems='center'
          mb={2}
        >
          <Typography variant='h6'>
            {submissions.length} Submission{submissions.length !== 1 ? 's' : ''}
          </Typography>
          <Button
            variant='outlined'
            startIcon={<Grading />}
            onClick={() =>
              navigate(`/course/${courseId}/assignment/${assignmentId}`)
            }
          >
            View Assignment
          </Button>
        </Box>

        {submissions.length === 0 ? (
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
                  <Avatar sx={{ mr: 2 }}>
                    {submission.studentName.charAt(0)}
                  </Avatar>
                  <ListItemText
                    primary={submission.studentName}
                    secondary={`Submitted: ${new Date(
                      submission.submittedAt
                    ).toLocaleString()}`}
                  />
                  <Chip
                    label={
                      submission.grade ? `${submission.grade}%` : 'Ungraded'
                    }
                    color={submission.grade ? 'primary' : 'default'}
                    variant={submission.grade ? 'filled' : 'outlined'}
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
