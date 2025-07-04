import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
  Grid,
  CircularProgress,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { School, Assignment, Group, Add } from '@mui/icons-material';

interface CourseDto {
  id: number;
  title: string;
  description: string;
  code: string;
  instructor: string;
  studentCount?: number;
  assignmentCount?: number;
}

interface HomeProps {
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  userId?: number;
}

const Home: React.FC<HomeProps> = ({ role, userId }) => {
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');

        let endpoint = '';
        if (role === 'STUDENT') {
          endpoint = '/api/courses/getMyCourses';
        } else if (role === 'TEACHER') {
          endpoint = '/api/courses/getMyCoursesForTeacher';
        } else {
          // ADMIN case
          endpoint = '/api/courses';
        }

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to fetch courses');
        }

        let data: CourseDto[] = await response.json();

        if (role === 'TEACHER') {
          // Для учителя: получаем количество студентов и заданий
          const coursesWithCounts = await Promise.all(
            data.map(async (course) => {
              try {
                const [studentsRes, assignmentsRes] = await Promise.all([
                  fetch(`/api/courses/getTheNumberOfStudents/${course.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  }),
                  fetch(`/api/courses/getTheNumberOfAssignments/${course.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  }),
                ]);

                if (!studentsRes.ok || !assignmentsRes.ok) throw new Error();

                const studentCount = await studentsRes.json();
                const assignmentCount = await assignmentsRes.json();

                return { ...course, studentCount, assignmentCount };
              } catch {
                return { ...course, studentCount: 0, assignmentCount: 0 };
              }
            })
          );
          data = coursesWithCounts;
        } else if (role === 'STUDENT') {
          // Для студента: только количество заданий
          const coursesWithAssignmentCounts = await Promise.all(
            data.map(async (course) => {
              try {
                const assignmentRes = await fetch(
                  `/api/courses/getTheNumberOfAssignments/${course.id}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );
                if (!assignmentRes.ok) throw new Error();
                const assignmentCount = await assignmentRes.json();
                return { ...course, assignmentCount };
              } catch {
                return { ...course, assignmentCount: 0 };
              }
            })
          );
          data = coursesWithAssignmentCounts;
        }

        setCourses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [role, userId]);

  const handleCourseClick = (courseId: number) => {
    navigate(`/course/${courseId}`);
  };

  const handleCreateCourse = () => {
    navigate('/courses/create');
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
        <Typography sx={{ ml: 2 }}>Loading courses...</Typography>
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
    <Box sx={{ p: 3 }}>
      <Box
        display='flex'
        justifyContent='space-between'
        alignItems='center'
        mb={4}
      >
        <Typography variant='h4'>
          {role === 'STUDENT'
            ? 'My Courses'
            : role === 'TEACHER'
            ? 'My Teaching Courses'
            : 'All Courses'}
        </Typography>
        {(role === 'TEACHER' || role === 'ADMIN') && (
          <Button
            variant='contained'
            onClick={handleCreateCourse}
            startIcon={<Add />}
          >
            Create Course
          </Button>
        )}
      </Box>

      {courses.length === 0 ? (
        <Typography variant='body1'>
          {role === 'STUDENT'
            ? 'You are not enrolled in any courses yet.'
            : role === 'TEACHER'
            ? 'You are not teaching any courses yet.'
            : 'No courses available.'}
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {courses.map((course) => (
            <Grid item xs={12} sm={6} md={4} key={course.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.03)' },
                }}
              >
                <CardActionArea
                  onClick={() => handleCourseClick(course.id)}
                  sx={{ flexGrow: 1 }}
                >
                  <CardContent>
                    <Box display='flex' alignItems='center' mb={2}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        <School />
                      </Avatar>
                      <Box>
                        <Typography variant='h6'>{course.title}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {course.code}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant='body2' paragraph>
                      {course.description || 'No description available'}
                    </Typography>
                    <Box display='flex' justifyContent='space-between'>
                      <Box display='flex' alignItems='center'>
                        <Assignment fontSize='small' sx={{ mr: 1 }} />
                        <Typography variant='body2'>
                          {course.assignmentCount || 0} assignments
                        </Typography>
                      </Box>
                      {role !== 'STUDENT' && (
                        <Box display='flex' alignItems='center'>
                          <Group fontSize='small' sx={{ mr: 1 }} />
                          <Typography variant='body2'>
                            {course.studentCount || 0} students
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Home;
