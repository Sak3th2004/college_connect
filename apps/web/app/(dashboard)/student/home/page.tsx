'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useFacultyStore } from '@/stores/faculty.store';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MapPin, Clock, Calendar, Users } from 'lucide-react';
import { FacultyStatusLabels, FacultyStatusColors } from '@campusconnect/shared/constants';

export default function StudentHomePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { facultyList, isLoading, error, fetchFaculty, setSelectedFaculty } = useFacultyStore();

  useEffect(() => {
    // Redirect if not a student
    if (user && user.role !== 'STUDENT') {
      router.push(`/dashboard/${user.role.toLowerCase().replace('_', '-')}`);
    }
  }, [user, router]);

  useEffect(() => {
    fetchFaculty({ limit: 20 });
  }, [fetchFaculty]);

  const handleFacultyClick = (facultyId: string) => {
    setSelectedFaculty(facultyList.find(f => f.id === facultyId) || null);
    router.push(`/appointments/book?faculty=${facultyId}`);
  };

  const getStatusColor = (status: string) => {
    return FacultyStatusColors[status as keyof typeof FacultyStatusColors] || '#6b7280';
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Find Faculty</h1>
          <p className="text-muted-foreground">
            Check real-time availability and book appointments
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or department..."
            className="pl-8"
            onChange={(e) => {
              // Debounced search
              const timer = setTimeout(() => {
                fetchFaculty({ search: e.target.value, limit: 20 });
              }, 500);
              return () => clearTimeout(timer);
            }}
          />
        </div>
        <Button onClick={() => fetchFaculty({ limit: 20 })}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      {/* Faculty Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading faculty...</p>
          </div>
        ) : facultyList.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No faculty found</h3>
            <p className="text-muted-foreground">Try adjusting your search filters</p>
          </div>
        ) : (
          facultyList.map((faculty) => (
            <Card
              key={faculty.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleFacultyClick(faculty.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={faculty.avatar || ''} alt={`${faculty.firstName} ${faculty.lastName}`} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {faculty.firstName[0]}{faculty.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      Dr. {faculty.firstName} {faculty.lastName}
                    </CardTitle>
                    {faculty.facultyProfile?.designation && (
                      <CardDescription>{faculty.facultyProfile.designation}</CardDescription>
                    )}
                    {faculty.department && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        {faculty.department.name}
                      </div>
                    )}
                  </div>
                  <Badge
                    style={{
                      backgroundColor: getStatusColor(faculty.facultyProfile?.currentStatus || 'OFFLINE'),
                    }}
                    className="text-white"
                  >
                    {FacultyStatusLabels[faculty.facultyProfile?.currentStatus as keyof typeof FacultyStatusLabels] || 'Offline'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-3 space-y-2">
                {faculty.facultyProfile?.specialization && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {faculty.facultyProfile.specialization}
                  </p>
                )}
                {faculty.facultyProfile?.cabinNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>Room {faculty.facultyProfile.cabinNumber}</span>
                  </div>
                )}
                {faculty.facultyProfile?.statusMessage && (
                  <p className="text-xs text-muted-foreground italic">
                    "{faculty.facultyProfile.statusMessage}"
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between pt-3 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {faculty.facultyProfile?.isAcceptingAppointments ? (
                    <span className="text-green-600">Accepting appointments</span>
                  ) : (
                    <span className="text-red-600">Not accepting appointments</span>
                  )}
                </div>
                <Button size="sm" variant="default">
                  Book
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
