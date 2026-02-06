import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Video, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type LivestreamStatus = 'draft' | 'scheduled' | 'live' | 'ended';

interface Livestream {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  status: LivestreamStatus;
  restream_rtmp_url: string | null;
  restream_stream_key: string | null;
  player_embed_html: string | null;
  player_url: string | null;
  replace_haven_updates: boolean;
  replay_url: string | null;
  created_at: string;
  updated_at: string;
}

interface LivestreamFormData {
  title: string;
  description: string;
  starts_at: string;
  status: LivestreamStatus;
  restream_rtmp_url: string;
  restream_stream_key: string;
  player_embed_html: string;
  player_url: string;
  replace_haven_updates: boolean;
  replay_url: string;
}

const defaultFormData: LivestreamFormData = {
  title: '',
  description: '',
  starts_at: '',
  status: 'draft',
  restream_rtmp_url: '',
  restream_stream_key: '',
  player_embed_html: '',
  player_url: '',
  replace_haven_updates: false,
  replay_url: '',
};

export function LivestreamManagement() {
  const [livestreams, setLivestreams] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LivestreamFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [showStreamKey, setShowStreamKey] = useState(false);

  useEffect(() => {
    fetchLivestreams();
  }, []);

  const fetchLivestreams = async () => {
    try {
      const { data, error } = await supabase
        .from('livestreams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLivestreams((data as Livestream[]) || []);
    } catch (error) {
      console.error('Error fetching livestreams:', error);
      toast.error('Failed to load livestreams');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setShowStreamKey(false);
    setDialogOpen(true);
  };

  const openEditDialog = (livestream: Livestream) => {
    setEditingId(livestream.id);
    setFormData({
      title: livestream.title,
      description: livestream.description || '',
      starts_at: livestream.starts_at ? new Date(livestream.starts_at).toISOString().slice(0, 16) : '',
      status: livestream.status,
      restream_rtmp_url: livestream.restream_rtmp_url || '',
      restream_stream_key: livestream.restream_stream_key || '',
      player_embed_html: livestream.player_embed_html || '',
      player_url: livestream.player_url || '',
      replace_haven_updates: livestream.replace_haven_updates,
      replay_url: livestream.replay_url || '',
    });
    setShowStreamKey(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        status: formData.status,
        restream_rtmp_url: formData.restream_rtmp_url.trim() || null,
        restream_stream_key: formData.restream_stream_key.trim() || null,
        player_embed_html: formData.player_embed_html.trim() || null,
        player_url: formData.player_url.trim() || null,
        replace_haven_updates: formData.replace_haven_updates,
        replay_url: formData.replay_url.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('livestreams')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Livestream updated');
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const { error } = await supabase
          .from('livestreams')
          .insert({ ...payload, created_by: session?.user?.id });
        if (error) throw error;
        toast.success('Livestream created');
      }

      setDialogOpen(false);
      fetchLivestreams();
    } catch (error) {
      console.error('Error saving livestream:', error);
      toast.error('Failed to save livestream');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from('livestreams')
        .delete()
        .eq('id', deletingId);
      if (error) throw error;
      toast.success('Livestream deleted');
      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchLivestreams();
    } catch (error) {
      console.error('Error deleting livestream:', error);
      toast.error('Failed to delete livestream');
    }
  };

  const getStatusBadge = (status: LivestreamStatus) => {
    const variants: Record<LivestreamStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      draft: { variant: 'outline', label: 'Draft' },
      scheduled: { variant: 'secondary', label: 'Scheduled' },
      live: { variant: 'destructive', label: '● Live' },
      ended: { variant: 'default', label: 'Ended' },
    };
    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading livestreams...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Livestreams</h3>
          <p className="text-sm text-muted-foreground">
            Manage member-only livestreams via Restream
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          New Livestream
        </Button>
      </div>

      {livestreams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No livestreams yet</p>
            <Button onClick={openCreateDialog} variant="outline" className="mt-4">
              Create your first livestream
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {livestreams.map((livestream) => (
            <Card key={livestream.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{livestream.title}</CardTitle>
                      {getStatusBadge(livestream.status)}
                      {livestream.replace_haven_updates && (
                        <Badge variant="outline" className="text-xs">
                          Replaces Updates
                        </Badge>
                      )}
                    </div>
                    {livestream.description && (
                      <CardDescription>{livestream.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(livestream)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeletingId(livestream.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {livestream.starts_at && (
                    <div>
                      <span className="text-muted-foreground">Starts:</span>{' '}
                      {new Date(livestream.starts_at).toLocaleString()}
                    </div>
                  )}
                  {livestream.restream_rtmp_url && (
                    <div>
                      <span className="text-muted-foreground">RTMP:</span>{' '}
                      <span className="font-mono text-xs truncate">{livestream.restream_rtmp_url}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Livestream' : 'New Livestream'}</DialogTitle>
            <DialogDescription>
              Configure your livestream settings and Restream integration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Member Town Hall"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Join us for our monthly community update..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="starts_at">Start Time</Label>
                  <Input
                    id="starts_at"
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: LivestreamStatus) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="ended">Ended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Restream Settings */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Restream Configuration</h4>
              
              <div className="space-y-2">
                <Label htmlFor="rtmp_url">RTMP Ingest URL</Label>
                <Input
                  id="rtmp_url"
                  value={formData.restream_rtmp_url}
                  onChange={(e) => setFormData({ ...formData, restream_rtmp_url: e.target.value })}
                  placeholder="rtmp://live.restream.io/live"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stream_key">Stream Key (Admin Only)</Label>
                <div className="relative">
                  <Input
                    id="stream_key"
                    type={showStreamKey ? 'text' : 'password'}
                    value={formData.restream_stream_key}
                    onChange={(e) => setFormData({ ...formData, restream_stream_key: e.target.value })}
                    placeholder="Your Restream stream key"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowStreamKey(!showStreamKey)}
                  >
                    {showStreamKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This is never shown to members or guests
                </p>
              </div>
            </div>

            {/* Player Settings */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Player Embed</h4>
              
              <div className="space-y-2">
                <Label htmlFor="player_embed">Embed HTML (iframe)</Label>
                <Textarea
                  id="player_embed"
                  value={formData.player_embed_html}
                  onChange={(e) => setFormData({ ...formData, player_embed_html: e.target.value })}
                  placeholder='<iframe src="https://player.restream.io/..." ...></iframe>'
                  rows={3}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="player_url">OR Player URL</Label>
                <Input
                  id="player_url"
                  value={formData.player_url}
                  onChange={(e) => setFormData({ ...formData, player_url: e.target.value })}
                  placeholder="https://player.restream.io/..."
                />
                <p className="text-xs text-muted-foreground">
                  If both are provided, embed HTML takes priority
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="replay_url">Replay URL (optional)</Label>
                <Input
                  id="replay_url"
                  value={formData.replay_url}
                  onChange={(e) => setFormData({ ...formData, replay_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </div>

            {/* Dashboard Behavior */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Dashboard Behavior</h4>
              
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="replace_updates"
                  checked={formData.replace_haven_updates}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, replace_haven_updates: checked === true })
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="replace_updates" className="cursor-pointer">
                    Live stream (replace Haven Updates on dashboard)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When checked, the livestream panel replaces Haven Updates during scheduled/live status. 
                    When unchecked, members access via /live page or Watch Live button.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Livestream'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Livestream?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The livestream will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
