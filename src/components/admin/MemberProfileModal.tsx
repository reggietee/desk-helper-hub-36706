import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2, User, Mail, MapPin, Coins, Plus, Minus } from 'lucide-react';

interface MemberProfile {
  id: string;
  full_name: string;
  email: string | null;
  status: string;
  created_at: string;
}

interface Visit {
  id: string;
  checked_in_at: string;
}

interface MemberProfileModalProps {
  member: MemberProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberProfileModal({ member, open, onOpenChange }: MemberProfileModalProps) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Adjustment form state
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentAction, setAdjustmentAction] = useState<'add' | 'subtract'>('add');
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member && open) {
      fetchMemberData();
    }
  }, [member, open]);

  const fetchMemberData = async () => {
    if (!member) return;
    
    setLoading(true);
    try {
      // Fetch visits count and recent visits
      const { count } = await supabase
        .from('member_visits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', member.id);

      setTotalVisits(count || 0);

      const { data: visitsData } = await supabase
        .from('member_visits')
        .select('id, checked_in_at')
        .eq('user_id', member.id)
        .order('checked_in_at', { ascending: false })
        .limit(10);

      setVisits(visitsData || []);

      // Fetch credits balance
      const { data: creditsData } = await supabase
        .from('haven_credits')
        .select('balance')
        .eq('user_id', member.id)
        .maybeSingle();

      setBalance(creditsData?.balance ?? 0);
    } catch (error) {
      console.error('Error fetching member data:', error);
      toast.error('Failed to load member data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustCredits = async () => {
    if (!member) return;
    
    const amount = parseInt(adjustmentAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-adjust-credits', {
        body: {
          targetUserId: member.id,
          amount,
          action: adjustmentAction,
          note: adjustmentNote.trim() || undefined,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setBalance(data.newBalance);
        setAdjustmentAmount('');
        setAdjustmentNote('');
        
        const actionLabel = adjustmentAction === 'add' ? 'Added' : 'Subtracted';
        toast.success(`${actionLabel} ${amount} © - New balance: ${data.newBalance} ©`);
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Error adjusting credits:', error);
      toast.error(error.message || 'Failed to adjust credits');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Active</Badge>;
      case 'declined':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Member Profile
          </DialogTitle>
          <DialogDescription>
            View and manage member details
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Identity Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{member.full_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{member.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {getStatusBadge(member.status)}
                </div>
              </CardContent>
            </Card>

            {/* Check-ins Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Haven Check-ins
                  </CardTitle>
                  <Badge variant="outline">{totalVisits} total</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {visits.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No check-ins recorded
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {visits.map((visit) => (
                      <div
                        key={visit.id}
                        className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                      >
                        <span className="text-sm">
                          {format(new Date(visit.checked_in_at), 'EEEE, MMMM d, yyyy')}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(visit.checked_in_at), 'h:mm a')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Credits Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Haven Credits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Balance */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-accent/10">
                  <span className="text-sm font-medium">Current Balance</span>
                  <span className="text-2xl font-bold text-primary">{balance} ©</span>
                </div>

                <Separator />

                {/* Adjustment Form */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Adjust Credits</Label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-xs text-muted-foreground">
                        Amount
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        min="1"
                        placeholder="0"
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="action" className="text-xs text-muted-foreground">
                        Action
                      </Label>
                      <Select
                        value={adjustmentAction}
                        onValueChange={(value: 'add' | 'subtract') => setAdjustmentAction(value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="action">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4 text-green-600" />
                              Add credits
                            </div>
                          </SelectItem>
                          <SelectItem value="subtract">
                            <div className="flex items-center gap-2">
                              <Minus className="h-4 w-4 text-red-600" />
                              Subtract credits
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="note" className="text-xs text-muted-foreground">
                      Note (optional)
                    </Label>
                    <Textarea
                      id="note"
                      placeholder="Reason for adjustment..."
                      value={adjustmentNote}
                      onChange={(e) => setAdjustmentNote(e.target.value)}
                      disabled={isSubmitting}
                      rows={2}
                    />
                  </div>

                  <Button
                    onClick={handleAdjustCredits}
                    disabled={isSubmitting || !adjustmentAmount}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adjusting...
                      </>
                    ) : (
                      <>
                        {adjustmentAction === 'add' ? (
                          <Plus className="mr-2 h-4 w-4" />
                        ) : (
                          <Minus className="mr-2 h-4 w-4" />
                        )}
                        {adjustmentAction === 'add' ? 'Add' : 'Subtract'} Credits
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
