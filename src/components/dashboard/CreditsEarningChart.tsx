import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const CREDITS_EARNING_DATA = [
  { task: "Check-in", guest: null, member: 5 },
  { task: "Weekly planning", guest: null, member: 10 },
  { task: "Event attendance (verified check-in)", guest: 30, member: 60 },
  { task: "Virtual sprint (45–60 min)", guest: 15, member: 30 },
  { task: "IRL sprint (45–60 min)", guest: null, member: 60 },
  { task: "Host a Haven event", guest: null, member: 300 },
] as const;

const CREDITS_REDEMPTION_DATA = [
  { task: "Day pass", guest: 30, member: 30 },
  { task: "Get a coffee ($5)", guest: null, member: 100 },
  { task: "Lunch on us ($10)", guest: null, member: 200 },
  { task: "Mentorship / accountability session", guest: null, member: 500 },
  { task: "Your own private desk for the month", guest: null, member: 1800 },
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

const CreditsTable = ({ data, firstColumnHeader }: { data: readonly { task: string; guest: number | null; member: number | null }[]; firstColumnHeader: string }) => (
  <div className="rounded-lg border overflow-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs font-semibold">{firstColumnHeader}</TableHead>
          <TableHead className="text-xs font-semibold text-center w-[80px]">Guest</TableHead>
          <TableHead className="text-xs font-semibold text-center w-[80px]">Member</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
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
);

export const CreditsEarningChart = () => (
  <div className="space-y-2">
    <h4 className="text-sm font-medium text-foreground">How to earn Haven Credits</h4>
    <p className="text-xs text-muted-foreground">You can earn credits by being a part of Haven. Members get extra credit opportunities. Event participation is manually added.</p>
    <CreditsTable data={CREDITS_EARNING_DATA} firstColumnHeader="Task" />
  </div>
);

export const CreditsRedemptionChart = () => (
  <div className="space-y-2">
    <h4 className="text-sm font-medium text-foreground">How to redeem Haven Credits</h4>
    <p className="text-xs text-muted-foreground">Looking to redeem credits? Reach out to the Haven team on Slack in the #support channel.</p>
    <CreditsTable data={CREDITS_REDEMPTION_DATA} firstColumnHeader="Redemption" />
  </div>
);
