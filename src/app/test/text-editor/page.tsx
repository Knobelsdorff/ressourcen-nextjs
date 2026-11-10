"use client";

/*
 * PROTOTYP: Inline-Texteditor für Admins.
 * Aufruf: /test/text-editor
 *
 * - Die Texte unten sind 1:1 die echten Texte (Hero, Stakes, Dashboard-Dialog,
 *   Story-Schritt), eingewickelt in <T k="…">.
 * - "Datenbank" ist in der Demo localStorage – nichts geht an Supabase.
 * - In der Demo ist jeder Besucher "Admin". Im echten Feature prüft der Server
 *   die Admin-E-Mail, und Nicht-Admins laden keinen Editor-Code.
 */

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteTextProvider, useSiteText, useSiteTextContext } from "./_site-text/SiteTextProvider";
import { T } from "./_site-text/T";
import { EditModeBar } from "./_site-text/EditModeBar";
import "@/app/landing.css";

export default function TextEditorDemoPage() {
  return (
    <SiteTextProvider isAdmin>
      <DemoContent />
      <EditModeBar />
    </SiteTextProvider>
  );
}

function DemoContent() {
  const { resetDemo, editMode } = useSiteTextContext();
  const [clicks, setClicks] = useState(0);

  return (
    <div className="wellness-theme landing-theme min-h-screen">
      {/* Demo-Hinweis – nicht Teil des Features */}
      <div className="border-b border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <span>
            <strong>Prototyp Text-Editor.</strong>{" "}
            {editMode
              ? "Fahre über einen Text → Stift → direkt tippen → oben „Speichern“."
              : "Unten links auf „Texte bearbeiten“ klicken."}{" "}
            Gespeichert wird nur in diesem Browser.
          </span>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Alle Demo-Änderungen löschen?")) resetDemo();
            }}
            className="rounded-md border border-sky-300 bg-white px-3 py-1 text-xs font-medium hover:bg-sky-100"
          >
            Demo zurücksetzen
          </button>
        </div>
      </div>

      {/* ── 1. Landing: Hero (echter Text + echte Klassen) ── */}
      <section className="landing-hero flex items-center justify-center lg:px-4">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <h1 className="font-bold">
              <T k="landing.hero.title">Finde innere Ruhe und fühl dich sicher und geborgen</T>
            </h1>
            <p className="landing-hero-lead">
              <T k="landing.hero.lead">
                Erstelle in 2&nbsp;Minuten deine persönliche Audio-Geschichte und erlebe Momente voller Wärme, Halt und Unterstützung.
              </T>
            </p>
            <div className="landing-hero-actions">
              <Button size="lg" className="landing-primary-button" onClick={() => setClicks((c) => c + 1)}>
                <T k="landing.hero.cta">Meine Power Story erstellen</T>
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
            </div>
            <p className="mt-3 text-xs text-amber-700/70">
              (Demo: Button-Klicks gezählt: {clicks} – im Bearbeitungsmodus löst ein Klick auf den Text den Button nicht aus.)
            </p>
          </div>
          <div className="landing-hero-figure">
            <Image
              src="/images/Innere Ruhe aktivieren_Herosection.webp"
              alt=""
              width={900}
              height={900}
              className="h-auto w-full rounded-3xl object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* ── 2. Landing: Stakes ── */}
      <StakesDemo />

      {/* ── 3. Dashboard: Willkommens-Dialog ── */}
      <section className="bg-amber-50/60 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-amber-700/70">Beispiel: Dashboard</p>
          <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-700">
              <Sparkles size={26} />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-amber-900">
              <T k="dashboard.welcome.title">Deine Power Story ist bereit!</T>
            </h2>
            <p className="mb-6 text-amber-800">
              <T k="dashboard.welcome.body" vars={{ name: "Anja" }}>
                {"Hallo {name}, schön, dass du da bist. Nimm dir einen ruhigen Moment und hör dir deine Geschichte in Ruhe an."}
              </T>
            </p>
            <Button size="lg" className="landing-primary-button w-full justify-center">
              <T k="dashboard.welcome.cta">Jetzt anhören</T>
            </Button>
            <p className="mt-4 text-xs text-amber-700/60">
              „{"{name}"}“ ist ein Platzhalter – wird beim Bearbeiten angezeigt und muss erhalten bleiben.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. Story erstellen: Schritt mit Eingabefeld ── */}
      <CreateStoryStepDemo />
    </div>
  );
}

function StakesDemo() {
  const stakes: [string, string][] = [
    ["landing.stakes.bullet1", "Innere Unruhe klingt nicht immer von selbst ab"],
    ["landing.stakes.bullet2", "Selbst freie Momente bringen oft kaum Entlastung"],
    ["landing.stakes.bullet3", "Der Körper bleibt angespannt, auch ohne klaren Anlass"],
    ["landing.stakes.bullet4", "Erholung fühlt sich oft oberflächlich an"],
  ];
  return (
    <section className="landing-section-plain px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center text-4xl font-bold text-amber-900 md:text-5xl">
          <T k="landing.stakes.title">Anspannung bleibt oft länger, als nötig</T>
        </h2>
        <p className="mb-8 text-center text-xl text-amber-700 md:text-2xl lg:mb-12">
          <T k="landing.stakes.subtitle">
            Im Alltag bleibt oft wenig Raum, um kurz innezuhalten und wieder bei sich anzukommen
          </T>
        </p>
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div className="space-y-4">
            {stakes.map(([key, text]) => (
              <div key={key} className="landing-bullet">
                <span />
                <p className="text-lg">
                  <T k={key}>{text}</T>
                </p>
              </div>
            ))}
          </div>
          <Image
            src="/images/Power-Storys_Stakes.webp"
            alt=""
            width={1200}
            height={800}
            className="hidden h-auto w-full rounded-3xl object-cover lg:block"
          />
        </div>
      </div>
    </section>
  );
}

function CreateStoryStepDemo() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "ok">("idle");

  // Texte ohne festen Platz: im Panel "Weitere Texte" editierbar.
  const placeholder = useSiteText("createStory.figure.placeholder", "Eine Figur, ein Thema, eine Idee …", {
    label: "Eingabefeld: Platzhalter",
  });
  const errorText = useSiteText("createStory.figure.errorEmpty", "Bitte gib zuerst eine Figur ein.", {
    label: "Fehlermeldung: leeres Feld",
  });
  const successText = useSiteText("createStory.figure.success", "Schön! {figure} begleitet dich in deiner Geschichte.", {
    label: "Erfolgsmeldung",
    vars: { figure: value || "…" },
  });

  return (
    <section className="landing-section-plain px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-amber-700/70">Beispiel: Story erstellen</p>
        <div className="mx-auto max-w-xl rounded-3xl border border-amber-100 bg-white p-8 shadow-sm">
          <h2 className="mb-2 text-2xl font-bold text-amber-900">
            <T k="createStory.figure.title">Wer soll in deiner Power Story an deiner Seite sein?</T>
          </h2>
          <p className="mb-5 text-amber-800">
            <T k="createStory.figure.help">
              Das kann ein Mensch sein, ein Tier, ein Ort oder etwas, das dir Kraft gibt.
            </T>
          </p>
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setStatus("idle");
            }}
            placeholder={placeholder}
            className="mb-3 w-full rounded-xl border border-amber-200 px-4 py-3 text-amber-900 outline-none focus:border-amber-400"
          />
          {status === "error" && <p className="mb-3 text-sm text-red-600">{errorText}</p>}
          {status === "ok" && <p className="mb-3 text-sm text-green-700">{successText}</p>}
          <Button
            size="lg"
            className="landing-primary-button"
            onClick={() => setStatus(value.trim() ? "ok" : "error")}
          >
            <T k="createStory.figure.next">Weiter</T>
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
