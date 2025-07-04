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
  Chip, // Added Chip for progress
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
} from '@mui/icons-material';

// --- Frontend Interfaces (Copied/Adapted from TeacherPage) ---

interface CourseDetailDto {
  id: number;
  title: string;
  description: string;
  code: string;
  instructor: string;
  progress?: number | null; // Added progress field for students
  announcements: string[];
}

interface AssignmentListItemDto {
  id: number;
  courseId: number;
  title: string;
  // Allow dueDate to be null or undefined, same as TeacherPage
  dueDate: string | null | undefined;
}

// EducationalModuleDto interface (for fetching module info)
interface EducationalModuleDto {
  id?: number; // Assuming ID is optional on creation, but present when fetched
  title: string;
  courseId: number;
  // resourceIds is expected from the /getByCourseId endpoint
  resourceIds?: number[];
}

// Combined interface for rendering (module + its actual assignment details)
interface EducationalModuleWithAssignments extends EducationalModuleDto {
  // Ensure id is always present for rendering key
  id: number; // Make ID required for displaying fetched modules
  assignments: AssignmentListItemDto[];
}

// --- Component ---

const StudentCoursePage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDetailDto | null>(null);
  const [assignmentsList, setAssignmentsList] = useState<
    AssignmentListItemDto[]
  >([]); // All assignments for the course
  const [
    educationalModulesWithAssignments,
    setEducationalModulesWithAssignments,
  ] = useState<EducationalModuleWithAssignments[]>([]); // Modules with their associated assignments
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState<number>(0);

  // --- Helper function to fetch modules and their assignments (Adapted) ---
  // This is similar to the teacher page's helper, but simplified as no modifications happen.
  const fetchDataForModules = async (
    token: string,
    courseId: string,
    allCourseAssignments: AssignmentListItemDto[]
  ) => {
    try {
      // Fetch modules for this course
      const modulesResponse = await fetch(
        `/api/educationalModule/getByCourseId/${courseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      // 404 is acceptable if no modules exist
      if (!modulesResponse.ok && modulesResponse.status !== 404) {
        const errorData = await modulesResponse
          .text()
          .catch(() => 'Failed to fetch modules');
        throw new Error(
          `Failed to fetch modules: ${modulesResponse.statusText}${
            errorData ? ` - ${errorData}` : ''
          }`
        );
      }

      const fetchedModules: EducationalModuleDto[] =
        modulesResponse.status === 404 ? [] : await modulesResponse.json();

      // Process modules and link assignments
      const modulesWithAssignmentDetails: EducationalModuleWithAssignments[] =
        [];
      for (const module of fetchedModules) {
        // Ensure fetched module has an ID before proceeding
        if (module.id === undefined || module.id === null) {
          console.warn('Skipping educational module with no ID:', module);
          continue; // Skip this module if ID is missing
        }

        // Fetch resources (assignments) for THIS module
        const resourcesResponse = await fetch(
          `/api/educationalModule/${module.id}/resources`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );

        if (!resourcesResponse.ok && resourcesResponse.status !== 404) {
          console.error(
            `Failed to fetch resources for module ${module.id}: ${resourcesResponse.statusText}`
          );
          // Continue without assignments for this module, log the error
          modulesWithAssignmentDetails.push({
            ...module,
            id: module.id, // Ensure ID is present for interface
            assignments: [],
          });
          continue;
        }

        // Assuming resources endpoint returns a list of objects with 'id'
        const resources: { id: number }[] =
          resourcesResponse.status === 404
            ? []
            : await resourcesResponse.json();

        const moduleAssignmentIds = resources.map((res) => res.id);

        // Filter the *already fetched* list of all course assignments
        const moduleAssignments = allCourseAssignments.filter(
          (assignment: AssignmentListItemDto) =>
            moduleAssignmentIds.includes(assignment.id)
        );

        modulesWithAssignmentDetails.push({
          ...module,
          id: module.id, // Ensure ID is present for interface
          assignments: moduleAssignments, // Assign the filtered list
        });
      }
      setEducationalModulesWithAssignments(modulesWithAssignmentDetails);
    } catch (moduleFetchError: any) {
      console.error(
        'Error fetching modules for student page:',
        moduleFetchError
      );
      // Optionally set a specific error state for the modules section if needed
      // setError(`Error loading modules: ${moduleFetchError.message}`);
      setEducationalModulesWithAssignments([]); // Ensure modules list is empty on error
      throw moduleFetchError; // Re-throw so initial fetch can catch it
    }
  };

  // --- Data Fetching (Adapted) ---
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

    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in.');
        setLoading(false);
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      };

      try {
        // Fetch Course Details and All Assignments
        const [courseResponse, assignmentsResponse] = await Promise.all([
          fetch(`/api/courses/getCourse/${courseId}`, { headers }),
          fetch(`/api/assignments/getAssignmentsByCourseId/${courseId}`, {
            headers,
          }),
        ]);

        if (!courseResponse.ok) {
          const errorData = await courseResponse
            .text()
            .catch(() => 'Failed to fetch course data');
          throw new Error(
            `Failed to fetch course data: ${courseResponse.statusText}${
              errorData ? ` - ${errorData}` : ''
            }`
          );
        }
        // Assignments endpoint might return 404 if no assignments exist
        if (!assignmentsResponse.ok && assignmentsResponse.status !== 404) {
          const errorData = await assignmentsResponse
            .text()
            .catch(() => 'Failed to fetch assignments');
          throw new Error(
            `Failed to fetch assignments: ${assignmentsResponse.statusText}${
              errorData ? ` - ${errorData}` : ''
            }`
          );
        }

        const courseData: CourseDetailDto = await courseResponse.json();
        // Handle 404 for assignments by returning empty array
        const assignmentsData: AssignmentListItemDto[] =
          assignmentsResponse.status === 404
            ? []
            : await assignmentsResponse.json();

        setCourse(courseData);
        setAssignmentsList(assignmentsData);

        // Now fetch modules using the helper, passing fetched assignments
        try {
          await fetchDataForModules(token, courseId, assignmentsData);
        } catch (moduleFetchError: any) {
          console.error(
            'Error loading modules during initial fetch:',
            moduleFetchError
          );
          // Decide if you want a separate error message for modules or none
          // setError(`Could not load modules: ${moduleFetchError.message}`);
          setEducationalModulesWithAssignments([]); // Ensure list is empty on error
        }
      } catch (err: any) {
        setError(`Failed to load initial course data: ${err.message}`);
        console.error('Initial fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
    // Dependencies: courseId is needed. State setters (setCourse, etc.) should not be dependencies.
  }, [courseId]);

  // --- Handlers ---

  const handleBackToCourses = () => {
    navigate('/');
  };

  // Student navigates to their assignment view, NOT the submissions page
  const handleAssignmentClick = (assignmentId: number) => {
    navigate(`/course/${courseId}/assignment/${assignmentId}`);
  };

  // Format due date, same as TeacherPage
  const formatDueDate = (dateString: string | null | undefined): string => {
    if (!dateString) {
      return 'No due date'; // Handles undefined, null, and empty string
    }
    try {
      const date = new Date(dateString);
      // Check if the date is valid
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
        <Typography sx={{ ml: 2 }}>Loading course data...</Typography>
      </Box>
    );
  }

  if (error) return <Typography color='error'>Error: {error}</Typography>;

  // Ensure course is loaded before rendering main content
  if (!course) {
    return (
      <Typography color='error'>
        Could not load essential course data or course not found.
      </Typography>
    );
  }

  // --- Render Main Component ---

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
        {/* Display student progress if available */}
        {course.progress !== undefined && course.progress !== null && (
          <Chip
            label={`Progress: ${course.progress}%`}
            color={course.progress >= 100 ? 'success' : 'primary'}
            variant='outlined'
            sx={{ fontWeight: 'bold' }}
          />
        )}
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

      {/* --- Overview Tab Content (Adapted) --- */}
      {tabValue === 0 && (
        <Box sx={{ py: 2 }}>
          <Typography variant='h6' gutterBottom component='div' sx={{ mb: 3 }}>
            Educational Modules
          </Typography>

          {educationalModulesWithAssignments.length > 0 ? (
            <List>
              {educationalModulesWithAssignments.map((module) => (
                <Paper
                  key={module.id} // Use module.id for key, now required in interface
                  elevation={1}
                  sx={{ mb: 3, p: 2 }}
                >
                  <Box
                    display='flex'
                    justifyContent='space-between'
                    alignItems='center'
                    flexWrap='wrap'
                    sx={{ mb: 2 }}
                  >
                    <Typography
                      variant='h6'
                      component='h3'
                      sx={{ mb: { xs: 1, sm: 0 } }}
                    >
                      {module.title}
                    </Typography>
                    {/* No "Add Assignment" button for students */}
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  {module.assignments.length > 0 ? (
                    <List dense disablePadding>
                      {module.assignments.map((assignment) => (
                        <ListItem
                          key={assignment.id}
                          button
                          onClick={() => handleAssignmentClick(assignment.id)}
                          sx={{ py: 1 }}
                        >
                          <Assignment sx={{ mr: 2, color: 'text.secondary' }} />
                          <ListItemText
                            primary={assignment.title}
                            secondary={
                              <Typography
                                variant='body2'
                                color='text.secondary'
                              >
                                Due: {formatDueDate(assignment.dueDate)}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ ml: 2 }}
                    >
                      No assignments added to this module yet.
                    </Typography>
                  )}
                </Paper>
              ))}
            </List>
          ) : (
            <Typography variant='body2' color='text.secondary'>
              No educational modules available for this course yet.
            </Typography>
          )}

          {/* Announcements - Keep as is */}
          <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant='h6' gutterBottom>
              Recent Announcements
            </Typography>
            {course.announcements && course.announcements.length > 0 ? (
              <List dense>
                {course.announcements.map((announcement, index) => (
                  <ListItem key={`announcement-${index}`} sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={
                        <Typography variant='body2'>{announcement}</Typography>
                      }
                      secondary={`Posted recently`} // Or format actual date if available
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant='body2' color='text.secondary'>
                No announcements yet.
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* --- Assignments Tab Content (Adapted) --- */}
      {tabValue === 1 && (
        <Box sx={{ py: 2 }}>
          <Typography variant='h6' gutterBottom>
            All Course Assignments
          </Typography>
          {/* No "Create New Assignment" button for students */}
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

      {/* --- Grades Tab Content (Placeholder) --- */}
      {tabValue === 2 && (
        <Box sx={{ py: 2 }}>
          <Typography variant='h6' gutterBottom>
            Grades
          </Typography>
          <Typography>
            Your grades for this course will appear here. (Implementation
            pending)
          </Typography>
        </Box>
      )}

      {/* --- Materials Tab Content (Placeholder) --- */}
      {tabValue === 3 && (
        <Box sx={{ py: 2 }}>
          <Typography variant='h6' gutterBottom>
            Materials
          </Typography>
          <Typography>
            Course materials will be available here. (Implementation pending)
          </Typography>
        </Box>
      )}

      {/* --- Discussion Tab Content (Placeholder) --- */}
      {tabValue === 4 && (
        <Box sx={{ py: 2 }}>
          <Typography variant='h6' gutterBottom>
            Discussion Forum
          </Typography>
          <Typography>
            Discussion forum content will go here. (Implementation pending)
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default StudentCoursePage;
