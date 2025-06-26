export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface User {
  email: string;
  role: UserRole;
  token: string;
}
