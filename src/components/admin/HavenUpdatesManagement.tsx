import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Trash2, Upload, ExternalLink, ImageIcon } from 'lucide-react';
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

interface HavenUpdate {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  learn_more_url: string | null;
  is_active: boolean;
}

export function HavenUpdatesManagement() {
  const [update, setUpdate] = useState<HavenUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [learnMoreUrl, setLearnMoreUrl] = useState('');

  useEffect(() => {
    fetchUpdate();
  }, []);

  const fetchUpdate = async () => {
    setLoading(true);
    // Fetch the most recent update (admins can see all)
    const { data, error } = await supabase
      .from('haven_updates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setUpdate(data);
      setTitle(data.title);
      setDescription(data.description);
      setImageUrl(data.image_url || '');
      setLearnMoreUrl(data.learn_more_url || '');
    }
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `update-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('haven-updates')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Failed to upload image');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('haven-updates')
      .getPublicUrl(fileName);

    setImageUrl(urlData.publicUrl);
    setUploading(false);
    toast.success('Image uploaded');
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Not authenticated');
      setSaving(false);
      return;
    }

    const updateData = {
      title: title.trim(),
      description: description.trim(),
      image_url: imageUrl.trim() || null,
      learn_more_url: learnMoreUrl.trim() || null,
      is_active: true,
      created_by: session.user.id,
    };

    if (update) {
      // Update existing
      const { error } = await supabase
        .from('haven_updates')
        .update(updateData)
        .eq('id', update.id);

      if (error) {
        toast.error('Failed to update');
        setSaving(false);
        return;
      }
      toast.success('Update saved');
    } else {
      // Create new
      const { error } = await supabase
        .from('haven_updates')
        .insert(updateData);

      if (error) {
        toast.error('Failed to create update');
        setSaving(false);
        return;
      }
      toast.success('Update published');
    }

    await fetchUpdate();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!update) return;

    const { error } = await supabase
      .from('haven_updates')
      .delete()
      .eq('id', update.id);

    if (error) {
      toast.error('Failed to delete update');
      return;
    }

    setUpdate(null);
    setTitle('');
    setDescription('');
    setImageUrl('');
    setLearnMoreUrl('');
    toast.success('Update removed');
  };

  const removeImage = () => {
    setImageUrl('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter update title"
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter update description"
          rows={4}
          className="rounded-xl resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label>Image (optional)</Label>
        {imageUrl ? (
          <Card className="overflow-hidden">
            <CardContent className="p-0 relative">
              <img
                src={imageUrl}
                alt="Update preview"
                className="w-full h-48 object-cover"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 rounded-xl"
                onClick={removeImage}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
              disabled={uploading}
            />
            <label
              htmlFor="image-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload an image
                  </span>
                </>
              )}
            </label>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="learn-more">Learn More URL (optional)</Label>
        <Input
          id="learn-more"
          type="url"
          value={learnMoreUrl}
          onChange={(e) => setLearnMoreUrl(e.target.value)}
          placeholder="https://example.com"
          className="rounded-xl"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleSave}
          disabled={saving || !title.trim() || !description.trim()}
          className="rounded-xl gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {update ? 'Save Changes' : 'Publish Update'}
        </Button>

        {update && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="rounded-xl gap-2">
                <Trash2 className="h-4 w-4" />
                Remove Update
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Update?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the update from all member dashboards immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {update && (
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Current update is live and visible to all members.
          </p>
        </div>
      )}
    </div>
  );
}
