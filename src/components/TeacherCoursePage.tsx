import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Avatar,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Assignment,
  Grade,
  Book,
  VideoLibrary,
  Forum,
  ArrowBack,
  Add,
} from '@mui/icons-material';

interface CourseDetailDto {
  id: number;
  title: string;
  description: string;
  code: string;
  instructor: string;
  announcements: string[];
}

interface AssignmentListItemDto {
  id: number;
  courseId: number;
  title: string;
  dueDate: string;
}

const TeacherCoursePage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDetailDto | null>(null);
  const [assignmentsList, setAssignmentsList] = useState<
    AssignmentListItemDto[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState<number>(0);

  useEffect(() => {
    if (!courseId) {
      setError('Course ID is missing from the URL.');
      setLoading(false);
      return;
    }
    const id = Number(courseId);
    if (isNaN(id)) {
      setError('Invalid Course ID provided in the URL.');
      setLoading(false);
      return;
    }

    const fetchCourseData = async () => {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in.');
        setLoading(false);
        return;
      }

      try {
        const [courseResponse, assignmentsResponse] = await Promise.all([
          fetch(`/api/courses/getCourse/${courseId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }),
          fetch(`/api/assignments/getAssignmentsByCourseId/${courseId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }),
        ]);

        if (!courseResponse.ok || !assignmentsResponse.ok) {
          throw new Error('Failed to fetch course data');
        }

        const [courseData, assignmentsData] = await Promise.all([
          courseResponse.json(),
          assignmentsResponse.json(),
        ]);

        setCourse(courseData);
        setAssignmentsList(assignmentsData);
      } catch (err: any) {
        setError(`Failed to load course data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId]);

  const handleBackToCourses = () => {
    navigate('/');
  };

  const handleAssignmentClick = (assignmentId: number) => {
    navigate(`/course/${courseId}/assignment/${assignmentId}/submissions`);
  };

  const handleCreateAssignment = () => {
    navigate(`/course/${courseId}/create-assignment`);
  };

  const formatDueDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString;
    }
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
        <Typography sx={{ ml: 2 }}>Loading course data...</Typography>
      </Box>
    );
  }

  if (error) return <Typography color='error'>{error}</Typography>;
  if (!course)
    return <Typography>Course data could not be loaded or found.</Typography>;

  return (
    <Box sx={{ maxWidth: 1200, margin: 'auto' }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={handleBackToCourses}
        sx={{ mb: 3 }}
      >
        Back to Courses
      </Button>

      <Box display='flex' alignItems='center' mb={4}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, mr: 3 }}>
          <Book fontSize='large' />
        </Avatar>
        <Box>
          <Typography variant='h4' component='h1'>
            {course.title}
          </Typography>
          <Typography variant='subtitle1' color='text.secondary'>
            {course.code} • {course.instructor}
          </Typography>
        </Box>
      </Box>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant='body1' paragraph>
          {course.description}
        </Typography>
      </Paper>

      <Tabs
        value={tabValue}
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
        aria-label='course details tabs'
      >
        <Tab label='Overview' icon={<Book />} />
        <Tab label='Assignments' icon={<Assignment />} />
        <Tab label='Grades' icon={<Grade />} />
        <Tab label='Materials' icon={<VideoLibrary />} disabled />
        <Tab label='Discussion' icon={<Forum />} disabled />
      </Tabs>

      {tabValue === 0 && (
        <Box sx={{ py: 2 }}>
          <Typography variant='h6' gutterBottom>
            Announcements
          </Typography>
          {course.announcements && course.announcements.length > 0 ? (
            <List>
              {course.announcements.map((announcement, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={announcement}
                      secondary={`Posted recently`}
                    />
                  </ListItem>
                  {index < course.announcements.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant='body2' color='text.secondary'>
              No announcements yet.
            </Typography>
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <Box sx={{ py: 2 }}>
          <Box
            display='flex'
            justifyContent='space-between'
            alignItems='center'
            mb={2}
          >
            <Typography variant='h6' gutterBottom>
              Assignments
            </Typography>
            <Button
              variant='contained'
              startIcon={<Add />}
              onClick={handleCreateAssignment}
            >
              Create Assignment
            </Button>
          </Box>
          {assignmentsList.length > 0 ? (
            <List>
              {assignmentsList.map((assignment) => (
                <Paper
                  key={assignment.id}
                  sx={{
                    mb: 2,
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.9 },
                  }}
                  onClick={() => handleAssignmentClick(assignment.id)}
                >
                  <Box
                    display='flex'
                    justifyContent='space-between'
                    alignItems='center'
                    flexWrap='wrap'
                  >
                    <Box sx={{ mr: 2, mb: { xs: 1, sm: 0 } }}>
                      <Typography variant='subtitle1'>
                        {assignment.title}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Due: {formatDueDate(assignment.dueDate)}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </List>
          ) : (
            <Typography variant='body2' color='text.secondary'>
              No assignments posted for this course yet.
            </Typography>
          )}
        </Box>
      )}

      {tabValue === 2 && (
        <Box sx={{ py: 2 }}>
          <Typography variant='h6' gutterBottom>
            Grades
          </Typography>
          <Typography>Grades content will go here.</Typography>
        </Box>
      )}

      {tabValue === 3 && (
        <Box sx={{ py: 2 }}>
          <Typography variant='h6' gutterBottom>
            Materials
          </Typography>
          <Typography>Course materials content will go here.</Typography>
        </Box>
      )}

      {tabValue === 4 && (
        <Box sx={{ py: 2 }}>
          <Typography variant='h6' gutterBottom>
            Discussion Forum
          </Typography>
          <Typography>Discussion forum content will go here.</Typography>
        </Box>
      )}
    </Box>
  );
};

export default TeacherCoursePage;
