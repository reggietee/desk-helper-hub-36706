import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users } from 'lucide-react';
import { SprintFormModal } from './SprintFormModal';
import { SprintListItem } from './SprintListItem';
import { SprintParticipantsModal } from './SprintParticipantsModal';

interface Sprint {
  id: string;
  title: string;
  description: string | null;
  sprint_date: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  is_active: boolean;
  allow_guests: boolean;
  hosting_mode: 'haven' | 'google_meet' | 'daily';
  meeting_link: string | null;
  daily_room_url: string | null;
  daily_room_name: string | null;
  created_at: string;
  participant_count?: number;
}

export function SprintManagement() {
  const [loading, setLoading] = useState(true);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeTab, setActiveTab] = useState('active');
  
  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [selectedSprintParticipantCount, setSelectedSprintParticipantCount] = useState(0);

  useEffect(() => {
    fetchSprints();
  }, []);

  const fetchSprints = async () => {
    setLoading(true);
    
    // Fetch all sprints
    const { data: sprintsData, error } = await supabase
      .from('coworking_sprints')
      .select('*')
      .order('sprint_date', { ascending: true })
      .order('start_time', { ascending: true });
    
    if (error) {
      console.error('Error fetching sprints:', error);
      setLoading(false);
      return;
    }

    // Fetch participant counts for each sprint
    if (sprintsData && sprintsData.length > 0) {
      const sprintIds = sprintsData.map(s => s.id);
      const { data: participants } = await supabase
        .from('coworking_sprint_participants')
        .select('sprint_id')
        .in('sprint_id', sprintIds);

      const countMap: Record<string, number> = {};
      participants?.forEach(p => {
        countMap[p.sprint_id] = (countMap[p.sprint_id] || 0) + 1;
      });

      const sprintsWithCounts = sprintsData.map(s => ({
        ...s,
        participant_count: countMap[s.id] || 0,
      })) as Sprint[];

      setSprints(sprintsWithCounts);
    } else {
      setSprints([]);
    }
    
    setLoading(false);
  };

  const handleCreateNew = () => {
    setSelectedSprint(null);
    setSelectedSprintParticipantCount(0);
    setFormModalOpen(true);
  };

  const handleEdit = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setSelectedSprintParticipantCount(sprint.participant_count || 0);
    setFormModalOpen(true);
  };

  const handleViewParticipants = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setParticipantsModalOpen(true);
  };

  // Filter sprints by tab
  const now = new Date();
  
  const activeSprints = sprints.filter(s => {
    const sprintEnd = new Date(`${s.sprint_date}T${s.end_time}`);
    return s.is_active && sprintEnd >= now;
  });
  
  const draftSprints = sprints.filter(s => {
    const sprintEnd = new Date(`${s.sprint_date}T${s.end_time}`);
    return !s.is_active && sprintEnd >= now;
  });
  
  const closedSprints = sprints.filter(s => {
    const sprintEnd = new Date(`${s.sprint_date}T${s.end_time}`);
    return sprintEnd < now;
  }).reverse(); // Most recent first

  const renderSprintList = (list: Sprint[], emptyMessage: string) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {list.map(sprint => (
          <SprintListItem
            key={sprint.id}
            sprint={sprint}
            onEdit={handleEdit}
            onViewParticipants={handleViewParticipants}
            onRefresh={fetchSprints}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading sprints...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Co-Working Sprints
              </CardTitle>
              <CardDescription>
                Create and manage focused work sessions
              </CardDescription>
            </div>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create Sprint
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="active" className="gap-2">
                Active
                {activeSprints.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs">
                    {activeSprints.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="draft" className="gap-2">
                Draft
                {draftSprints.length > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {draftSprints.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="closed" className="gap-2">
                Closed
                {closedSprints.length > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {closedSprints.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {renderSprintList(activeSprints, "No active sprints. Create one and activate it to show on the dashboard.")}
            </TabsContent>
            
            <TabsContent value="draft">
              {renderSprintList(draftSprints, "No draft sprints. Create a new sprint to get started.")}
            </TabsContent>
            
            <TabsContent value="closed">
              {renderSprintList(closedSprints, "No past sprints yet.")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Form Modal */}
      <SprintFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        sprint={selectedSprint}
        onSaved={fetchSprints}
        existingParticipantCount={selectedSprintParticipantCount}
      />

      {/* Participants Modal */}
      <SprintParticipantsModal
        open={participantsModalOpen}
        onOpenChange={setParticipantsModalOpen}
        sprint={selectedSprint}
        onParticipantRemoved={fetchSprints}
      />
    </div>
  );
}
