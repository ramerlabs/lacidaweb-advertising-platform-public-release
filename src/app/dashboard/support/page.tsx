"use client";

import { useEffect, useMemo, useState } from "react";
import { useTeam } from "@/components/dashboard/team-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  messages: Array<{ id: string; senderRole: string; message: string; createdAt: string }>;
};

export default function SupportPage() {
  const { teamId } = useTeam();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    if (!teamId) return;
    const res = await fetch(`/api/support/tickets?teamId=${teamId}`);
    const data = await res.json();
    setTickets(data.tickets || []);
  }

  useEffect(() => {
    load();
  }, [teamId]);

  const selected = useMemo(() => tickets.find((t) => t.id === selectedId) || null, [tickets, selectedId]);

  async function createTicket() {
    if (!teamId) return;
    setStatus("");
    const res = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, subject, description, priority: "MEDIUM" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Create ticket failed");
      return;
    }
    setSubject("");
    setDescription("");
    setStatus("Ticket created");
    await load();
  }

  async function sendReply() {
    if (!teamId || !selected) return;
    const res = await fetch(`/api/support/tickets/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, message: reply }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Reply failed");
      return;
    }
    setReply("");
    setStatus("Reply sent");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support tickets</h1>
        <p className="text-muted-foreground">Open tickets and get replies from support</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create ticket</CardTitle>
          <CardDescription>Describe your issue and our team can reply in-thread</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea
            placeholder="Describe your issue..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button onClick={createTicket}>Create ticket</Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>My tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tickets yet.</p>
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedId(ticket.id)}
                  className="w-full rounded border p-3 text-left text-sm hover:bg-secondary"
                >
                  <p className="font-medium">{ticket.subject}</p>
                  <p className="text-muted-foreground">{ticket.status}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selected ? (
              <>
                <div className="max-h-72 space-y-2 overflow-auto rounded border p-3">
                  {selected.messages.map((msg) => (
                    <div key={msg.id} className="rounded bg-secondary/60 p-2 text-sm">
                      <p className="text-xs text-muted-foreground">{msg.senderRole}</p>
                      <p>{msg.message}</p>
                    </div>
                  ))}
                </div>
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply..." />
                <Button onClick={sendReply} disabled={!reply.trim()}>
                  Send reply
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a ticket to view replies.</p>
            )}
            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
