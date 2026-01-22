import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Check, X, Ban, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MemberProfileModal } from './MemberProfileModal';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  status: string;
  approved_at: string | null;
  declined_at: string | null;
}

export function MemberManagement() {
  const [pendingMembers, setPendingMembers] = useState<Profile[]>([]);
  const [activeMembers, setActiveMembers] = useState<Profile[]>([]);
  const [inactiveMembers, setInactiveMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);

      // Fetch all profiles with email
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Separate by status
      setPendingMembers((profiles || []).filter(p => p.status === 'pending'));
      setActiveMembers((profiles || []).filter(p => p.status === 'approved'));
      setInactiveMembers((profiles || []).filter(p => p.status === 'declined'));
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string, userName: string, userEmail: string) => {
    try {
      setActionLoading(userId);

      // Update profile status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Send approval notification via edge function
      const { error: notifyError } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'member_approved',
          data: {
            user_name: userName,
            email: userEmail,
          },
        },
      });

      if (notifyError) {
        console.error('Failed to send approval email:', notifyError);
      }

      toast.success(`${userName} has been approved`);
      await fetchMembers();
    } catch (error: any) {
      console.error('Error approving member:', error);
      toast.error('Failed to approve member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleIgnore = async (userId: string, userName: string) => {
    try {
      setActionLoading(userId);

      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`${userName} has been ignored`);
      await fetchMembers();
    } catch (error: any) {
      console.error('Error ignoring member:', error);
      toast.error('Failed to ignore member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (userId: string, userName: string) => {
    try {
      setActionLoading(userId);

      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`${userName} has been deactivated`);
      await fetchMembers();
    } catch (error: any) {
      console.error('Error deactivating member:', error);
      toast.error('Failed to deactivate member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenProfile = (member: Profile) => {
    setSelectedMember(member);
    setProfileModalOpen(true);
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Loading members...
      </div>
    );
  }

  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="pending">
          Pending
          {pendingMembers.length > 0 && (
            <Badge variant="secondary" className="ml-2">{pendingMembers.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="active">
          Active
          <Badge variant="secondary" className="ml-2">{activeMembers.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="inactive">
          Inactive
          <Badge variant="secondary" className="ml-2">{inactiveMembers.length}</Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="space-y-4 mt-6">
        {pendingMembers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No pending members
            </CardContent>
          </Card>
        ) : (
          pendingMembers.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{member.full_name}</CardTitle>
                    <CardDescription>
                      {member.email}<br />
                      Signed up {format(new Date(member.created_at), 'MMM d, yyyy h:mm a')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(member.id, member.full_name, member.email)}
                      disabled={actionLoading === member.id}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleIgnore(member.id, member.full_name)}
                      disabled={actionLoading === member.id}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Ignore
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="active" className="space-y-4 mt-6">
        {activeMembers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No active members
            </CardContent>
          </Card>
        ) : (
          activeMembers.map((member) => (
            <Card 
              key={member.id} 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleOpenProfile(member)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle>{member.full_name}</CardTitle>
                    <CardDescription>
                      {member.email}<br />
                      Approved {member.approved_at ? format(new Date(member.approved_at), 'MMM d, yyyy') : 'N/A'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeactivate(member.id, member.full_name);
                      }}
                      disabled={actionLoading === member.id}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Deactivate
                    </Button>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="inactive" className="space-y-4 mt-6">
        {inactiveMembers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No inactive members
            </CardContent>
          </Card>
        ) : (
          inactiveMembers.map((member) => (
            <Card 
              key={member.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleOpenProfile(member)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-muted-foreground">{member.full_name}</CardTitle>
                    <CardDescription>
                      {member.email}<br />
                      Deactivated {member.declined_at ? format(new Date(member.declined_at), 'MMM d, yyyy') : 'N/A'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Inactive</Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </TabsContent>

      <MemberProfileModal
        member={selectedMember}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />
    </Tabs>
  );
}
