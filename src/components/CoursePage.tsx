// components/CoursePage.tsx
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
  CircularProgress, // Import CircularProgress for loading
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Assignment,
  Grade,
  Book,
  VideoLibrary,
  Forum,
  ArrowBack,
} from '@mui/icons-material';

// --- Interfaces ---

// Interface for the basic Course Details (fetched from /api/courses/getCourse/{courseId})
// This should *not* include the assignments array anymore, as they are fetched separately.
interface CourseDetailDto {
  id: number;
  title: string;
  description: string;
  code: string;
  instructor: string; // Assuming this is part of the course detail
  progress?: number | null; // Example field, optional
  announcements: string[]; // Example field
  // Remove the assignments array here as it's fetched by a different endpoint
  // assignments: {...}[]; // <-- REMOVED
}

// Interface for an item in the Assignment List (fetched from /api/assignments/getAssignmentsByCourseId/{courseId})
// This doesn't need all details, just enough to display in the list and provide the ID for navigation
interface AssignmentListItemDto {
  id: number;
  courseId: number; // Might be included, useful but not strictly necessary if we have courseId from URL
  title: string;
  dueDate: string; // Keep as string for simple display, or format if needed in list
  // The list endpoint might also include status and grade for a quick overview
  // status: 'Not Started' | 'In Progress' | 'Submitted' | 'Graded';
  // grade?: number | null;
  // Add other fields if the list endpoint provides them
}

const CoursePage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  // State for Course Details (excluding assignments)
  const [course, setCourse] = useState<CourseDetailDto | null>(null);
  // State for the List of Assignments for this course
  const [assignmentsList, setAssignmentsList] = useState<
    AssignmentListItemDto[]
  >([]);

  // Combined loading and error states for both fetches
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [tabValue, setTabValue] = useState<number>(0);

  // --- Effects to Fetch Data ---

  useEffect(() => {
    console.log('CoursePage useEffect: courseId from URL:', courseId); // Log courseId on mount/change

    // Ensure courseId is available and is a valid number
    if (!courseId) {
      setError('Course ID is missing from the URL.');
      setLoading(false);
      return;
    }
    const id = Number(courseId); // Convert URL string to number
    if (isNaN(id)) {
      setError('Invalid Course ID provided in the URL.');
      setLoading(false);
      return;
    }

    // Function to fetch both course details AND the assignment list
    const fetchCourseData = async () => {
      setLoading(true);
      setError(null); // Clear previous errors

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in.');
        setLoading(false);
        // Optionally redirect to login page here
        // navigate('/login');
        return;
      }

      try {
        // --- Fetch Course Details ---
        console.log(
          `CoursePage Fetch: Fetching course details for ID: ${courseId}`
        ); // Log fetch start
        const courseResponse = await fetch(
          `/api/courses/getCourse/${courseId}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );

        if (!courseResponse.ok) {
          const errorBody = await courseResponse.text();
          throw new Error(
            `HTTP error fetching course details: ${courseResponse.status} ${
              courseResponse.statusText
            } - ${errorBody || 'No additional error info'}`
          );
        }
        const courseData: CourseDetailDto = await courseResponse.json();
        console.log(
          'CoursePage Fetch: Successfully fetched course details:',
          courseData
        ); // Log successful fetch
        setCourse(courseData); // Update course state

        // --- Fetch Assignment List ---
        const assignmentsResponse = await fetch(
          `/api/assignments/getAssignmentsByCourseId/${courseId}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );

        if (!assignmentsResponse.ok) {
          const errorBody = await assignmentsResponse.text();
          throw new Error(
            `HTTP error fetching assignments list: ${
              assignmentsResponse.status
            } ${assignmentsResponse.statusText} - ${
              errorBody || 'No additional error info'
            }`
          );
        }
        const assignmentsData: AssignmentListItemDto[] =
          await assignmentsResponse.json();
        console.log(
          'CoursePage Fetch: Successfully fetched assignments list:',
          assignmentsData
        ); // Log successful fetch
        setAssignmentsList(assignmentsData); // Update assignments list state
      } catch (err: any) {
        console.error('Caught exception while fetching course data:', err);
        setError(
          `Failed to load course data. Please try again. Details: ${err.message}`
        );
      } finally {
        setLoading(false); // Stop loading regardless of success or failure of either fetch
      }
    };

    fetchCourseData(); // Execute the async fetch function
  }, [courseId]); // Dependency array includes courseId so effect re-runs if courseId changes

  // --- Handlers ---

  const handleBackToCourses = () => {
    navigate('/'); // Navigate back to the home page (My Courses list)
  };

  // Handler to navigate to the specific assignment detail page
  const handleAssignmentClick = (assignmentId: number) => {
    const targetPath = `/course/${courseId}/assignment/${assignmentId}`;
    console.log(
      `CoursePage Handler: Attempting to navigate to assignment: ${targetPath}`
    ); // Log the path before navigating
    // Use navigate to go to the AssignmentPage route
    navigate(targetPath);
  };

  // --- Conditional Rendering (Loading/Error/No Data) ---

  if (loading)
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
  if (error) return <Typography color='error'>{error}</Typography>;
  // Check if course data was successfully loaded
  if (!course) {
    // This case should ideally only be hit if loading=false and error=null,
    // meaning the fetch succeeded but returned null or an empty object unexpectedly.
    // Given the error handling above, it's more likely `error` will be set.
    // Keep this as a fallback.
    return <Typography>Course data could not be loaded or found.</Typography>;
  }

  // Function to format the ISO 8601 date string (can reuse this)
  const formatDueDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      console.error('Failed to parse or format date string:', dateString, e);
      return dateString;
    }
  };

  return (
    // Removed p:3 from this Box as the Layout component provides p:4 around the Outlet
    // Added maxWidth and margin: 'auto' to center the content within the available space
    <Box sx={{ maxWidth: 1200, margin: 'auto' }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={handleBackToCourses}
        sx={{ mb: 3 }}
      >
        Back to Courses
      </Button>

      {/* Course Header */}
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

      {/* Course Description */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant='body1' paragraph>
          {course.description}
        </Typography>
        {course.progress !== undefined && course.progress !== null && (
          <Chip
            label={`Progress: ${course.progress}%`}
            color={course.progress >= 100 ? 'success' : 'primary'}
            variant='outlined'
            sx={{ fontWeight: 'bold' }}
          />
        )}
      </Paper>

      {/* Tabs */}
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

      {/* --- Tab Content --- */}

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
          <Typography variant='h6' gutterBottom>
            Assignments
          </Typography>
          {assignmentsList.length > 0 ? ( // Use the new assignmentsList state
            <List>
              {assignmentsList.map(
                (
                  assignment // Iterate over assignmentsList
                ) => (
                  <Paper
                    key={assignment.id}
                    sx={{
                      mb: 2,
                      p: 2,
                      cursor: 'pointer',
                      '&:hover': { opacity: 0.9 },
                    }} // Add cursor and hover effect
                    onClick={() => handleAssignmentClick(assignment.id)} // Add click handler
                  >
                    <Box
                      display='flex'
                      justifyContent='space-between'
                      alignItems='center'
                      flexWrap='wrap'
                    >
                      <Box sx={{ mr: 2, mb: { xs: 1, sm: 0 } }}>
                        {/* Display only title and due date from the list item */}
                        <Typography variant='subtitle1'>
                          {assignment.title}
                        </Typography>
                        {/* Format dueDate for better readability if desired, otherwise just display string */}
                        <Typography variant='body2' color='text.secondary'>
                          Due: {formatDueDate(assignment.dueDate)}{' '}
                          {/* Basic date formatting */}
                        </Typography>
                      </Box>
                      {/* You might display basic status/grade if the list endpoint provides it */}
                      {/* Example if AssignmentListItemDto included status and grade: */}
                      {/* <Box display='flex' alignItems='center' flexWrap='wrap'>
                         {assignment.status && <Chip label={assignment.status} ... sx={{ mr: 1 }} />}
                         {assignment.grade !== undefined && assignment.grade !== null && <Chip label={`Grade: ${assignment.grade}%`} ... />}
                     </Box> */}
                    </Box>
                    {/* Removed the "Open Assignment" button as the whole card is now clickable */}
                  </Paper>
                )
              )}
            </List>
          ) : (
            // Message if the assignmentsList is empty after loading
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

export default CoursePage;
