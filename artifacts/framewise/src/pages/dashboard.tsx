import { useGetDashboard } from "@workspace/api-client-react";
import { Users, Cpu, MessageSquare, ArrowRight, Activity } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export function Dashboard() {
  const { data: stats, isLoading } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg border border-border"></div>
          ))}
        </div>
        <div className="h-64 bg-muted rounded-lg border border-border mt-8"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Command Center</h1>
          <p className="text-muted-foreground text-sm">Overview of your strategic communication profiles and activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/chat">
            <Button className="font-mono text-xs uppercase" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              New Free-Form
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono uppercase tracking-wider text-xs">Real Persons</CardDescription>
            <CardTitle className="text-3xl font-light">{stats.totalPersons}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs mt-2 text-muted-foreground">
              <span>Active Profiles</span>
              <Link href="/relationships" className="text-primary hover:underline flex items-center">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono uppercase tracking-wider text-xs">Virtual Constructs</CardDescription>
            <CardTitle className="text-3xl font-light">{stats.totalVirtualPersons}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs mt-2 text-muted-foreground">
              <span>Simulated Personalities</span>
              <Link href="/virtual" className="text-primary hover:underline flex items-center">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50 shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono uppercase tracking-wider text-xs">Total Exchanges</CardDescription>
            <CardTitle className="text-3xl font-light">{stats.totalConversations}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs mt-2 text-muted-foreground">
              <span>Recorded Interactions</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            Recent Operations
          </h2>
        </div>

        {stats.recentConversations.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground">
            <p className="text-sm">No recent activity detected.</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card/30">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs font-mono uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Mode</th>
                  <th className="px-4 py-3 font-medium">Topic</th>
                  <th className="px-4 py-3 font-medium text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {stats.recentConversations.map((conv) => (
                  <tr key={conv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      {conv.mode === 'free' ? (
                        <span className="text-muted-foreground italic">Stateless</span>
                      ) : (
                        <Link 
                          href={conv.mode === 'real' ? `/relationships/${conv.personId}` : `/virtual/${conv.virtualPersonId}`}
                          className="hover:underline hover:text-primary transition-colors cursor-pointer"
                        >
                          {conv.personName || "Unknown"}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-border bg-background">
                        {conv.mode.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                      {conv.title || "Untitled Session"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground font-mono">
                      {formatDate(conv.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
