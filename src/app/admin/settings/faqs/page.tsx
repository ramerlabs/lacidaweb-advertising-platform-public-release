"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Faq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
};

const emptyForm = {
  question: "",
  answer: "",
  sortOrder: "",
  isPublished: true,
};

export default function AdminFaqsPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newFaq, setNewFaq] = useState(emptyForm);
  const [editing, setEditing] = useState<Record<string, Faq>>({});

  async function load() {
    const res = await fetch("/api/admin/faqs");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setStatus(data.error || "Failed to load FAQs");
      return;
    }
    setFaqs(data.faqs);
    setEditing(
      Object.fromEntries(
        data.faqs.map((faq: Faq) => [faq.id, { ...faq }]),
      ),
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function createFaq() {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      setStatus("Question and answer are required");
      return;
    }

    setCreating(true);
    setStatus("");
    const res = await fetch("/api/admin/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: newFaq.question,
        answer: newFaq.answer,
        sortOrder: newFaq.sortOrder ? Number(newFaq.sortOrder) : undefined,
        isPublished: newFaq.isPublished,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setStatus(data.error || "Create failed");
      return;
    }
    setNewFaq(emptyForm);
    setStatus("FAQ added");
    await load();
  }

  async function saveFaq(id: string) {
    const faq = editing[id];
    if (!faq) return;

    setSavingId(id);
    setStatus("");
    const res = await fetch(`/api/admin/faqs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: faq.question,
        answer: faq.answer,
        sortOrder: faq.sortOrder,
        isPublished: faq.isPublished,
      }),
    });
    const data = await res.json();
    setSavingId(null);
    if (!res.ok) {
      setStatus(data.error || "Save failed");
      return;
    }
    setStatus("FAQ updated");
    await load();
  }

  async function removeFaq(id: string) {
    if (!confirm("Delete this FAQ?")) return;

    setStatus("");
    const res = await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Delete failed");
      return;
    }
    setStatus("FAQ deleted");
    await load();
  }

  function updateEditing(id: string, patch: Partial<Faq>) {
    setEditing((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading FAQs...</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">FAQs</h1>
        <p className="text-muted-foreground">Manage questions shown on the landing page.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add FAQ</CardTitle>
          <CardDescription>New entries appear on the homepage when published.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-question">Question</Label>
            <Input
              id="new-question"
              value={newFaq.question}
              onChange={(e) => setNewFaq((f) => ({ ...f, question: e.target.value }))}
              placeholder="How do I connect my Instagram account?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-answer">Answer</Label>
            <Textarea
              id="new-answer"
              rows={4}
              value={newFaq.answer}
              onChange={(e) => setNewFaq((f) => ({ ...f, answer: e.target.value }))}
              placeholder="Go to Accounts in your dashboard and click Connect..."
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-order">Sort order</Label>
              <Input
                id="new-order"
                type="number"
                min={0}
                className="w-28"
                value={newFaq.sortOrder}
                onChange={(e) => setNewFaq((f) => ({ ...f, sortOrder: e.target.value }))}
                placeholder="Auto"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={newFaq.isPublished}
                onChange={(e) => setNewFaq((f) => ({ ...f, isPublished: e.target.checked }))}
              />
              Published
            </label>
            <Button onClick={createFaq} disabled={creating}>
              {creating ? "Adding..." : "Add FAQ"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {faqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No FAQs yet.</p>
        ) : (
          faqs.map((faq) => {
            const draft = editing[faq.id] || faq;
            return (
              <Card key={faq.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-base">FAQ #{draft.sortOrder + 1}</CardTitle>
                    <CardDescription>Edit question, answer, order, and visibility.</CardDescription>
                  </div>
                  <Badge variant={draft.isPublished ? "default" : "outline"}>
                    {draft.isPublished ? "Published" : "Hidden"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question</Label>
                    <Input
                      value={draft.question}
                      onChange={(e) => updateEditing(faq.id, { question: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Answer</Label>
                    <Textarea
                      rows={4}
                      value={draft.answer}
                      onChange={(e) => updateEditing(faq.id, { answer: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="space-y-2">
                      <Label>Sort order</Label>
                      <Input
                        type="number"
                        min={0}
                        className="w-28"
                        value={draft.sortOrder}
                        onChange={(e) =>
                          updateEditing(faq.id, { sortOrder: Number(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <label className="flex items-center gap-2 pt-6 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.isPublished}
                        onChange={(e) => updateEditing(faq.id, { isPublished: e.target.checked })}
                      />
                      Published
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => saveFaq(faq.id)} disabled={savingId === faq.id}>
                      {savingId === faq.id ? "Saving..." : "Save changes"}
                    </Button>
                    <Button variant="outline" onClick={() => removeFaq(faq.id)}>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}
