import { Shell } from "@/components/layout/Shell";
import { Dashboard } from "@/pages/dashboard";
import { Chat } from "@/pages/chat";
import { Route, Switch, Router as WouterRouter } from "wouter";
import NotFound from "@/pages/not-found";
import { Toaster } from "@/components/ui/toaster";
import { Relationships, NewRelationship, RelationshipView, RelationshipProfile } from "@/pages/relationships";
import { VirtualPersons, NewVirtualPerson, VirtualPersonView, VirtualPersonProfile } from "@/pages/virtual";
import { Documents } from "@/pages/documents";
import { ApiKeys } from "@/pages/api-keys";

function AppRouter() {
  return (
    <Switch>
      {/* Free-form chat is the landing page — no login required */}
      <Route path="/"><Shell><Chat mode="free" /></Shell></Route>

      <Route path="/dashboard"><Shell><Dashboard /></Shell></Route>
      <Route path="/chat"><Shell><Chat mode="free" /></Shell></Route>

      <Route path="/relationships"><Shell><Relationships /></Shell></Route>
      <Route path="/relationships/new"><Shell><NewRelationship /></Shell></Route>
      <Route path="/relationships/:id">
        {(params) => <Shell><RelationshipView id={Number(params.id)} /></Shell>}
      </Route>
      <Route path="/relationships/:id/profile">
        {(params) => <Shell><RelationshipProfile id={Number(params.id)} /></Shell>}
      </Route>

      <Route path="/virtual"><Shell><VirtualPersons /></Shell></Route>
      <Route path="/virtual/new"><Shell><NewVirtualPerson /></Shell></Route>
      <Route path="/virtual/:id">
        {(params) => <Shell><VirtualPersonView id={Number(params.id)} /></Shell>}
      </Route>
      <Route path="/virtual/:id/profile">
        {(params) => <Shell><VirtualPersonProfile id={Number(params.id)} /></Shell>}
      </Route>

      <Route path="/documents"><Shell><Documents /></Shell></Route>
      <Route path="/api-keys"><Shell><ApiKeys /></Shell></Route>

      <Route>
        <Shell><NotFound /></Shell>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AppRouter />
      </WouterRouter>
      <Toaster />
    </>
  );
}
