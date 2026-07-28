import {
  useGetPersonProfile, useUpdatePersonProfile, useGetPersonSummary,
  useListPersons, useCreatePerson, useGetPerson,
  useListConversations, useCreateConversation,
  useDeletePerson, useDeleteConversation,
  getGetPersonProfileQueryKey, getListPersonsQueryKey, getListConversationsQueryKey,
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
import { ArrowLeft, Save, Sparkles, Plus, Trash2, MessageSquare, User, ChevronRight, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Chat } from "@/pages/chat";

const profileSchema = z.object({
  genderPatterns: z.string().optional(),
  cognitiveLevel: z.string().optional(),
  emotionalProfile: z.string().optional(),
  affirmationLevers: z.string().optional(),
  pressureLevers: z.string().optional(),
  optimizationRoadmap: z.string().optional(),
  whatWorked: z.string().optional(), // We'll manage arrays as multiline strings for easy editing
  whatFailed: z.string().optional(),
  sayThis: z.string().optional(),
  neverSayThis: z.string().optional(),
});

export function RelationshipProfile({ id }: { id: number }) {
  const { data: profile, isLoading } = useGetPersonProfile(id);
  const { data: summary } = useGetPersonSummary(id);
  const updateProfile = useUpdatePersonProfile();
  const queryClient = useQueryClient();
  const initRef = useRef<number | null>(null);

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
        queryClient.setQueryData(getGetPersonProfileQueryKey(id), newProfile);
        // Toast could go here
      }
    });
  };

  if (isLoading) return <div className="p-8 animate-pulse bg-muted min-h-screen"></div>;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/relationships/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Psychological Profile</h1>
          <p className="text-muted-foreground text-sm font-mono uppercase">Target ID: {id}</p>
        </div>
      </div>

      {summary && summary.keyInsights.length > 0 && (
        <Card className="border-primary/30 bg-primary/5 shadow-none mb-8">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-mono text-primary flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> AI Interaction Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/90">
              {summary.keyInsights.map((insight, i) => <li key={i}>{insight}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-none border-border bg-card/50">
              <CardHeader className="py-4 border-b border-border/50">
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Core Traits</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <FormField control={form.control} name="cognitiveLevel" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs">Cognitive Approach</FormLabel>
                  <FormControl><Input {...field} className="font-mono text-sm h-8" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="emotionalProfile" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs">Emotional Baseline</FormLabel>
                  <FormControl><Input {...field} className="font-mono text-sm h-8" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="genderPatterns" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs">Gender/Social Conditioning</FormLabel>
                  <FormControl><Input {...field} className="font-mono text-sm h-8" /></FormControl></FormItem>
                )} />
              </CardContent>
            </Card>

            <Card className="shadow-none border-border bg-card/50">
              <CardHeader className="py-4 border-b border-border/50">
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Influence Vectors</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <FormField control={form.control} name="affirmationLevers" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs text-emerald-400">Affirmation Levers</FormLabel>
                  <FormControl><Input {...field} className="font-mono text-sm h-8 border-emerald-900/50 focus-visible:ring-emerald-500" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="pressureLevers" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs text-rose-400">Pressure Points</FormLabel>
                  <FormControl><Input {...field} className="font-mono text-sm h-8 border-rose-900/50 focus-visible:ring-rose-500" /></FormControl></FormItem>
                )} />
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-none border-border bg-card/50">
            <CardHeader className="py-4 border-b border-border/50">
              <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Linguistic Tactics</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormField control={form.control} name="sayThis" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs text-emerald-400">Say This (One per line)</FormLabel>
                  <FormControl><Textarea {...field} className="min-h-[100px] font-mono text-sm border-emerald-900/50 focus-visible:ring-emerald-500 bg-emerald-950/10" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="whatWorked" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs text-emerald-400/80">Historical Successes</FormLabel>
                  <FormControl><Textarea {...field} className="min-h-[80px] font-mono text-sm border-emerald-900/30 bg-emerald-950/5" /></FormControl></FormItem>
                )} />
              </div>
              <div className="space-y-4">
                <FormField control={form.control} name="neverSayThis" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs text-rose-400">Never Say This (One per line)</FormLabel>
                  <FormControl><Textarea {...field} className="min-h-[100px] font-mono text-sm border-rose-900/50 focus-visible:ring-rose-500 bg-rose-950/10" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="whatFailed" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs text-rose-400/80">Historical Failures</FormLabel>
                  <FormControl><Textarea {...field} className="min-h-[80px] font-mono text-sm border-rose-900/30 bg-rose-950/5" /></FormControl></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-border bg-card/50">
            <CardHeader className="py-4 border-b border-border/50">
              <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Strategic Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <FormField control={form.control} name="optimizationRoadmap" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea {...field} placeholder="Long-term strategy for this relationship..." className="min-h-[150px] font-mono text-sm" />
                  </FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="sticky bottom-6 flex justify-end">
            <Button type="submit" disabled={updateProfile.isPending} className="font-mono uppercase text-xs shadow-2xl h-10 px-8">
              <Save className="h-4 w-4 mr-2" />
              {updateProfile.isPending ? "Syncing..." : "Sync Profile Parameters"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── Relationships List ───────────────────────────────────────────────────────

export function Relationships() {
  const { data: persons, isLoading } = useListPersons();
  const deletePersonMutation = useDeletePerson();
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
          <h1 className="text-2xl font-bold tracking-tight">Real Persons</h1>
          <p className="text-muted-foreground text-sm font-mono mt-1">
            {persons?.length ?? 0} profiles active
          </p>
        </div>
        <Link href="/relationships/new">
          <Button className="font-mono text-xs uppercase h-9" data-testid="button-add-person">
            <Plus className="h-4 w-4 mr-2" /> Add Person
          </Button>
        </Link>
      </div>
      <Separator className="bg-border/50" />
      {!persons?.length && (
        <div className="py-20 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-mono text-sm">No profiles yet.</p>
          <Link href="/relationships/new">
            <Button variant="outline" className="mt-4 font-mono text-xs uppercase">Create First Profile</Button>
          </Link>
        </div>
      )}
      <div className="space-y-3">
        {persons?.map(person => (
          <div key={person.id} className="group flex items-center gap-4 border border-border bg-card/40 rounded-lg px-5 py-4 hover:border-primary/40 hover:bg-card/70 transition-colors" data-testid={`card-person-${person.id}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className="font-semibold tracking-tight truncate">{person.name}</span>
                {person.relationship && (
                  <Badge variant="outline" className="font-mono text-xs border-border/60 text-muted-foreground shrink-0">
                    {person.relationship}
                  </Badge>
                )}
                {person.gender && (
                  <Badge variant="outline" className="font-mono text-xs border-border/40 text-muted-foreground/70 shrink-0">
                    {person.gender}
                  </Badge>
                )}
              </div>
              {person.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{person.notes}</p>}
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link href={`/relationships/${person.id}/profile`}>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="View Profile" data-testid={`button-profile-${person.id}`}>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
              <Button
                variant="ghost" size="icon" className="h-8 w-8" title="Delete"
                data-testid={`button-delete-${person.id}`}
                onClick={() => {
                  if (!confirm(`Delete ${person.name}?`)) return;
                  deletePersonMutation.mutate({ id: person.id }, {
                    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPersonsQueryKey() })
                  });
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive/70" />
              </Button>
            </div>
            <Link href={`/relationships/${person.id}`}>
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

// ─── New Relationship ─────────────────────────────────────────────────────────

const newPersonSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relationship: z.string().optional(),
  gender: z.string().optional(),
  notes: z.string().optional(),
});

export function NewRelationship() {
  const createPerson = useCreatePerson();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof newPersonSchema>>({
    resolver: zodResolver(newPersonSchema),
    defaultValues: { name: "", relationship: "", gender: "", notes: "" },
  });

  const onSubmit = (data: z.infer<typeof newPersonSchema>) => {
    createPerson.mutate({ data }, {
      onSuccess: (person) => {
        queryClient.invalidateQueries({ queryKey: getListPersonsQueryKey() });
        setLocation(`/relationships/${person.id}`);
      }
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/relationships">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Profile</h1>
          <p className="text-muted-foreground text-sm font-mono">Add a real person to coach against</p>
        </div>
      </div>
      <Card className="shadow-none border-border bg-card/50">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-mono uppercase text-muted-foreground">Full Name *</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Sarah Chen" className="font-mono" data-testid="input-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="relationship" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-mono uppercase text-muted-foreground">Relationship Type</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Manager, Partner, Client" className="font-mono" data-testid="input-relationship" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-mono uppercase text-muted-foreground">Gender</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Female, Male, Non-binary" className="font-mono" data-testid="input-gender" /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-mono uppercase text-muted-foreground">Initial Notes</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Key context, communication history..." className="font-mono min-h-[100px]" data-testid="input-notes" /></FormControl>
                </FormItem>
              )} />
              <div className="pt-2 flex justify-end gap-3">
                <Link href="/relationships"><Button type="button" variant="ghost" className="font-mono text-xs uppercase">Cancel</Button></Link>
                <Button type="submit" disabled={createPerson.isPending} className="font-mono text-xs uppercase" data-testid="button-submit">
                  {createPerson.isPending ? "Creating..." : "Create Profile"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Relationship View ────────────────────────────────────────────────────────

export function RelationshipView({ id }: { id: number }) {
  const { data: person } = useGetPerson(id, { query: { enabled: !!id, queryKey: [] } });
  const { data: conversations, isLoading: convsLoading } = useListConversations();
  const createConversation = useCreateConversation();
  const deleteConvMutation = useDeleteConversation();
  const queryClient = useQueryClient();
  const personConvs = conversations?.filter(c => c.personId === id) ?? [];
  const [activeConvId, setActiveConvId] = useState<number | null>(
    personConvs.length ? personConvs[personConvs.length - 1].id : null
  );

  const startNewConversation = () => {
    createConversation.mutate({ data: { mode: "real", personId: id, title: "New conversation" } }, {
      onSuccess: (conv) => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setActiveConvId(conv.id);
      }
    });
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left: conversation list */}
      <aside className="w-64 border-r border-border/50 flex flex-col bg-sidebar/30">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-muted-foreground">Target</p>
            <p className="font-semibold truncate">{person?.name ?? "..."}</p>
          </div>
          <Link href={`/relationships/${id}/profile`}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Profile" data-testid="button-view-profile">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </Button>
          </Link>
        </div>
        <div className="p-3">
          <Button
            variant="outline" size="sm" className="w-full font-mono text-xs uppercase justify-start gap-2 border-dashed border-border/60"
            onClick={startNewConversation} disabled={createConversation.isPending}
            data-testid="button-new-conversation"
          >
            <Plus className="h-3 w-3" />
            {createConversation.isPending ? "Creating..." : "New Conversation"}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {convsLoading && <div className="p-2 text-xs text-muted-foreground animate-pulse">Loading...</div>}
          {!personConvs.length && !convsLoading && (
            <p className="px-3 py-6 text-xs text-muted-foreground text-center">No conversations yet</p>
          )}
          {personConvs.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveConvId(c.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded text-xs transition-colors",
                activeConvId === c.id
                  ? "bg-primary/15 border border-primary/30 text-foreground"
                  : "hover:bg-muted/50 text-muted-foreground border border-transparent"
              )}
              data-testid={`button-conv-${c.id}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono truncate">{c.title ?? "Untitled"}</span>
                <button
                  onClick={e => { e.stopPropagation(); deleteConvMutation.mutate({ id: c.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }); if (activeConvId === c.id) setActiveConvId(null); } }); }}
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive shrink-0"
                ><Trash2 className="h-3 w-3" /></button>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Right: Chat */}
      <div className="flex-1 overflow-hidden">
        {activeConvId ? (
          <Chat mode="real" personId={id} conversationId={activeConvId} />
        ) : (
          <div className="h-full flex items-center justify-center flex-col gap-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-muted-foreground text-sm font-mono">Select a conversation or start a new one</p>
            <Button onClick={startNewConversation} variant="outline" className="font-mono text-xs uppercase" data-testid="button-start-chat">
              <Plus className="h-4 w-4 mr-2" /> Start Conversation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
