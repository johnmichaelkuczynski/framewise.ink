import {
  useGetVirtualPersonProfile, useUpdateVirtualPersonProfile,
  useListVirtualPersons, useCreateVirtualPerson, useGetVirtualPerson,
  useListConversations, useCreateConversation,
  useDeleteVirtualPerson, useDeleteConversation,
  getGetVirtualPersonProfileQueryKey, getGetVirtualPersonQueryKey, getListVirtualPersonsQueryKey, getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Plus, Trash2, MessageSquare, Cpu, ChevronRight, FileText, Camera, ScanLine } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Chat } from "@/pages/chat";
import { uploadVirtualPersonPhoto, type PhotoAnalysis } from "@/lib/api";

const profileSchema = z.object({
  genderPatterns: z.string().optional(),
  cognitiveLevel: z.string().optional(),
  emotionalProfile: z.string().optional(),
  affirmationLevers: z.string().optional(),
  pressureLevers: z.string().optional(),
  optimizationRoadmap: z.string().optional(),
  whatWorked: z.string().optional(),
  whatFailed: z.string().optional(),
  sayThis: z.string().optional(),
  neverSayThis: z.string().optional(),
});

export function VirtualPersonProfile({ id }: { id: number }) {
  const { data: profile, isLoading } = useGetVirtualPersonProfile(id);
  const { data: person } = useGetVirtualPerson(id, { query: { enabled: !!id, queryKey: getGetVirtualPersonQueryKey(id) } });
  const updateProfile = useUpdateVirtualPersonProfile();
  const queryClient = useQueryClient();
  const initRef = useRef<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysis | null>(null);

  useEffect(() => {
    if (person?.photoUrl) setPhotoUrl(person.photoUrl);
  }, [person?.photoUrl]);

  const handlePhotoUpload = async (file: File) => {
    setIsUploadingPhoto(true);
    try {
      const result = await uploadVirtualPersonPhoto(id, file);
      setPhotoUrl(result.photoUrl);
      setPhotoAnalysis(result.analysis);
      queryClient.invalidateQueries({ queryKey: getGetVirtualPersonQueryKey(id) });
    } catch {
      // silent fail
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      genderPatterns: "",
      cognitiveLevel: "",
      emotionalProfile: "",
      affirmationLevers: "",
      pressureLevers: "",
      optimizationRoadmap: "",
      whatWorked: "",
      whatFailed: "",
      sayThis: "",
      neverSayThis: "",
    }
  });

  useEffect(() => {
    if (profile && initRef.current !== id) {
      initRef.current = id;
      form.reset({
        genderPatterns: profile.genderPatterns || "",
        cognitiveLevel: profile.cognitiveLevel || "",
        emotionalProfile: profile.emotionalProfile || "",
        affirmationLevers: profile.affirmationLevers || "",
        pressureLevers: profile.pressureLevers || "",
        optimizationRoadmap: profile.optimizationRoadmap || "",
        whatWorked: profile.whatWorked?.join("\n") || "",
        whatFailed: profile.whatFailed?.join("\n") || "",
        sayThis: profile.sayThis?.join("\n") || "",
        neverSayThis: profile.neverSayThis?.join("\n") || "",
      });
    }
  }, [profile, id, form]);

  const onSubmit = (data: z.infer<typeof profileSchema>) => {
    const payload = {
      ...data,
      whatWorked: data.whatWorked?.split("\n").filter(x => x.trim()) || [],
      whatFailed: data.whatFailed?.split("\n").filter(x => x.trim()) || [],
      sayThis: data.sayThis?.split("\n").filter(x => x.trim()) || [],
      neverSayThis: data.neverSayThis?.split("\n").filter(x => x.trim()) || [],
    };

    updateProfile.mutate({ id, data: payload }, {
      onSuccess: (newProfile) => {
        queryClient.setQueryData(getGetVirtualPersonProfileQueryKey(id), newProfile);
      }
    });
  };

  if (isLoading) return <div className="p-8 animate-pulse bg-muted min-h-screen"></div>;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/virtual/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:text-primary hover:bg-primary/10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">System Parameters</h1>
          <p className="text-primary/60 text-sm font-mono uppercase">Construct: {person?.name ?? `ID ${id}`}</p>
        </div>
      </div>

      {/* Photo upload + Vision analysis */}
      <Card className="shadow-none border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = ""; }} />
          <div className="flex items-start gap-5">
            <div className="relative flex-shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt="Construct" className="h-20 w-20 rounded-lg object-cover border border-primary/30" />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-primary/10 border border-dashed border-primary/30 flex items-center justify-center">
                  <Cpu className="h-8 w-8 text-primary/20" />
                </div>
              )}
              <button
                onClick={() => photoInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow hover:bg-primary/80 transition-colors"
                title="Upload reference image" data-testid="button-upload-photo"
              >
                {isUploadingPhoto ? <span className="h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="flex-1 min-w-0">
              {photoAnalysis ? (
                <div className="space-y-2">
                  <p className="text-xs font-mono uppercase text-primary/60 flex items-center gap-1.5"><ScanLine className="h-3.5 w-3.5 text-primary" /> Vision Scan</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    {photoAnalysis.emotionalTone && <div><span className="text-primary/50">Emotional tone: </span><span className="text-primary">{photoAnalysis.emotionalTone}</span></div>}
                    {photoAnalysis.confidenceLevel && <div><span className="text-primary/50">Confidence: </span><span className="text-primary">{photoAnalysis.confidenceLevel}</span></div>}
                    {photoAnalysis.formalitySignals && <div><span className="text-primary/50">Presentation: </span><span className="text-primary">{photoAnalysis.formalitySignals}</span></div>}
                    {photoAnalysis.appearance && <div><span className="text-primary/50">Appearance: </span><span className="text-primary">{photoAnalysis.appearance}</span></div>}
                    {photoAnalysis.communicationCues && <div className="col-span-2"><span className="text-primary/50">Cues: </span><span className="text-primary">{photoAnalysis.communicationCues}</span></div>}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-primary mb-1">Reference Image</p>
                  <p className="text-xs text-primary/50">Upload a reference image for {person?.name ?? "this construct"} — Vision AI will scan their emotional signature, confidence profile, and extract communication cues to pre-populate system parameters.</p>
                  {isUploadingPhoto && <p className="text-xs text-primary mt-2 animate-pulse font-mono">Scanning image...</p>}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-none border-primary/20 bg-primary/5">
              <CardHeader className="py-4 border-b border-primary/10">
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-primary/70">Core Logic</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <FormField control={form.control} name="cognitiveLevel" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs text-primary/80">Cognitive Framework</FormLabel>
                  <FormControl><Input {...field} className="font-mono text-sm h-8 border-primary/20 bg-background" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="emotionalProfile" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs text-primary/80">Emotional Subroutine</FormLabel>
                  <FormControl><Input {...field} className="font-mono text-sm h-8 border-primary/20 bg-background" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="genderPatterns" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs text-primary/80">Social Processing</FormLabel>
                  <FormControl><Input {...field} className="font-mono text-sm h-8 border-primary/20 bg-background" /></FormControl></FormItem>
                )} />
              </CardContent>
            </Card>

            <Card className="shadow-none border-primary/20 bg-primary/5">
              <CardHeader className="py-4 border-b border-primary/10">
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-primary/70">Exploit Vectors</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <FormField control={form.control} name="affirmationLevers" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs text-primary">Positive Reinforcement Anchors</FormLabel>
                  <FormControl><Input {...field} className="font-mono text-sm h-8 border-primary/30 bg-background focus-visible:ring-primary/50" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="pressureLevers" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs text-destructive">Stress Triggers</FormLabel>
                  <FormControl><Input {...field} className="font-mono text-sm h-8 border-destructive/30 bg-background focus-visible:ring-destructive/50" /></FormControl></FormItem>
                )} />
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-none border-primary/20 bg-primary/5">
            <CardHeader className="py-4 border-b border-primary/10">
              <CardTitle className="text-sm font-mono uppercase tracking-wider text-primary/70">Instruction Set Overrides</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormField control={form.control} name="sayThis" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs text-primary">Optimal Inputs (One per line)</FormLabel>
                  <FormControl><Textarea {...field} className="min-h-[100px] font-mono text-sm border-primary/30 focus-visible:ring-primary/50 bg-background" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="whatWorked" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs text-primary/60">Validated Approaches</FormLabel>
                  <FormControl><Textarea {...field} className="min-h-[80px] font-mono text-sm border-primary/20 bg-background/50" /></FormControl></FormItem>
                )} />
              </div>
              <div className="space-y-4">
                <FormField control={form.control} name="neverSayThis" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs text-destructive">Restricted Inputs (One per line)</FormLabel>
                  <FormControl><Textarea {...field} className="min-h-[100px] font-mono text-sm border-destructive/30 focus-visible:ring-destructive/50 bg-background" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="whatFailed" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs text-destructive/60">Failed Approaches</FormLabel>
                  <FormControl><Textarea {...field} className="min-h-[80px] font-mono text-sm border-destructive/20 bg-background/50" /></FormControl></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-primary/20 bg-primary/5">
            <CardHeader className="py-4 border-b border-primary/10">
              <CardTitle className="text-sm font-mono uppercase tracking-wider text-primary/70">Simulation Directives</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <FormField control={form.control} name="optimizationRoadmap" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea {...field} placeholder="Strategic objectives for this simulation..." className="min-h-[150px] font-mono text-sm bg-background border-primary/20" />
                  </FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="sticky bottom-6 flex justify-end">
            <Button type="submit" disabled={updateProfile.isPending} className="font-mono uppercase text-xs shadow-[0_0_15px_hsl(var(--primary)_/_0.3)] bg-primary text-primary-foreground h-10 px-8">
              <Save className="h-4 w-4 mr-2" />
              {updateProfile.isPending ? "Compiling..." : "Compile Parameters"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── Virtual Persons List ─────────────────────────────────────────────────────

export function VirtualPersons() {
  const { data: persons, isLoading } = useListVirtualPersons();
  const deletePersonMutation = useDeleteVirtualPerson();
  const queryClient = useQueryClient();

  if (isLoading) return (
    <div className="p-8 space-y-4 animate-pulse">
      {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-lg border border-border" />)}
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Virtual Persons</h1>
          <p className="text-muted-foreground text-sm font-mono mt-1">{persons?.length ?? 0} constructs active</p>
        </div>
        <Link href="/virtual/new">
          <Button className="font-mono text-xs uppercase h-9" data-testid="button-add-virtual">
            <Plus className="h-4 w-4 mr-2" /> New Construct
          </Button>
        </Link>
      </div>
      <Separator className="bg-border/50" />
      {!persons?.length && (
        <div className="py-20 text-center">
          <Cpu className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-mono text-sm">No constructs yet.</p>
          <Link href="/virtual/new">
            <Button variant="outline" className="mt-4 font-mono text-xs uppercase">Create First Construct</Button>
          </Link>
        </div>
      )}
      <div className="space-y-3">
        {persons?.map(person => (
          <div key={person.id} className="group flex items-center gap-4 border border-border bg-card/40 rounded-lg px-5 py-4 hover:border-primary/40 hover:bg-card/70 transition-colors" data-testid={`card-virtual-${person.id}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className="font-semibold tracking-tight truncate">{person.name}</span>
                {person.gender && <Badge variant="outline" className="font-mono text-xs border-border/60 text-muted-foreground shrink-0">{person.gender}</Badge>}
                {person.cognitiveStyle && <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary/70 shrink-0">{person.cognitiveStyle}</Badge>}
              </div>
              {person.backstory && <p className="text-xs text-muted-foreground mt-1 truncate">{person.backstory}</p>}
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link href={`/virtual/${person.id}/profile`}>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Parameters" data-testid={`button-profile-${person.id}`}>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Button
                variant="ghost" size="icon" className="h-8 w-8"
                data-testid={`button-delete-${person.id}`}
                onClick={() => {
                  if (!confirm(`Delete ${person.name}?`)) return;
                  deletePersonMutation.mutate({ id: person.id }, {
                    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListVirtualPersonsQueryKey() })
                  });
                }}
              ><Trash2 className="h-4 w-4 text-destructive/70" /></Button>
            </div>
            <Link href={`/virtual/${person.id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-open-${person.id}`}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── New Virtual Person ───────────────────────────────────────────────────────

const newVirtualSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gender: z.string().optional(),
  cognitiveStyle: z.string().optional(),
  emotionalStyle: z.string().optional(),
  sensitivities: z.string().optional(),
  backstory: z.string().optional(),
});

export function NewVirtualPerson() {
  const createPerson = useCreateVirtualPerson();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof newVirtualSchema>>({
    resolver: zodResolver(newVirtualSchema),
    defaultValues: { name: "", gender: "", cognitiveStyle: "", emotionalStyle: "", sensitivities: "", backstory: "" },
  });

  const onSubmit = (data: z.infer<typeof newVirtualSchema>) => {
    createPerson.mutate({ data }, {
      onSuccess: (person) => {
        queryClient.invalidateQueries({ queryKey: getListVirtualPersonsQueryKey() });
        setLocation(`/virtual/${person.id}`);
      }
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/virtual">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Construct</h1>
          <p className="text-muted-foreground text-sm font-mono">Define a simulated personality to coach against</p>
        </div>
      </div>
      <Card className="shadow-none border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-mono uppercase text-primary/70">Name / Designation *</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Li Weng" className="font-mono border-primary/20 bg-background" data-testid="input-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase text-primary/70">Gender</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Male" className="font-mono border-primary/20 bg-background" data-testid="input-gender" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="cognitiveStyle" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono uppercase text-primary/70">Cognitive Style</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Analytical, Intuitive" className="font-mono border-primary/20 bg-background" data-testid="input-cognitive" /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="emotionalStyle" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-mono uppercase text-primary/70">Emotional Style</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Stoic, Reactive, Avoidant" className="font-mono border-primary/20 bg-background" data-testid="input-emotional" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="sensitivities" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-mono uppercase text-primary/70">Sensitivities</FormLabel>
                  <FormControl><Input {...field} placeholder="Known triggers or areas of sensitivity" className="font-mono border-primary/20 bg-background" data-testid="input-sensitivities" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="backstory" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-mono uppercase text-primary/70">Backstory</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Key life context, professional background, known history..." className="font-mono min-h-[100px] border-primary/20 bg-background" data-testid="input-backstory" /></FormControl>
                </FormItem>
              )} />
              <div className="pt-2 flex justify-end gap-3">
                <Link href="/virtual"><Button type="button" variant="ghost" className="font-mono text-xs uppercase">Cancel</Button></Link>
                <Button type="submit" disabled={createPerson.isPending} className="font-mono text-xs uppercase bg-primary text-primary-foreground" data-testid="button-submit">
                  {createPerson.isPending ? "Initializing..." : "Initialize Construct"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Virtual Person View ──────────────────────────────────────────────────────

export function VirtualPersonView({ id }: { id: number }) {
  const { data: person } = useGetVirtualPerson(id, { query: { enabled: !!id, queryKey: [] } });
  const { data: conversations, isLoading: convsLoading } = useListConversations();
  const createConversation = useCreateConversation();
  const deleteConvMutation = useDeleteConversation();
  const queryClient = useQueryClient();
  const personConvs = conversations?.filter(c => c.virtualPersonId === id) ?? [];
  const [activeConvId, setActiveConvId] = useState<number | null>(
    personConvs.length ? personConvs[personConvs.length - 1].id : null
  );

  const startNewConversation = () => {
    createConversation.mutate({ data: { mode: "virtual", virtualPersonId: id, title: "New simulation" } }, {
      onSuccess: (conv) => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setActiveConvId(conv.id);
      }
    });
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <aside className="w-64 border-r border-primary/20 flex flex-col bg-primary/5">
        <div className="p-4 border-b border-primary/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-primary/60">Construct</p>
            <p className="font-semibold truncate text-primary">{person?.name ?? "..."}</p>
          </div>
          <Link href={`/virtual/${id}/profile`}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Parameters" data-testid="button-view-profile">
              <FileText className="h-4 w-4 text-primary/70" />
            </Button>
          </Link>
        </div>
        <div className="p-3">
          <Button
            variant="outline" size="sm" className="w-full font-mono text-xs uppercase justify-start gap-2 border-dashed border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={startNewConversation} disabled={createConversation.isPending}
            data-testid="button-new-simulation"
          >
            <Plus className="h-3 w-3" />
            {createConversation.isPending ? "Initializing..." : "New Simulation"}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {convsLoading && <div className="p-2 text-xs text-primary/50 animate-pulse">Loading...</div>}
          {!personConvs.length && !convsLoading && (
            <p className="px-3 py-6 text-xs text-primary/40 text-center">No simulations yet</p>
          )}
          {personConvs.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveConvId(c.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded text-xs transition-colors",
                activeConvId === c.id
                  ? "bg-primary/20 border border-primary/40 text-primary"
                  : "hover:bg-primary/10 text-primary/60 border border-transparent"
              )}
              data-testid={`button-sim-${c.id}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono truncate">{c.title ?? "Untitled"}</span>
                <button
                  onClick={e => { e.stopPropagation(); deleteConvMutation.mutate({ id: c.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }); if (activeConvId === c.id) setActiveConvId(null); } }); }}
                  className="hover:text-destructive shrink-0"
                ><Trash2 className="h-3 w-3" /></button>
              </div>
            </button>
          ))}
        </div>
      </aside>
      <div className="flex-1 overflow-hidden">
        {activeConvId ? (
          <Chat mode="virtual" virtualPersonId={id} conversationId={activeConvId} />
        ) : (
          <div className="h-full flex items-center justify-center flex-col gap-4">
            <Cpu className="h-12 w-12 text-primary/10" />
            <p className="text-primary/40 text-sm font-mono">Select a simulation or initialize one</p>
            <Button onClick={startNewConversation} variant="outline" className="font-mono text-xs uppercase border-primary/30 text-primary hover:bg-primary/10" data-testid="button-start-simulation">
              <Plus className="h-4 w-4 mr-2" /> Initialize Simulation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
