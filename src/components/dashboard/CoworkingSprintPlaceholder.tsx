import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Clock } from 'lucide-react';

/**
 * Privacy-safe placeholder for CoworkingSprintCard.
 * Shows the same structure but with "Member" placeholders instead of actual names.
 */
export function CoworkingSprintPlaceholder() {
  return (
    <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-accent" />
              Co-Working Sprint
            </CardTitle>
            <CardDescription className="text-sm">
              Join a focused work session with other members
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
            2 spots left
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date & Time */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Thursday, February 6
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            10:00 AM – 12:00 PM
          </div>
        </div>

        {/* Placeholder Participants */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Who's in:
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Member</Badge>
            <Badge variant="outline">Member</Badge>
          </div>
        </div>

        {/* Capacity indicator */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-accent transition-all duration-300"
            style={{ width: '50%' }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          2 of 4 spots filled
        </p>

        {/* Disabled Button */}
        <Button className="w-full" disabled>
          <Users className="mr-2 h-4 w-4" />
          I'm In!
        </Button>
      </CardContent>
    </Card>
  );
}
