import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const CREDITS_EARNING_DATA = [
  { task: "Check-in", guest: null, member: 5 },
  { task: "Weekly planning", guest: null, member: 10 },
  { task: "Event attendance (verified check-in)", guest: 30, member: 60 },
  { task: "Virtual sprint (45–60 min)", guest: 15, member: 30 },
  { task: "IRL sprint (45–60 min)", guest: null, member: 60 },
  { task: "New Member Quest (5-step wizard completion)", guest: null, member: 100 },
] as const;

const CreditValue = ({ value }: { value: number | null }) => {
  if (value === null) {
    return <span className="text-muted-foreground">❌</span>;
  }
  return (
    <span className="text-foreground whitespace-nowrap">
      ✅ {value} ©
    </span>
  );
};

export const CreditsEarningChart = () => {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="earning-chart" className="border rounded-lg px-3">
        <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
          <div className="text-left">
            <span>How to earn</span>
            <span className="block text-xs font-normal text-muted-foreground">See the earning chart (Guest vs Member)</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-semibold">Task</TableHead>
                  <TableHead className="text-xs font-semibold text-center w-[80px]">Guest</TableHead>
                  <TableHead className="text-xs font-semibold text-center w-[80px]">Member</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CREDITS_EARNING_DATA.map((row) => (
                  <TableRow key={row.task}>
                    <TableCell className="text-xs py-2">{row.task}</TableCell>
                    <TableCell className="text-xs text-center py-2">
                      <CreditValue value={row.guest} />
                    </TableCell>
                    <TableCell className="text-xs text-center py-2">
                      <CreditValue value={row.member} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
