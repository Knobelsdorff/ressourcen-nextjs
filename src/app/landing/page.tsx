"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function LandingPage() {
  const demoSelectedFigure = useMemo(
    () => ({
      id: "landing-demo",
      name: "Dein sicherer Anker",
      emoji: "🕯️",
      category: "figure",
      description: "Eine warme, ruhige Präsenz, die Sicherheit vermittelt.",
      pronouns: "sie/ihr",
    }),
    []
  );

  const demoQuestionAnswers = useMemo(
    () => [
      {
        questionId: 1,
        answer: "Warm, ruhig, freundlich – mit einem sanften Blick.",
      },
      {
        questionId: 2,
        answer: "Ich spüre Erleichterung, Ruhe und einen sicheren Boden unter mir.",
      },
      {
        questionId: 3,
        answer: "Sie bleibt bei mir, atmet mit mir und erinnert mich daran, dass ich jetzt sicher bin.",
      },
      {
        questionId: 4,
        answer: "Ich wünsche mir, dass sie mir hilft, mich zu regulieren, wenn es schwierig wird.",
      },
      {
        questionId: 5,
        answer: "„Du musst das nicht alleine tragen. Ich bin hier.“",
      },
    ],
    []
  );

  const [currentStory, setCurrentStory] = useState<string>(
    [
      "Du sitzt an einem ruhigen Ort und spürst, wie dein Atem langsam weicher wird.",
      "Mit jedem Ausatmen darf ein kleines bisschen Anspannung abfließen.",
      "In deiner Nähe ist eine warme, stille Präsenz, die nichts von dir verlangt.",
    ].join("\n\n")
  );
  const [editingInstructions, setEditingInstructions] = useState<string>(
    "Mache die Geschichte etwas konkreter, noch wärmer im Ton und füge 1–2 Körperempfindungen hinzu."
  );
  const [resultStory, setResultStory] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEditWithAI() {
    if (!currentStory.trim() || !editingInstructions.trim()) return;
    setIsEditing(true);
    setError(null);

    try {
      const response = await fetch("/api/edit-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedFigure: demoSelectedFigure,
          questionAnswers: demoQuestionAnswers,
          currentStory,
          editingInstructions,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || `Request failed (${response.status})`);
      }

      const data = (await response.json()) as { story?: string };
      if (!data?.story) throw new Error("Keine bearbeitete Geschichte erhalten.");
      setResultStory(data.story);
    } catch (e: any) {
      setError(e?.message || "Unbekannter Fehler");
    } finally {
      setIsEditing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <div className="mb-6 text-center sm:mb-10">
          <h1 className="text-2xl font-bold text-amber-900 sm:text-4xl">
            Visual/KI‑Editor (Demo)
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-amber-700">
            Hier kannst du die vorhandene <code>/api/edit-story</code> Funktion direkt auf der
            Landingpage testen – ohne Weiterleitung.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div>
                <div className="text-sm font-medium text-amber-900 mb-2">
                  Ausgangstext
                </div>
                <Textarea
                  value={currentStory}
                  onChange={(e) => setCurrentStory(e.target.value)}
                  className="min-h-[220px] bg-white"
                  placeholder="Füge hier einen Text ein, den die KI bearbeiten soll…"
                />
              </div>

              <div>
                <div className="text-sm font-medium text-amber-900 mb-2">
                  Bearbeitungsanweisung
                </div>
                <Textarea
                  value={editingInstructions}
                  onChange={(e) => setEditingInstructions(e.target.value)}
                  className="min-h-[120px] bg-white"
                  placeholder="z.B. „Mach es wärmer, kürzer, mit mehr Körperempfindungen…“"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  onClick={handleEditWithAI}
                  disabled={isEditing || !currentStory.trim() || !editingInstructions.trim()}
                  className="rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 hover:from-amber-500 hover:via-orange-500 hover:to-red-500 text-white"
                >
                  {isEditing ? "Bearbeite…" : "Mit KI bearbeiten"}
                </Button>

                <div className="text-xs text-amber-700">
                  Demo-Ressource: {demoSelectedFigure.emoji} {demoSelectedFigure.name}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-amber-900">
                  Ergebnis
                </div>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={!resultStory.trim()}
                  onClick={() => {
                    setCurrentStory(resultStory);
                    setResultStory("");
                  }}
                >
                  Ergebnis übernehmen
                </Button>
              </div>

              <Textarea
                value={resultStory}
                readOnly
                className="min-h-[360px] bg-white"
                placeholder="Hier erscheint die bearbeitete Geschichte…"
              />
              <div className="text-xs text-amber-700">
                Hinweis: Wenn kein OpenAI‑Key konfiguriert ist, bekommst du hier einen Fehler aus
                der API.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
