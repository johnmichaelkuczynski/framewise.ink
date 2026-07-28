import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Login() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      </div>
      
      <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
        <div className="mb-8 flex flex-col items-center">
          <div className="h-16 w-16 bg-white rounded-sm flex items-center justify-center mb-6 rotate-45 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
            <div className="h-8 w-8 border-4 border-black -rotate-45" />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter uppercase font-mono mb-2">FrameWise</h1>
          <p className="text-muted-foreground text-center text-sm font-mono uppercase tracking-widest">
            Precision Communication Protocol
          </p>
        </div>

        <div className="w-full bg-[#0a0a0a] border border-[#1f1f1f] p-8 rounded-lg shadow-2xl backdrop-blur-sm relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-50"></div>
          
          <div className="flex flex-col gap-6">
            <div className="space-y-2 text-center">
              <h2 className="text-lg font-medium text-gray-200">Authorized Access Only</h2>
              <p className="text-xs text-gray-500 font-mono">Authenticate to access your active profiles and coaching tools.</p>
            </div>

            <Button 
              className="w-full h-12 text-sm font-mono font-bold uppercase tracking-wider bg-white text-black hover:bg-gray-200 transition-all rounded-sm flex items-center justify-center gap-3"
              onClick={() => {
                window.location.href = '/api/auth/google';
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign In with Google
            </Button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-600 font-mono mt-4">
              <Shield className="h-3 w-3" />
              <span>Secure End-to-End Encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
