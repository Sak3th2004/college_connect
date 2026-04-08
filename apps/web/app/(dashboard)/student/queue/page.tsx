'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useFacultyStore } from '@/stores/faculty.store';
import { useQueueStore } from '@/stores/queue.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Users, Clock, Bell, Search } from 'lucide-react';
import { TokenStatus, FacultyStatusLabels, FacultyStatusColors } from '@campusconnect/shared/constants';

export default function StudentQueuePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { facultyList, fetchFaculty } = useFacultyStore();
  const { queue, currentToken, joinQueue, leaveQueue, fetchQueue, clearQueue } = useQueueStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [filteredFaculty, setFilteredFaculty] = useState<any[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'STUDENT') {
      router.push('/dashboard');
      return;
    }

    fetchFaculty().then(() => {
      setFilteredFaculty(
        facultyList.filter((f) =>
          f.facultyProfile?.currentStatus !== 'OFFLINE' &&
          f.facultyProfile?.isAcceptingAppointments
        )
      );
    });
  }, [user, router, fetchFaculty, facultyList]);

  useEffect(() => {
    if (selectedFaculty) {
      fetchQueue(selectedFaculty);
    } else {
      clearQueue();
    }
  }, [selectedFaculty, fetchQueue, clearQueue]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredFaculty(
      facultyList.filter(
        (f) =>
          f.facultyProfile?.currentStatus !== 'OFFLINE' &&
          f.facultyProfile?.isAcceptingAppointments &&
          `${f.firstName} ${f.lastName}`.toLowerCase().includes(query)
      )
    );
  };

  const handleJoinQueue = async (facultyId: string) => {
    const result = await joinQueue(facultyId, 'General inquiry');
    if (result.success) {
      toast.success('Joined queue successfully!');
      setSelectedFaculty(facultyId);
    } else {
      toast.error(result.error || 'Failed to join queue');
    }
  };

  const handleLeaveQueue = async (tokenId: string) => {
    const result = await leaveQueue(tokenId);
    if (result.success) {
      toast.success('Left queue');
      if (selectedFaculty) {
        fetchQueue(selectedFaculty);
      }
    } else {
      toast.error(result.error || 'Failed to leave queue');
    }
  };

  const getQueuePosition = () => {
    if (!currentToken || currentToken.status !== TokenStatus.WAITING) return null;

    const positionInQueue = queue.findIndex((t) => t.id === currentToken.id) + 1;
    const estimatedWait = positionInQueue * 15; // Assuming ~15 min per token

    return { position: positionInQueue, waitMinutes: estimatedWait };
  };

  if (!user) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  const queueInfo = getQueuePosition();

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Virtual Queue</h1>
          <p className="text-muted-foreground">Join a queue and wait for your turn digitally</p>
        </div>
      </div>

      {/* My Queue Status */}
      {currentToken && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Your Queue Status
            </CardTitle>
            <CardDescription>You are currently in the queue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Token Number</p>
                <p className="text-2xl font-bold text-primary">{currentToken.tokenDisplay}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Position</p>
                <p className="text-2xl font-bold">{queueInfo?.position || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Est. Wait Time</p>
                <p className="text-2xl font-bold">{queueInfo?.waitMinutes || '—'} min</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Status: <Badge variant="secondary">{currentToken.status}</Badge>
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="destructive" onClick={() => handleLeaveQueue(currentToken.id)}>
              Leave Queue
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Faculty List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold">Available Faculty</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search faculty..."
              className="pl-8"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        {facultyList.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No faculty available</h3>
              <p className="text-muted-foreground">
                Check back later for available faculty members.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFaculty.map((faculty) => (
              <Card
                key={faculty.id}
                className={
                  selectedFaculty === faculty.id ? 'ring-2 ring-primary' : ''
                }
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-base">
                        Dr. {faculty.firstName} {faculty.lastName}
                      </CardTitle>
                      <CardDescription>
                        {faculty.facultyProfile?.designation}
                      </CardDescription>
                      {faculty.department && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {faculty.department.name}
                        </p>
                      )}
                    </div>
                    <Badge
                      style={{
                        backgroundColor: FacultyStatusColors[faculty.facultyProfile?.currentStatus as keyof typeof FacultyStatusColors] || '#6b7280',
                      }}
                      className="text-white"
                    >
                      {FacultyStatusLabels[faculty.facultyProfile?.currentStatus as keyof typeof FacultyStatusLabels]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-3 space-y-2">
                  {faculty.facultyProfile?.specialization && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {faculty.facultyProfile.specialization}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Max daily: {faculty.facultyProfile?.maxDailyAppointments}</span>
                    <span>Slot: {faculty.facultyProfile?.appointmentSlotDuration}min</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-3 border-t">
                  {selectedFaculty === faculty.id ? (
                    <Button variant="outline" className="w-full" onClick={() => setSelectedFaculty(null)}>
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => setSelectedFaculty(faculty.id)}
                      disabled={
                        faculty.facultyProfile?.currentStatus === 'OFFLINE' ||
                        !faculty.facultyProfile?.isAcceptingAppointments
                      }
                    >
                      Join Queue
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Confirm Join Dialog */}
        {selectedFaculty && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Confirm Queue Joining</CardTitle>
              <CardDescription>
                You are about to join the queue for{' '}
                {facultyList.find((f) => f.id === selectedFaculty) &&
                  `Dr. ${facultyList.find((f) => f.id === selectedFaculty)?.firstName} ${facultyList.find((f) => f.id === selectedFaculty)?.lastName}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You will receive a notification when your token is about to be called.
                Make sure you are available in the waiting area.
              </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedFaculty(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleJoinQueue(selectedFaculty)}>
                Confirm Join
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
