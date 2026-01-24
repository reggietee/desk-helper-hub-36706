import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { VisitHistory } from "@/components/dashboard/VisitHistory";
import { CreditsHistory } from "@/components/dashboard/CreditsHistory";

interface ProfileSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  currentEmail: string;
  onNameUpdate: (newName: string) => void;
  defaultTab?: string;
}

export const ProfileSettings = ({ 
  open, 
  onOpenChange, 
  currentName, 
  currentEmail,
  onNameUpdate,
  defaultTab = "name"
}: ProfileSettingsProps) => {
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [visitRefreshKey, setVisitRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [creditEmailNotifications, setCreditEmailNotifications] = useState(true);
  const [notificationLoading, setNotificationLoading] = useState(false);

  // Update active tab when defaultTab changes or modal opens
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Fetch notification preference
        const { data: profile } = await supabase
          .from("profiles")
          .select("credit_email_notifications")
          .eq("id", user.id)
          .single();
        if (profile) {
          setCreditEmailNotifications(profile.credit_email_notifications ?? true);
        }
      }
    };
    getUser();
  }, []);

  const handleNotificationToggle = async (enabled: boolean) => {
    setNotificationLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ credit_email_notifications: enabled })
        .eq("id", userId);

      if (error) throw error;

      setCreditEmailNotifications(enabled);
      toast.success(enabled ? "Credit email notifications enabled" : "Credit email notifications disabled");
    } catch (error: any) {
      toast.error(error.message || "Failed to update notification preference");
    } finally {
      setNotificationLoading(false);
    }
  };

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


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>
            Update your profile information and account settings
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="name">Name</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="notifications">Alerts</TabsTrigger>
            <TabsTrigger value="visits">Visits</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
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

          <TabsContent value="notifications" className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="space-y-0.5">
                <Label htmlFor="credit-notifications" className="text-base font-medium">
                  Credit email notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive an email when you earn Haven Credits
                </p>
              </div>
              <Switch
                id="credit-notifications"
                checked={creditEmailNotifications}
                onCheckedChange={handleNotificationToggle}
                disabled={notificationLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="visits" className="space-y-4">
            {userId && <VisitHistory userId={userId} refreshKey={visitRefreshKey} />}
          </TabsContent>

          <TabsContent value="credits" className="space-y-4">
            {userId && <CreditsHistory userId={userId} refreshKey={visitRefreshKey} />}
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
