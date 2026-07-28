import { useGetMe } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, Home, MessageSquare, Users, Cpu, FileText, Menu, X, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLogout } from "@workspace/api-client-react";

export function Shell({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useGetMe();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logout = useLogout();

  // Auth Guard
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !user) {
    if (location !== "/") {
      setLocation("/");
    }
    return <>{children}</>;
  }

  if (location === "/") {
    setLocation("/dashboard");
    return null;
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/");
      }
    });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/chat", label: "Free-form Mode", icon: MessageSquare },
    { href: "/relationships", label: "Real Persons", icon: Users },
    { href: "/virtual", label: "Virtual Persons", icon: Cpu },
    { href: "/documents", label: "Documents", icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-in-out md:translate-x-0 md:static flex flex-col",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-14 flex items-center px-4 justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-primary rounded-sm flex items-center justify-center">
              <div className="h-3 w-3 border-2 border-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight text-lg uppercase">FrameWise</span>
          </div>
          <button className="md:hidden" onClick={() => setMobileMenuOpen(false)}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/dashboard");
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium cursor-pointer",
                    isActive 
                      ? "bg-accent text-accent-foreground" 
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 overflow-hidden">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full border border-sidebar-border" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                  {user.name?.charAt(0) || "U"}
                </div>
              )}
              <div className="truncate text-sm">
                <p className="font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground h-8" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between px-4 border-b border-border md:hidden bg-background">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-primary rounded-sm flex items-center justify-center">
              <div className="h-3 w-3 border-2 border-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight text-lg uppercase">FrameWise</span>
          </div>
          <button onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-5 w-5 text-foreground" />
          </button>
        </header>

        <main className="flex-1 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
