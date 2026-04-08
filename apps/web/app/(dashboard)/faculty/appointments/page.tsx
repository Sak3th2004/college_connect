'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useAppointmentStore } from '@/stores/appointment.store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Clock, User, AlertCircle } from 'lucide-react';
import { AppointmentStatus, FacultyStatus } from '@campusconnect/shared/constants';

export default function FacultyAppointmentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { appointments, isLoading, fetchAppointments, updateAppointmentStatus } = useAppointmentStore();

  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!user || user.role !== 'FACULTY') {
      router.push('/dashboard');
      return;
    }

    const params: Record<string, any> = {};
    if (filter !== 'all') {
      params.status = filter;
    }
    fetchAppointments(params);
  }, [user, filter, fetchAppointments, router]);

  const handleStatusUpdate = async (appointmentId: string, status: AppointmentStatus, reason?: string) => {
    const result = await updateAppointmentStatus(appointmentId, { status, rejectionReason: reason });
    if (result.success) {
      toast.success(`Appointment ${status.toLowerCase()}`);
    } else {
      toast.error(result.error || 'Failed to update appointment');
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
      default:
        return 'secondary';
    }
  };

  if (!user) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  const filteredAppointments = filter === 'all'
    ? appointments
    : appointments.filter((apt) => apt.status === filter);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">Manage student appointment requests</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Appointments</SelectItem>
            <SelectItem value={AppointmentStatus.REQUESTED}>Requested</SelectItem>
            <SelectItem value={AppointmentStatus.APPROVED}>Approved</SelectItem>
            <SelectItem value={AppointmentStatus.COMPLETED}>Completed</SelectItem>
            <SelectItem value={AppointmentStatus.REJECTED}>Rejected</SelectItem>
            <SelectItem value={AppointmentStatus.CANCELLED}>Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!isLoading && filteredAppointments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No appointments found</h3>
            <p className="text-muted-foreground">
              {filter === 'all'
                ? "You don't have any appointment requests yet."
                : `No ${filter.toLowerCase()} appointments.`}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {filteredAppointments.map((appointment) => (
          <Card key={appointment.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{appointment.title}</CardTitle>
                  <CardDescription>
                    From {appointment.student.firstName} {appointment.student.lastName}
                  </CardDescription>
                </div>
                <Badge variant={getStatusBadgeVariant(appointment.status) as any}>
                  {appointment.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {appointment.purpose && (
                <p className="text-sm text-muted-foreground">{appointment.purpose}</p>
              )}

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

              {appointment.studentNotes && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Student Note:</p>
                  <p className="text-sm text-muted-foreground">{appointment.studentNotes}</p>
                </div>
              )}

              {appointment.facultyNotes && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Your Note:</p>
                  <p className="text-sm text-muted-foreground">{appointment.facultyNotes}</p>
                </div>
              )}
            </CardContent>
            {appointment.status === AppointmentStatus.REQUESTED && (
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button
                  variant="destructive"
                  onClick={() => {
                    // Add rejection modal logic here
                    handleStatusUpdate(appointment.id, AppointmentStatus.REJECTED, 'Not available');
                  }}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => handleStatusUpdate(appointment.id, AppointmentStatus.APPROVED)}
                >
                  Approve
                </Button>
              </CardFooter>
            )}
            {appointment.status === AppointmentStatus.APPROVED && (
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleStatusUpdate(appointment.id, AppointmentStatus.CANCELLED, 'Cancelled by faculty')}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleStatusUpdate(appointment.id, AppointmentStatus.COMPLETED)}
                >
                  Mark Complete
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
