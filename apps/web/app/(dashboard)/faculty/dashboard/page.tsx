'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api-client';
import { useSocket } from '@/contexts/socket-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Clock,
  Calendar,
  Users,
  Bell,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { FacultyStatusLabels, FacultyStatusColors, type FacultyStatus } from '@campusconnect/shared/constants';

export default function FacultyDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { isConnected } = useSocket();

  const [status, setStatus] = useState<FacultyStatus>(user?.facultyProfile?.currentStatus || 'OFFLINE');
  const [statusMessage, setStatusMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    currentQueueLength: 0,
    unreadNotifications: 0,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'FACULTY') {
      router.push(`/dashboard/${user?.role?.toLowerCase().replace('_', '-')}`);
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.facultyProfile?.currentStatus) {
      setStatus(user.facultyProfile.currentStatus);
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [appointmentsRes, queueRes] = await Promise.all([
        api.get('/appointments', { startDate: today, endDate: today }),
        api.get(`/queue/${user?.id}`),
      ]);

      if (appointmentsRes.success) {
        setStats(prev => ({
          ...prev,
          todayAppointments: (appointmentsRes.data as any[])?.length || 0,
        }));
      }

      if (queueRes.success) {
        const queueData = queueRes.data as any;
        setStats(prev => ({
          ...prev,
          currentQueueLength: queueData?.queue?.length || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleStatusUpdate = async (newStatus: FacultyStatus, message: string = '') => {
    setIsUpdating(true);
    try {
      const response = await api.put('/faculty/status', {
        status: newStatus,
        message,
      });

      if (response.success) {
        setStatus(newStatus);
        if (message) setStatusMessage(message);
        toast.success(`Status updated to ${FacultyStatusLabels[newStatus]}`);
      } else {
        toast.error(response.error?.message || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Network error occurred');
    } finally {
      setIsUpdating(false);
    }
  };

  const quickStatusOptions: { status: FacultyStatus; label: string; icon: React.ReactNode; color: string }[] = [
    {
      status: 'FREE',
      label: 'Free',
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      status: 'IN_MEETING',
      label: 'In Meeting',
      icon: <Clock className="h-4 w-4" />,
      color: 'bg-amber-500 hover:bg-amber-600',
    },
    {
      status: 'IN_CLASS',
      label: 'In Class',
      icon: <Calendar className="h-4 w-4" />,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      status: 'DO_NOT_DISTURB',
      label: 'Do Not Disturb',
      icon: <XCircle className="h-4 w-4" />,
      color: 'bg-red-500 hover:bg-red-600',
    },
    {
      status: 'ON_LEAVE',
      label: 'On Leave',
      icon: <AlertCircle className="h-4 w-4" />,
      color: 'bg-gray-500 hover:bg-gray-600',
    },
  ];

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Faculty Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, Dr. {user.firstName} {user.lastName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Status Update */}
      <Card>
        <CardHeader>
          <CardTitle>Your Status</CardTitle>
          <CardDescription>Update your real-time availability status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {quickStatusOptions.map((option) => (
              <Button
                key={option.status}
                variant={status === option.status ? 'default' : 'outline'}
                className={`${status === option.status ? option.color : ''} text-white ${status !== option.status ? 'hover:bg-muted' : ''}`}
                onClick={() => handleStatusUpdate(option.status, '')}
                disabled={isUpdating}
              >
                {option.icon}
                <span className="ml-2">{option.label}</span>
              </Button>
            ))}
          </div>
          {statusMessage && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Message:</p>
              <p className="text-sm text-muted-foreground">{statusMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card onClick={() => router.push('/dashboard/faculty/appointments')} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
          </CardContent>
        </Card>

        <Card onClick={() => router.push('/dashboard/faculty/queue')} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Length</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentQueueLength}</div>
          </CardContent>
        </Card>

        <Card onClick={() => router.push('/dashboard/faculty/notifications')} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unreadNotifications}</div>
            <p className="text-xs text-muted-foreground">Unread</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/faculty/appointments')}>
            <Calendar className="mr-2 h-4 w-4" />
            View Appointments
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/faculty/queue')}>
            <Users className="mr-2 h-4 w-4" />
            Manage Queue
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/faculty/schedule')}>
            <Clock className="mr-2 h-4 w-4" />
            Edit Schedule
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/faculty/profile')}>
            <AlertCircle className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
