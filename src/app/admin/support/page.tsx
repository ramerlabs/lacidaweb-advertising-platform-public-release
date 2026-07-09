"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  team: { name: string };
  messages: Array<{ id: string; senderRole: string; message: string; createdAt: string }>;
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-cyan-500/15 text-cyan-400",
  IN_PROGRESS: "bg-amber-500/15 text-amber-400",
  WAITING_CLIENT: "bg-violet-500/15 text-violet-400",
  RESOLVED: "bg-emerald-500/15 text-emerald-400",
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/tickets");
    const data = await res.json();
    if (res.ok) {
      setTickets(data.tickets || []);
      if (selectedTicket && !data.tickets?.some((t: Ticket) => t.id === selectedTicket)) {
        setSelectedTicket(null);
      }
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selected = tickets.find((t) => t.id === selectedTicket) || null;
  const allSelected = tickets.length > 0 && selectedIds.size === tickets.length;
  const someSelected = selectedIds.size > 0;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tickets.map((t) => t.id)));
    }
  }

  async function sendSupportReply() {
    if (!selected) return;
    setBusy(true);
    setStatus("");
    const res = await fetch(`/api/admin/tickets/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: reply, status: "WAITING_CLIENT" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(data.error || "Reply failed");
      return;
    }
    setReply("");
    setStatus("Reply sent");
    await load();
  }

  async function closeTicket(ticketId: string) {
    setBusy(true);
    setStatus("");
    const res = await fetch(`/api/admin/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(data.error || "Failed to close ticket");
      return;
    }
    setStatus("Ticket closed");
    await load();
  }

  async function deleteTicket(ticketId: string) {
    if (!confirm("Delete this ticket permanently? This cannot be undone.")) return;
    setBusy(true);
    setStatus("");
    const res = await fetch(`/api/admin/tickets/${ticketId}`, { method: "DELETE" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(data.error || "Delete failed");
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(ticketId);
      return next;
    });
    if (selectedTicket === ticketId) setSelectedTicket(null);
    setStatus("Ticket deleted");
    await load();
  }

  async function bulkDelete() {
    if (!someSelected) return;
    const count = selectedIds.size;
    if (!confirm(`Delete ${count} ticket${count === 1 ? "" : "s"} permanently? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    setStatus("");
    const res = await fetch("/api/admin/tickets/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setStatus(data.error || "Bulk delete failed");
      return;
    }
    setSelectedIds(new Set());
    setSelectedTicket(null);
    setStatus(`Deleted ${data.deleted} ticket${data.deleted === 1 ? "" : "s"}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support</h1>
          <p className="text-muted-foreground">Reply, close, or delete support tickets</p>
        </div>
        {someSelected ? (
          <Button variant="destructive" size="sm" onClick={bulkDelete} disabled={busy}>
            <Trash2 className="h-4 w-4" />
            Delete selected ({selectedIds.size})
          </Button>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Support queue</CardTitle>
            {tickets.length > 0 ? (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-zinc-600"
                />
                Select all
              </label>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2">
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tickets yet.</p>
            ) : (
              tickets.map((ticket) => {
                const isSelected = selectedTicket === ticket.id;
                const isChecked = selectedIds.has(ticket.id);
                return (
                  <div
                    key={ticket.id}
                    className={cn(
                      "flex gap-2 rounded-lg border p-2 transition",
                      isSelected ? "border-cyan-500/40 bg-cyan-500/5" : "hover:bg-secondary/50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(ticket.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 h-4 w-4 shrink-0 rounded border-zinc-600"
                      aria-label={`Select ticket ${ticket.subject}`}
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedTicket(ticket.id)}
                      className="min-w-0 flex-1 text-left text-sm"
                    >
                      <p className="font-medium">{ticket.subject}</p>
                      <p className="text-muted-foreground">{ticket.team.name}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            STATUS_STYLES[ticket.status] || "bg-secondary",
                          )}
                        >
                          {ticket.status.replace("_", " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">{ticket.priority}</span>
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <CardTitle>Ticket thread</CardTitle>
            {selected ? (
              <div className="flex flex-wrap gap-2">
                {selected.status !== "RESOLVED" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => closeTicket(selected.id)}
                    disabled={busy}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Close
                  </Button>
                ) : (
                  <Badge variant="secondary">Closed</Badge>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteTicket(selected.id)}
                  disabled={busy}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {selected ? (
              <>
                <div className="max-h-72 space-y-2 overflow-auto rounded border p-3">
                  {selected.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "rounded p-2 text-sm",
                        msg.senderRole === "SUPPORT"
                          ? "bg-cyan-500/10"
                          : "bg-secondary/60",
                      )}
                    >
                      <p className="text-xs text-muted-foreground">{msg.senderRole}</p>
                      <p>{msg.message}</p>
                    </div>
                  ))}
                </div>
                {selected.status !== "RESOLVED" ? (
                  <>
                    <Textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Support reply..."
                    />
                    <Button onClick={sendSupportReply} disabled={!reply.trim() || busy}>
                      Send reply
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This ticket is closed. Delete it to remove from the queue.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a ticket to view the thread.</p>
            )}
            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
