import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Check, X, Ban, ChevronRight, Shield, User, UserMinus, Trash2 } from 'lucide-react';
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

type AppRole = 'admin' | 'member' | 'guest';

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
};

const ROLE_ICONS: Record<AppRole, React.ReactNode> = {
  admin: <Shield className="h-3 w-3" />,
  member: <User className="h-3 w-3" />,
  guest: <UserMinus className="h-3 w-3" />,
};

export function MemberManagement() {
  const [pendingMembers, setPendingMembers] = useState<Profile[]>([]);
  const [activeMembers, setActiveMembers] = useState<Profile[]>([]);
  const [inactiveMembers, setInactiveMembers] = useState<Profile[]>([]);
  const [memberRoles, setMemberRoles] = useState<Record<string, AppRole>>({});
  const [pendingRoleSelections, setPendingRoleSelections] = useState<Record<string, AppRole>>({});
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

      // Fetch all roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const rolesMap: Record<string, AppRole> = {};
      roles?.forEach(r => {
        rolesMap[r.user_id] = r.role as AppRole;
      });
      setMemberRoles(rolesMap);

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
    const selectedRole = pendingRoleSelections[userId] || 'member';
    
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

      // Set the role - first try to insert, if exists update
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: selectedRole,
        }, {
          onConflict: 'user_id,role'
        });

      // If upsert failed, try insert (might be first role)
      if (roleError) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: selectedRole,
          });
        
        if (insertError && !insertError.message.includes('duplicate')) {
          console.error('Error setting role:', insertError);
        }
      }

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

      toast.success(`${userName} has been approved as ${ROLE_LABELS[selectedRole]}`);
      setPendingRoleSelections(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
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

  const handleDelete = async (userId: string, userName: string) => {
    try {
      setActionLoading(userId);

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success(`${userName} has been permanently deleted`);
      await fetchMembers();
    } catch (error: any) {
      console.error('Error deleting member:', error);
      toast.error(error.message || 'Failed to delete member');
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadge = (userId: string) => {
    const role = memberRoles[userId];
    if (!role) return null;
    
    return (
      <Badge 
        variant={role === 'admin' ? 'default' : role === 'guest' ? 'secondary' : 'outline'}
        className="gap-1"
      >
        {ROLE_ICONS[role]}
        {ROLE_LABELS[role]}
      </Badge>
    );
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
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle>{member.full_name}</CardTitle>
                    <CardDescription>
                      {member.email}<br />
                      Signed up {format(new Date(member.created_at), 'MMM d, yyyy h:mm a')}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Role selection for pending */}
                    <Select
                      value={pendingRoleSelections[member.id] || 'member'}
                      onValueChange={(value: AppRole) => 
                        setPendingRoleSelections(prev => ({ ...prev, [member.id]: value }))
                      }
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Member
                          </div>
                        </SelectItem>
                        <SelectItem value="guest">
                          <div className="flex items-center gap-2">
                            <UserMinus className="h-4 w-4" />
                            Guest
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                    <div className="flex items-center gap-2">
                      <CardTitle>{member.full_name}</CardTitle>
                      {getRoleBadge(member.id)}
                    </div>
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
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-muted-foreground">{member.full_name}</CardTitle>
                      {getRoleBadge(member.id)}
                    </div>
                    <CardDescription>
                      {member.email}<br />
                      Deactivated {member.declined_at ? format(new Date(member.declined_at), 'MMM d, yyyy') : 'N/A'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Inactive</Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => e.stopPropagation()}
                          disabled={actionLoading === member.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User Permanently?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete <strong>{member.full_name}</strong> ({member.email}) and all their associated data including credits, schedules, and activity history. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(member.id, member.full_name)}
                          >
                            Delete Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
        onRoleChange={fetchMembers}
      />
    </Tabs>
  );
}
