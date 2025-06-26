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
import { ArrowBack, Check, Close } from '@mui/icons-material';

interface SubmissionDetail {
  id: number;
  studentId: number;
  studentName: string;
  submittedAt: string;
  fileUrl: string;
  text: string;
  grade?: number | null;
  feedback?: string;
}

const SubmissionGradingPage: React.FC = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `/api/submissions//getSubmissionById/${submissionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) throw new Error('Failed to load submission');

        const data = await res.json();
        setSubmission(data);
        setGrade(data.grade || null);
        setFeedback(data.feedback || '');
      } catch (err) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [submissionId]);

  const handleSaveGrade = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/submissions/grade/${submissionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ grade, feedback }),
      });

      if (!res.ok) throw new Error('Failed to save grade');

      // Update local state with new grade/feedback
      setSubmission((prev) => (prev ? { ...prev, grade, feedback } : null));
    } catch (err) {
      setError(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color='error'>{error}</Typography>;
  if (!submission) return <Typography>Submission not found</Typography>;

  return (
    <Box sx={{ maxWidth: 1200, margin: 'auto', p: 3 }}>
      <Box display='flex' alignItems='center' mb={4}>
        <ArrowBack
          onClick={() => navigate(-1)}
          sx={{ cursor: 'pointer', mr: 2 }}
        />
        <Typography variant='h4'>Grade Submission</Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display='flex' alignItems='center' mb={3}>
          <Avatar sx={{ mr: 2, width: 56, height: 56 }}>
            {submission.studentName.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant='h6'>{submission.studentName}</Typography>
            <Typography variant='body2' color='text.secondary'>
              Submitted: {new Date(submission.submittedAt).toLocaleString()}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {submission.text && (
          <Box mb={3}>
            <Typography variant='h6' gutterBottom>
              Text Submission
            </Typography>
            <Paper variant='outlined' sx={{ p: 2 }}>
              <Typography>{submission.text}</Typography>
            </Paper>
          </Box>
        )}

        {submission.fileUrl && (
          <Box mb={3}>
            <Typography variant='h6' gutterBottom>
              Attached File
            </Typography>
            <Button
              variant='contained'
              href={submission.fileUrl}
              target='_blank'
            >
              View Submission File
            </Button>
          </Box>
        )}

        <Box mb={3}>
          <Typography variant='h6' gutterBottom>
            Grade
          </Typography>
          <Rating
            value={grade ? grade / 20 : null} // Convert percentage to 1-5 scale
            max={5}
            onChange={(_, newValue) =>
              setGrade(newValue ? newValue * 20 : null)
            }
          />
          <TextField
            label='Percentage'
            type='number'
            value={grade || ''}
            onChange={(e) => setGrade(Number(e.target.value))}
            sx={{ ml: 2, width: 100 }}
            inputProps={{ min: 0, max: 100 }}
          />
        </Box>

        <TextField
          label='Feedback'
          multiline
          rows={4}
          fullWidth
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Box display='flex' justifyContent='flex-end'>
          <Button
            variant='contained'
            color='primary'
            startIcon={saving ? <CircularProgress size={20} /> : <Check />}
            onClick={handleSaveGrade}
            disabled={saving}
            sx={{ mr: 2 }}
          >
            Save Grade
          </Button>
          <Button
            variant='outlined'
            startIcon={<Close />}
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SubmissionGradingPage;
