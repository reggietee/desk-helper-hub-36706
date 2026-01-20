import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Wifi, Save } from "lucide-react";
import { format } from "date-fns";

export const CheckInSettings = () => {
  const [allowedIp, setAllowedIp] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("haven_settings")
        .select("setting_value, updated_at")
        .eq("setting_key", "allowed_ip")
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setAllowedIp(data.setting_value || "");
        setLastUpdated(data.updated_at);
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("haven_settings")
        .update({ 
          setting_value: allowedIp.trim() || null,
          updated_by: user.id
        })
        .eq("setting_key", "allowed_ip");

      if (error) throw error;

      setLastUpdated(new Date().toISOString());
      toast.success("Allowed IP saved successfully");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wifi className="h-5 w-5 text-primary" />
          <CardTitle>On-Site Check In</CardTitle>
        </div>
        <CardDescription>
          Configure the public IP address for Haven Wi-Fi. Members connected to this IP will see a check-in banner.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="allowed-ip">Haven Allowed Public IP</Label>
          <div className="flex gap-2">
            <Input
              id="allowed-ip"
              type="text"
              placeholder="e.g., 99.123.45.67"
              value={allowedIp}
              onChange={(e) => setAllowedIp(e.target.value)}
              className="max-w-xs font-mono"
            />
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="ml-2">Save</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter the public IP address of Haven's network. Only members connected from this IP can check in.
          </p>
        </div>

        {lastUpdated && (
          <p className="text-sm text-muted-foreground">
            Last updated: {format(new Date(lastUpdated), "MMM d, yyyy 'at' h:mm a")}
          </p>
        )}

        {!allowedIp && (
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              ⚠️ No IP configured. The check-in banner will not appear for any members until an IP is set.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
