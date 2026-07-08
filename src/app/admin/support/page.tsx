"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  team: { name: string };
  messages: Array<{ id: string; senderRole: string; message: string }>;
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    const res = await fetch("/api/admin/tickets");
    const data = await res.json();
    if (res.ok) setTickets(data.tickets || []);
  }

  useEffect(() => {
    load();
  }, []);

  const selected = tickets.find((t) => t.id === selectedTicket) || null;

  async function sendSupportReply() {
    if (!selected) return;
    const res = await fetch(`/api/admin/tickets/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: reply, status: "WAITING_CLIENT" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Reply failed");
      return;
    }
    setReply("");
    setStatus("Support reply sent");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support</h1>
        <p className="text-muted-foreground">Reply to client tickets</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Support queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tickets yet.</p>
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket.id)}
                  className="w-full rounded border p-3 text-left text-sm hover:bg-secondary"
                >
                  <p className="font-medium">{ticket.subject}</p>
                  <p className="text-muted-foreground">
                    {ticket.team.name} - {ticket.status}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ticket thread</CardTitle>
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
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Support reply..." />
                <Button onClick={sendSupportReply} disabled={!reply.trim()}>
                  Send support reply
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a ticket to reply.</p>
            )}
            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
