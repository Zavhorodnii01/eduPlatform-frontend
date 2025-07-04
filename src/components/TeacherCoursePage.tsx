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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  PlaylistAdd,
} from '@mui/icons-material';

// --- Frontend Interfaces ---

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
  // CORRECTED: Allow dueDate to be null or undefined based on runtime possibility
  dueDate: string | null | undefined;
}

// EducationalModuleDto interface (assuming backend now has courseId and id is optional)
interface EducationalModuleDto {
  id?: number; // Made ID optional as it's not present on creation DTO
  title: string;
  // teacherId is removed from DTO based on previous discussion
  // courseId is added
  courseId: number | null | undefined;

  // Assuming /getByCourseId returns module info + resourceIds (assignment IDs)
  resourceIds?: number[];
}

// Interface specifically for the POST request body when creating a module
interface CreateEducationalModuleDto {
  title: string;
  // teacherId is removed based on backend DTO update, but add back if needed by backend POST
  // teacherId?: number;
  courseId: number; // Include courseId
}

// Combined interface for rendering (module + its actual assignment details)
interface EducationalModuleWithAssignments extends EducationalModuleDto {
  assignments: AssignmentListItemDto[];
}

// REMOVED: CurrentUserDto interface - no longer used

// --- Component ---

const TeacherCoursePage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDetailDto | null>(null);
  // REMOVED: currentUser state - no longer used in UI or API calls
  // const [currentUser, setCurrentUser] = useState<CurrentUserDto | null>(null);
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

  // State for Modals
  const [showCreateModuleModal, setShowCreateModuleModal] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [showAddAssignmentModal, setShowAddAssignmentModal] = useState(false);
  const [selectedModuleForAssignment, setSelectedModuleForAssignment] =
    useState<EducationalModuleWithAssignments | null>(null);
  const [selectedAssignmentToAddId, setSelectedAssignmentToAddId] = useState<
    number | null
  >(null);

  // Helper function to refetch modules and their assignments
  // Defined outside useEffect so it can be called by handlers
  // Accepts the list of all assignments for the course
  const fetchDataForModules = async (
    token: string,
    courseId: string,
    allCourseAssignments: AssignmentListItemDto[]
  ) => {
    // We might want to clear specific module-related errors here, but not the main page error
    // setError(null); // Only clear if module errors are separate from main errors
    try {
      // Fetch modules for this course using the ASSUMED endpoint /getByCourseId/{courseId}
      const modulesResponse = await fetch(
        `/api/educationalModule/getByCourseId/${courseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (!modulesResponse.ok && modulesResponse.status !== 404) {
        // 404 is acceptable if no modules exist yet
        // Attempt to read error message
        const errorData = await modulesResponse
          .text()
          .catch(() => 'Failed to fetch modules');
        throw new Error(
          `Failed to fetch modules: ${modulesResponse.statusText}${
            errorData ? ` - ${errorData}` : ''
          }`
        );
      }
      // If 404, modulesData will be an empty array, which is handled below
      const fetchedModules: EducationalModuleDto[] =
        modulesResponse.status === 404 ? [] : await modulesResponse.json();

      // Process modules and link assignments
      const modulesWithAssignmentDetails: EducationalModuleWithAssignments[] =
        [];
      for (const module of fetchedModules) {
        // Fetch resources (assignments) for THIS module using the endpoint /educationalModule/{educationalModuleId}/resources
        // This endpoint is assumed to return a list of Resources, which for assignments, we hope include IDs that match AssignmentListItemDto IDs.
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
          modulesWithAssignmentDetails.push({ ...module, assignments: [] });
          continue; // Skip to next module's resources fetch
        }

        // Assuming resources endpoint returns a list of objects, each having an 'id' property.
        // If the backend `/resources` endpoint *already* returns AssignmentListItemDto shape (id, title, dueDate),
        // we could just use that directly instead of filtering `allCourseAssignments`.
        // Let's assume it returns objects with `id` and filter `allCourseAssignments`.
        const resources: { id: number }[] =
          resourcesResponse.status === 404
            ? []
            : await resourcesResponse.json();

        // Get the IDs of resources (assignments) associated with this module
        const moduleAssignmentIds = resources.map((res) => res.id);

        // Filter the *already fetched* list of all course assignments (`allCourseAssignments`)
        // to find the full details for the assignments linked to THIS module.
        const moduleAssignments = allCourseAssignments.filter(
          (assignment: AssignmentListItemDto) =>
            moduleAssignmentIds.includes(assignment.id)
        );

        modulesWithAssignmentDetails.push({
          ...module,
          assignments: moduleAssignments, // Assign the filtered list of full assignment details
        });
      }
      setEducationalModulesWithAssignments(modulesWithAssignmentDetails);
    } catch (moduleFetchError: any) {
      // Log error, but potentially don't set global error state if main course data loaded
      console.error('Error refreshing modules:', moduleFetchError);
      // Decide on specific error handling for just the modules section if needed
      // setError(`Error loading modules: ${moduleFetchError.message}`);
      setEducationalModulesWithAssignments([]); // Ensure modules list is empty on error
      throw moduleFetchError; // Re-throw so calling functions can catch it (e.g., in initial fetch)
    }
  };

  // --- Data Fetching ---
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
      setLoading(true); // Start loading
      setError(null); // Clear errors

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
        // --- Fetch Course Details and All Assignments ---
        const [
          courseResponse,
          assignmentsResponse,
          // REMOVED: currentUserResponse fetch - no longer used
        ] = await Promise.all([
          fetch(`/api/courses/getCourse/${courseId}`, { headers }),
          fetch(`/api/assignments/getAssignmentsByCourseId/${courseId}`, {
            headers,
          }),
        ]);

        // Check responses BEFORE processing JSON
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
        if (!assignmentsResponse.ok) {
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
        const assignmentsData: AssignmentListItemDto[] =
          await assignmentsResponse.json();

        setCourse(courseData);
        setAssignmentsList(assignmentsData);
        // REMOVED: setCurrentUser - no longer used

        // --- Now fetch modules and process them using the helper ---
        // Pass the fetched token, courseId, and the list of all course assignments
        try {
          await fetchDataForModules(token, courseId, assignmentsData);
        } catch (moduleFetchError: any) {
          // This error is already logged in fetchDataForModules
          // Decide if a separate error message for modules section is needed
          // e.g., setError(`Could not load modules: ${moduleFetchError.message}`);
          setEducationalModulesWithAssignments([]); // Ensure modules list is empty on error
        }
      } catch (err: any) {
        setError(`Failed to load initial course data: ${err.message}`);
        console.error('Initial fetch error:', err);
      } finally {
        setLoading(false); // End loading
      }
    };

    fetchInitialData();
    // Dependencies: courseId is required to fetch data for the specific course.
    // assignmentsList and educationalModulesWithAssignments are state updated BY the effect,
    // so they should NOT be dependencies to avoid infinite loops.
  }, [courseId]);

  // --- Handlers ---

  const handleBackToCourses = () => {
    navigate('/');
  };

  const handleAssignmentClick = (assignmentId: number) => {
    navigate(`/course/${courseId}/assignment/${assignmentId}/submissions`);
  };

  const handleCreateAssignment = () => {
    navigate(`/course/${courseId}/create-assignment`);
  };

  // CORRECTED: Updated function signature to accept string | null | undefined
  // This makes it compatible with potential variations in backend data
  const formatDueDate = (dateString: string | null | undefined): string => {
    if (!dateString) {
      return 'No due date'; // Handles undefined, null, and empty string
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original string if it's an invalid date format
      return date.toLocaleString([], {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString; // Return original string on error
    }
  };

  // --- Modal Handlers ---

  const handleOpenCreateModuleModal = () => {
    setNewModuleTitle(''); // Clear previous title
    setShowCreateModuleModal(true);
  };

  const handleCloseCreateModuleModal = () => {
    setShowCreateModuleModal(false);
  };

  const handleCreateModule = async () => {
    if (!newModuleTitle.trim()) {
      // Basic validation
      alert('Module title is required.');
      return;
    }
    if (!courseId) {
      // courseId must be in URL params
      setError('Course ID is missing. Cannot create module.');
      // Consider showing a persistent error or redirecting
      return;
    }

    setLoading(true); // Show loading indicator for the action
    // setError(null); // Consider clearing modal-specific errors

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token not found. Please log in.');
      setLoading(false);
      return;
    }

    try {
      // Using the CreateEducationalModuleDto interface for the request body
      const moduleDto: CreateEducationalModuleDto = {
        title: newModuleTitle,
        courseId: Number(courseId), // Include courseId from useParams (convert string to number)
        // teacherId removed from DTO based on backend update discussion
        // If backend POST still needs teacherId, add it back: teacherId: currentUser?.id || -1, // Use -1 or handle missing user error earlier
      };

      const response = await fetch('/api/educationalModule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(moduleDto),
      });

      if (!response.ok) {
        const errorData = await response
          .text()
          .catch(() => 'Failed to create module');
        // Handle specific backend errors like 400 (validation) or 404 (course not found)
        throw new Error(
          `Failed to create module: ${response.statusText}${
            errorData ? ` - ${errorData}` : ''
          }`
        );
      }

      console.log('Module created successfully');

      // Close modal
      handleCloseCreateModuleModal();
      // Re-fetch modules to show the new one. Pass the existing assignments list
      // as it doesn't need to be re-fetched if only a module was created.
      await fetchDataForModules(token, courseId, assignmentsList);
    } catch (err: any) {
      // Set main page error or a modal-specific error
      setError(`Error creating module: ${err.message}`);
      console.error('Create module error:', err);
    } finally {
      setLoading(false); // Ensure loading stops even on error
    }
  };

  const handleOpenAddAssignmentModal = (
    module: EducationalModuleWithAssignments
  ) => {
    setSelectedModuleForAssignment(module);
    setSelectedAssignmentToAddId(null); // Clear previous selection
    setShowAddAssignmentModal(true);
  };

  const handleCloseAddAssignmentModal = () => {
    setShowAddAssignmentModal(false);
    setSelectedModuleForAssignment(null);
    setSelectedAssignmentToAddId(null);
  };

  const handleAddAssignmentToModule = async () => {
    if (!selectedModuleForAssignment || selectedAssignmentToAddId === null) {
      alert('Please select a module and an assignment.');
      return;
    }
    const moduleToAddId = selectedModuleForAssignment.id;
    const assignmentToLinkId = selectedAssignmentToAddId;

    // Safety check: moduleToAddId is optional in interface but required for this action
    if (moduleToAddId === undefined) {
      console.error('Attempted to add assignment to a module with no ID.');
      setError('Internal error: Module ID is missing.'); // Set an error state
      setShowAddAssignmentModal(false); // Close modal
      return;
    }

    setLoading(true); // Show loading indicator for the action
    // setError(null); // Consider clearing modal-specific errors

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token not found. Please log in.');
      setLoading(false);
      return;
    }

    try {
      // Use the backend POST endpoint to add resource (assignment) to module
      // ASSUMING assignment ID is the resource ID and the endpoint is /educationalModule/{educationalModuleId}/resources/{resourceId}
      const response = await fetch(
        `/api/educationalModule/${moduleToAddId}/resources/${assignmentToLinkId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json', // Added Accept header
          },
          // Backend endpoint definition shows no request body for this, so don't send one
        }
      );

      if (!response.ok) {
        const errorData = await response
          .text()
          .catch(() => 'Failed to add assignment to module');
        // Handle specific backend errors like 400 (validation) or 404 (module/resource not found)
        throw new Error(
          `Failed to add assignment to module: ${response.statusText}${
            errorData ? ` - ${errorData}` : ''
          }`
        );
      }

      console.log(
        `Assignment ${assignmentToLinkId} added to module ${moduleToAddId} successfully.`
      );

      handleCloseAddAssignmentModal();
      // Re-fetch modules to show the updated list with the new assignment linked.
      // Pass the existing assignments list as it doesn't need to be re-fetched.
      //await fetchDataForModules(token, courseId, assignmentsList);
    } catch (err: any) {
      // Set main page error or a modal-specific error
      setError(`Error adding assignment: ${err.message}`);
      console.error('Add assignment error:', err);
    } finally {
      setLoading(false); // Ensure loading stops even on error
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
        Could not load essential course data.
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
      </Paper>

      <Tabs
        value={tabValue}
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
        aria-label='course details tabs'
      >
        {/* Overview Tab - Modified */}
        <Tab label='Overview' icon={<Book />} />
        {/* Assignments Tab - Kept for listing all */}
        <Tab label='Assignments' icon={<Assignment />} />
        {/* Other Tabs */}
        <Tab label='Grades' icon={<Grade />} />
        <Tab label='Materials' icon={<VideoLibrary />} disabled />
        <Tab label='Discussion' icon={<Forum />} disabled />
      </Tabs>

      {/* --- Overview Tab Content --- */}
      {tabValue === 0 && (
        <Box sx={{ py: 2 }}>
          <Box
            display='flex'
            justifyContent='space-between'
            alignItems='center'
            mb={3}
            flexWrap='wrap'
          >
            <Typography
              variant='h6'
              gutterBottom
              component='div'
              sx={{ mb: { xs: 2, sm: 0 } }}
            >
              Educational Modules
            </Typography>
            {/* Teacher only button - Backend auth protects the API */}
            <Button
              variant='contained'
              startIcon={<Add />}
              onClick={handleOpenCreateModuleModal}
            >
              Create New Module
            </Button>
          </Box>

          {educationalModulesWithAssignments.length > 0 ? (
            <List>
              {educationalModulesWithAssignments.map((module) => (
                // Added key check just in case ID is missing, though it should have an ID after fetching
                <Paper
                  key={module.id ?? `module-${module.title}`}
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
                    {/* Teacher only button - Backend auth protects the API */}
                    <Button
                      size='small'
                      startIcon={<PlaylistAdd />}
                      onClick={() => handleOpenAddAssignmentModal(module)}
                    >
                      Add Assignment
                    </Button>
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
                            // Using formatDueDate which now accepts string | null | undefined
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
              No educational modules created for this course yet.
            </Typography>
          )}

          {/* Announcements */}
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
                      secondary={`Posted recently`}
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

      {/* --- Assignments Tab Content (Kept as is) --- */}
      {tabValue === 1 && (
        <Box sx={{ py: 2 }}>
          <Box
            display='flex'
            justifyContent='space-between'
            alignItems='center'
            mb={2}
            flexWrap='wrap'
          >
            <Typography
              variant='h6'
              gutterBottom
              component='div'
              sx={{ mb: { xs: 2, sm: 0 } }}
            >
              All Course Assignments
            </Typography>
            <Button
              variant='contained'
              startIcon={<Add />}
              onClick={handleCreateAssignment}
            >
              Create New Assignment
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
                      {/* Using formatDueDate which now accepts string | null | undefined */}
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
            Grades content will go here. (Implementation pending)
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
            Course materials content will go here. (Implementation pending)
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

      {/* --- Create Module Modal --- */}
      <Dialog
        open={showCreateModuleModal}
        onClose={handleCloseCreateModuleModal}
      >
        <DialogTitle>Create New Educational Module</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin='dense'
            label='Module Title'
            type='text'
            fullWidth
            variant='standard'
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            error={!newModuleTitle.trim() && showCreateModuleModal} // Basic validation feedback
            helperText={
              !newModuleTitle.trim() && showCreateModuleModal
                ? 'Module title is required'
                : ''
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateModuleModal}>Cancel</Button>
          <Button
            onClick={handleCreateModule}
            variant='contained'
            disabled={!newModuleTitle.trim() || loading}
          >
            {' '}
            {/* Disable if title is empty or loading */}
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- Add Assignment to Module Modal --- */}
      <Dialog
        open={showAddAssignmentModal}
        onClose={handleCloseAddAssignmentModal}
      >
        <DialogTitle>
          Add Assignment to Module: {selectedModuleForAssignment?.title}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id='select-assignment-label'>
              Select Assignment
            </InputLabel>
            <Select
              labelId='select-assignment-label'
              id='select-assignment'
              value={selectedAssignmentToAddId || ''}
              label='Select Assignment'
              onChange={(e) =>
                setSelectedAssignmentToAddId(Number(e.target.value))
              }
            >
              {/* Filter assignments that are NOT already in this module */}
              {assignmentsList
                .filter(
                  (assignment) =>
                    selectedModuleForAssignment && // Ensure module is selected
                    !selectedModuleForAssignment.assignments.some(
                      (modAssign) => modAssign.id === assignment.id
                    )
                )
                .map((assignment) => (
                  <MenuItem key={assignment.id} value={assignment.id}>
                    {assignment.title} (Due: {formatDueDate(assignment.dueDate)}
                    ) {/* Using corrected formatDueDate */}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          {assignmentsList.filter(
            (assignment) =>
              selectedModuleForAssignment &&
              !selectedModuleForAssignment.assignments.some(
                (modAssign) => modAssign.id === assignment.id
              )
          ).length === 0 && (
            <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
              No unassigned assignments available to add to this module. You may
              need to{' '}
              <span
                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={handleCreateAssignment}
              >
                create a new assignment
              </span>{' '}
              first (then add it here).
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddAssignmentModal}>Cancel</Button>
          <Button
            onClick={handleAddAssignmentToModule}
            variant='contained'
            disabled={selectedAssignmentToAddId === null || loading} // Disable if no assignment selected or loading
          >
            Add Assignment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherCoursePage;
