import { defineTexts } from "@/lib/site-texts/define";

/** Player: Vollbild-Player, Mini-Leiste, Musikregler, Klopf-Video, Hörprobe-Player. */
export const player = defineTexts("player", {
  // Klopf-Hinweis
  "tapping.title": { text: "Begleite deine Geschichte mit sanftem Klopfen", label: "Klopfen: Überschrift" },
  "tapping.text": {
    text: "Klopfe abwechselnd links und rechts, wie im Video gezeigt. Das kann dir helfen, noch bewusster in die Geschichte einzutauchen.",
    label: "Klopfen: Erklärung",
  },
  "tapping.aria": { text: "Klopfen", label: "Klopfen: Bereich (Screenreader)", multiline: false },
  "tapping.less": { text: "Weniger anzeigen", label: "Klopfen: Erklärung zuklappen", multiline: false },
  "tapping.how": { text: "So geht's", label: "Klopfen: Erklärung aufklappen", multiline: false },
  "tapping.animationAria": { text: "Animation: abwechselnd links und rechts klopfen", label: "Klopf-Animation (Screenreader)", multiline: false },
  "tapping.left": { text: "links", label: "Klopf-Animation: links", multiline: false },
  "tapping.right": { text: "rechts", label: "Klopf-Animation: rechts", multiline: false },
  "tapping.watchVideo": { text: "Video ansehen", label: "Klopf-Video: abspielen (wenn Autoplay blockiert)", multiline: false },
  "tapping.videoAria": {
    text: "Video: Klopfen mit vor der Brust überkreuzten Armen, abwechselnd links und rechts",
    label: "Klopf-Video (Screenreader)",
    multiline: false,
  },

  // Steuerung
  "controls.bar": { text: "Wiedergabe", label: "Steuerleiste (Screenreader)", multiline: false },
  "controls.back15": { text: "15 Sekunden zurück", label: "Knopf zurück (Screenreader)", multiline: false },
  "controls.forward15": { text: "15 Sekunden vor", label: "Knopf vor (Screenreader)", multiline: false },
  "controls.loading": { text: "Wird geladen", label: "Abspielknopf lädt (Screenreader)", multiline: false },
  "controls.pause": { text: "Pause", label: "Abspielknopf Pause (Screenreader)", multiline: false },
  "controls.play": { text: "Abspielen", label: "Abspielknopf Abspielen (Screenreader)", multiline: false },
  "controls.position": { text: "Position in der Geschichte", label: "Fortschrittsregler (Screenreader)", multiline: false },
  "controls.positionValue": {
    text: "{time} von {duration}",
    vars: { time: "aktuelle Zeit", duration: "Gesamtlänge" },
    label: "Fortschrittsregler: Wert (Screenreader)",
    multiline: false,
  },
  "controls.close": { text: "Player schließen", label: "Vollbild-Player schließen (Screenreader)", multiline: false },
  "controls.progressAria": { text: "Wiedergabeposition", label: "Fortschrittsbalken (Screenreader)", multiline: false },

  // Mini-Leiste
  "mini.region": { text: "Laufende Power Story", label: "Mini-Leiste (Screenreader)", multiline: false },
  "mini.open": { text: "{title} – Player öffnen", vars: { title: "Titel der Story" }, label: "Mini-Leiste öffnen (Screenreader)", multiline: false },
  "mini.dismiss": { text: "Wiedergabe beenden und Leiste ausblenden", label: "Mini-Leiste schließen (Screenreader)", multiline: false },
  "media.artist": { text: "Power Storys", label: "Sperrbildschirm: Künstlername", multiline: false },

  // Musik
  "music.label": { text: "Hintergrundmusik", label: "Musik: Beschriftung", multiline: false },
  "music.off": { text: "aus", label: "Musik: Wert aus (Player)", multiline: false },
  "music.unmute": { text: "Hintergrundmusik einschalten", label: "Musik einschalten (Screenreader)", multiline: false },
  "music.mute": { text: "Hintergrundmusik stumm schalten", label: "Musik stumm (Screenreader)", multiline: false },
  "music.volume": { text: "Lautstärke der Hintergrundmusik", label: "Musik-Regler (Screenreader)", multiline: false },
  "music.volumeOff": { text: "Musik aus", label: "Musik-Regler aus (Screenreader)", multiline: false },
  "music.volumeValue": { text: "{percent} Prozent", vars: { percent: "Lautstärke in Prozent" }, label: "Musik-Regler: Wert (Screenreader)", multiline: false },
  "music.settings": { text: "Hintergrundmusik einstellen", label: "Musik-Knopf mobil (Screenreader)", multiline: false },
  "music.short": { text: "Musik", label: "Musik-Knopf mobil", multiline: false },
  "music.note": { text: "Nur die Musik – die Stimme bleibt gleich laut.", label: "Musik: Hinweis" },
  "music.switchOff": { text: "Hintergrundmusik ausschalten", label: "Musik ausschalten (Screenreader, Einstellungen)", multiline: false },
  "music.titleOn": { text: "Musik einschalten", label: "Musik einschalten (Tooltip)", multiline: false },
  "music.titleOff": { text: "Musik ausschalten", label: "Musik ausschalten (Tooltip)", multiline: false },
  "music.valueOff": { text: "Aus", label: "Musik: Wert aus (Einstellungen)", multiline: false },

  // Einfacher Player (Hörprobe auf der Startseite)
  "simple.preparing": { text: "Audio wird vorbereitet", label: "Hörprobe: wird vorbereitet (Screenreader)", multiline: false },
  "simple.loading": { text: "Audio wird geladen", label: "Hörprobe: lädt (Screenreader)", multiline: false },
  "simple.playing": { text: "{title} wird abgespielt", vars: { title: "Titel" }, label: "Hörprobe: läuft (Screenreader)", multiline: false },
  "simple.recording": { text: "Aufnahme", label: "Hörprobe: Titel, falls keiner da ist", multiline: false },
  "simple.paused": { text: "Angehalten", label: "Hörprobe: angehalten (Screenreader)", multiline: false },
  "simple.preparingVisible": { text: "Audio wird für deinen Browser vorbereitet…", label: "Hörprobe: wird vorbereitet" },
});
