'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useAppointmentStore } from '@/stores/appointment.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, Clock, MapPin, User, Plus } from 'lucide-react';
import { AppointmentStatus } from '@campusconnect/shared/constants';

export default function StudentAppointmentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { appointments, isLoading, fetchAppointments, cancelAppointment, rateAppointment } = useAppointmentStore();

  useEffect(() => {
    if (!user || user.role !== 'STUDENT') {
      router.push('/dashboard');
      return;
    }

    fetchAppointments({ limit: 20 });
  }, [user, fetchAppointments, router]);

  const handleCancel = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    const result = await cancelAppointment(appointmentId);
    if (result.success) {
      toast.success('Appointment cancelled');
    } else {
      toast.error(result.error || 'Failed to cancel appointment');
    }
  };

  const handleRate = async (appointmentId: string, rating: number) => {
    const result = await rateAppointment(appointmentId, rating);
    if (result.success) {
      toast.success('Thank you for your feedback!');
    } else {
      toast.error(result.error || 'Failed to submit rating');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case AppointmentStatus.REQUESTED:
        return 'secondary';
      case AppointmentStatus.APPROVED:
        return 'default';
      case AppointmentStatus.REJECTED:
        return 'destructive';
      case AppointmentStatus.COMPLETED:
        return 'outline';
      case AppointmentStatus.CANCELLED:
        return 'destructive';
      case AppointmentStatus.NO_SHOW:
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (!user) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  const upcomingAppointments = appointments.filter(
    (apt) => apt.status === AppointmentStatus.REQUESTED || apt.status === AppointmentStatus.APPROVED
  );
  const pastAppointments = appointments.filter(
    (apt) => apt.status === AppointmentStatus.COMPLETED || apt.status === AppointmentStatus.CANCELLED || apt.status === AppointmentStatus.REJECTED
  );

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Appointments</h1>
          <p className="text-muted-foreground">View and manage your appointments</p>
        </div>
        <Button onClick={() => router.push('/dashboard/student/home')}>
          <Plus className="mr-2 h-4 w-4" />
          Book New Appointment
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!isLoading && upcomingAppointments.length === 0 && pastAppointments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No appointments yet</h3>
            <p className="text-muted-foreground mb-4">
              Book an appointment with a faculty member to get started.
            </p>
            <Button onClick={() => router.push('/dashboard/student/home')}>
              Find Faculty
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Upcoming</h2>
          <div className="grid gap-4">
            {upcomingAppointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{appointment.title}</CardTitle>
                      <CardDescription>
                        with Dr. {appointment.faculty.firstName} {appointment.faculty.lastName}
                        {appointment.faculty.facultyProfile?.designation && (
                          <>, {appointment.faculty.facultyProfile.designation}</>
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(appointment.status) as any}>
                      {appointment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {appointment.requestedDate
                          ? new Date(appointment.requestedDate).toLocaleDateString('en-IN', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'TBD'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {appointment.requestedStartTime} - {appointment.requestedEndTime || 'TBD'}
                      </span>
                    </div>
                  </div>
                  {appointment.purpose && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Purpose:</strong> {appointment.purpose}
                    </p>
                  )}
                  {appointment.studentNotes && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">Your Note:</p>
                      <p className="text-sm text-muted-foreground">{appointment.studentNotes}</p>
                    </div>
                  )}
                </CardContent>
                {appointment.status === AppointmentStatus.REQUESTED && (
                  <CardFooter className="flex justify-end border-t pt-4">
                    <Button
                      variant="outline"
                      onClick={() => handleCancel(appointment.id)}
                    >
                      Cancel
                    </Button>
                  </CardFooter>
                )}
                {appointment.status === AppointmentStatus.COMPLETED && !appointment.rating && (
                  <CardFooter className="flex justify-end gap-2 border-t pt-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Button
                        key={star}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRate(appointment.id, star)}
                      >
                        ★ {star}
                      </Button>
                    ))}
                  </CardFooter>
                )}
                {appointment.rating && (
                  <CardFooter className="border-t pt-4">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < appointment.rating! ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                      <span className="ml-2 text-sm text-muted-foreground">
                        Your rating
                      </span>
                    </div>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Past</h2>
          <div className="grid gap-4">
            {pastAppointments.map((appointment) => (
              <Card key={appointment.id} className="opacity-75">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{appointment.title}</CardTitle>
                      <CardDescription>
                        Dr. {appointment.faculty.firstName} {appointment.faculty.lastName}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(appointment.status) as any}>
                      {appointment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {appointment.requestedDate
                        ? new Date(appointment.requestedDate).toLocaleDateString('en-IN')
                        : ''}
                    </span>
                  </div>
                  {appointment.rating && (
                    <div className="flex items-center gap-1 mt-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < appointment.rating! ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                      <span className="ml-2 text-sm">{appointment.rating}/5</span>
                      {appointment.feedback && (
                        <p className="ml-2 text-sm text-muted-foreground">"{appointment.feedback}"</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
