import { Search } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
        <Search className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Sector Not Found</h1>
      <p className="text-muted-foreground max-w-md">
        The destination you are trying to access does not exist or has been redacted.
      </p>
      <Link href="/dashboard">
        <Button variant="outline" className="mt-4 font-mono uppercase text-xs">
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
