import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface TestResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipient?: string;
  subject?: string;
  sentAt?: string;
  reportDate?: string;
  membersIncluded?: number;
  filename?: string;
}

export function EmailTools() {
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<TestResult | null>(null);

  const [testingSignupNotification, setTestingSignupNotification] = useState(false);
  const [signupNotificationResult, setSignupNotificationResult] = useState<TestResult | null>(null);

  const handleSendTestEmail = async () => {
    setTestingEmail(true);
    setTestResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue");
        return;
      }

      const response = await supabase.functions.invoke("send-test-email", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send test email");
      }

      const data = response.data;
      setTestResult(data);

      if (data.success) {
        toast.success("Test email sent successfully!", {
          description: `Message ID: ${data.messageId}`
        });
      } else {
        toast.error("Test email failed", {
          description: data.error || "Unknown error"
        });
      }
    } catch (error: any) {
      console.error("Test email error:", error);
      setTestResult({
        success: false,
        error: error.message || "Unknown error"
      });
      toast.error("Failed to send test email", {
        description: error.message
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReportResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue");
        return;
      }

      const response = await supabase.functions.invoke("send-daily-credits-report", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          isManualTrigger: true,
          forceResend: true,
          userId: session.user.id
        }
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate report");
      }

      const data = response.data;
      setReportResult(data);

      if (data.success) {
        if (data.alreadySent) {
          toast.info("Report already sent today", {
            description: `Report for ${data.reportDate} was already sent.`
          });
        } else {
          toast.success("Daily report sent successfully!", {
            description: `${data.membersIncluded} members included. Message ID: ${data.messageId}`
          });
        }
      } else {
        toast.error("Report generation failed", {
          description: data.error || "Unknown error"
        });
      }
    } catch (error: any) {
      console.error("Report generation error:", error);
      setReportResult({
        success: false,
        error: error.message || "Unknown error"
      });
      toast.error("Failed to generate report", {
        description: error.message
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleTestSignupNotification = async () => {
    setTestingSignupNotification(true);
    setSignupNotificationResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue");
        return;
      }

      const response = await supabase.functions.invoke("send-admin-notification-test", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send test notification");
      }

      const data = response.data;
      setSignupNotificationResult(data);

      if (data.success) {
        toast.success("Test signup notification sent!", {
          description: `Message ID: ${data.messageId}`
        });
      } else {
        toast.error("Test notification failed", {
          description: data.error || "Unknown error"
        });
      }
    } catch (error: any) {
      console.error("Test signup notification error:", error);
      setSignupNotificationResult({
        success: false,
        error: error.message || "Unknown error"
      });
      toast.error("Failed to send test notification", {
        description: error.message
      });
    } finally {
      setTestingSignupNotification(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Tools
        </CardTitle>
        <CardDescription>
          Test email delivery and manually trigger the daily credits report
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Credit Email */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Send Test Credit Email</h4>
              <p className="text-sm text-muted-foreground">
                Sends a test email to reggie@storymode.co to verify email delivery
              </p>
            </div>
            <Button
              onClick={handleSendTestEmail}
              disabled={testingEmail}
              size="sm"
            >
              {testingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Test Email
                </>
              )}
            </Button>
          </div>

          {testResult && (
            <div className={`p-3 rounded-lg border ${
              testResult.success 
                ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1 text-sm">
                  <p className={`font-medium ${testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                    {testResult.success ? 'Email sent successfully!' : 'Email failed to send'}
                  </p>
                  {testResult.success ? (
                    <div className="mt-1 text-green-700 dark:text-green-300 space-y-1">
                      <p><strong>Message ID:</strong> {testResult.messageId}</p>
                      <p><strong>Recipient:</strong> {testResult.recipient}</p>
                      <p><strong>Sent at:</strong> {testResult.sentAt}</p>
                    </div>
                  ) : (
                    <p className="mt-1 text-red-700 dark:text-red-300">
                      <strong>Error:</strong> {testResult.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <hr className="border-border" />

        {/* Test Signup Notification */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Test Signup Notification</h4>
              <p className="text-sm text-muted-foreground">
                Sends a test "new member signup" notification to verify the admin alert system
              </p>
            </div>
            <Button
              onClick={handleTestSignupNotification}
              disabled={testingSignupNotification}
              size="sm"
              variant="outline"
            >
              {testingSignupNotification ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Test Signup Alert
                </>
              )}
            </Button>
          </div>

          {signupNotificationResult && (
            <div className={`p-3 rounded-lg border ${
              signupNotificationResult.success 
                ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-2">
                {signupNotificationResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1 text-sm">
                  <p className={`font-medium ${signupNotificationResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                    {signupNotificationResult.success ? 'Test notification sent!' : 'Test notification failed'}
                  </p>
                  {signupNotificationResult.success ? (
                    <div className="mt-1 text-green-700 dark:text-green-300 space-y-1">
                      <p><strong>Message ID:</strong> {signupNotificationResult.messageId}</p>
                      <p><strong>Recipient:</strong> {signupNotificationResult.recipient}</p>
                      <p><strong>Sent at:</strong> {signupNotificationResult.sentAt}</p>
                    </div>
                  ) : (
                    <p className="mt-1 text-red-700 dark:text-red-300">
                      <strong>Error:</strong> {signupNotificationResult.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <hr className="border-border" />

        {/* Daily Credits Report */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Generate & Send Daily Report</h4>
              <p className="text-sm text-muted-foreground">
                Immediately generates and emails the daily credits report (Excel)
              </p>
            </div>
            <Button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              size="sm"
              variant="secondary"
            >
              {generatingReport ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>

          {reportResult && (
            <div className={`p-3 rounded-lg border ${
              reportResult.success 
                ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-2">
                {reportResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1 text-sm">
                  <p className={`font-medium ${reportResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                    {reportResult.success 
                      ? (reportResult.messageId ? 'Report sent successfully!' : 'Report already sent today')
                      : 'Report failed to generate/send'}
                  </p>
                  {reportResult.success ? (
                    <div className="mt-1 text-green-700 dark:text-green-300 space-y-1">
                      {reportResult.messageId && (
                        <p><strong>Message ID:</strong> {reportResult.messageId}</p>
                      )}
                      <p><strong>Report Date:</strong> {reportResult.reportDate}</p>
                      {reportResult.membersIncluded !== undefined && (
                        <p><strong>Members Included:</strong> {reportResult.membersIncluded}</p>
                      )}
                      {reportResult.filename && (
                        <p><strong>Filename:</strong> {reportResult.filename}</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-red-700 dark:text-red-300">
                      <strong>Error:</strong> {reportResult.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Emails are sent via Resend using the configured API key. Check the edge function logs for detailed delivery information.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
