import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProfileSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  currentEmail: string;
  onNameUpdate: (newName: string) => void;
}

export const ProfileSettings = ({ 
  open, 
  onOpenChange, 
  currentName, 
  currentEmail,
  onNameUpdate 
}: ProfileSettingsProps) => {
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNameUpdate = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name.trim() })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Name updated successfully");
      onNameUpdate(name.trim());
    } catch (error: any) {
      toast.error(error.message || "Failed to update name");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;

      toast.success("Email update requested. Please check your new email for confirmation.");
    } catch (error: any) {
      toast.error(error.message || "Failed to update email");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      // First verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("User email not found");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) throw new Error("Current password is incorrect");

      // Update password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>
            Update your profile information and account settings
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="name" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="name">Name</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>

          <TabsContent value="name" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <Button 
              onClick={handleNameUpdate} 
              disabled={loading || name === currentName}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Name
            </Button>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
              <p className="text-xs text-muted-foreground">
                You'll receive a confirmation email at your new address
              </p>
            </div>
            <Button 
              onClick={handleEmailUpdate} 
              disabled={loading || email === currentEmail}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Email
            </Button>
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <Button 
              onClick={handlePasswordUpdate} 
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
