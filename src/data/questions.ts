import { Check, ChevronLeft, ChevronRight, ArrowRight, Eye, Heart, Shield, MessageCircle, Sparkles, Users } from "lucide-react";
import { ResourceFigure } from "@/app/page";
import { getFigureSpecificBlocks, getFigureSpecificQuestion, getFigureSpecificPrompt, getFigureSpecificExample } from "./figureSpecificAnswers";

export const questions = [
  {
    id: 1,
    title: "Äußeres & Ausstrahlung",
    question: "Wie sieht deine Figur aus? Was strahlt sie aus, wenn sie bei dir ist?",
    prompt: "Beschreibe, wie deine Figur aussieht und welche positive Energie sie mitbringt.",
    example: "Sie steht aufrecht mit einem sanften Leuchten und einem warmen, beruhigenden Blick.",
    icon: Eye,
    emoji: "✨",
    blocks: [
      "Groß und stark mit freundlichen, einladenden Augen",
      "Warmes Lächeln, das mir Sicherheit gibt",
      "Strahlende Präsenz, voller Licht und Ruhe",
      "Geerdet und stabil mit offener Haltung",
      "Sanfte Hände und mitfühlender Ausdruck",
      "Trägt einen tiefen inneren Frieden in sich",
      "Schaut mich an, als würde ich wirklich zählen"
    ]
  },
  {
    id: 2,
    title: "Innere Reaktion auf ihre Nähe",
    question: "Wie fühlst du dich innerlich, wenn diese Figur in deiner Nähe ist?",
    prompt: "Beschreibe die positiven Empfindungen und Gefühle, die du in ihrer Nähe spürst.",
    example: "Ich fühle mich tief entspannt, sicher und getragen.",
    icon: Heart,
    emoji: "💖",
    blocks: [
      "Tief entspannt und geborgen",
      "Wirklich geliebt und willkommen so wie ich bin",
      "Wärme und Geborgenheit in mir",
      "Entspannt, offen und frei",
      "Ein echtes Gefühl von Zugehörigkeit",
      "Stabil und in jedem Moment unterstützt",
      "Vollständigkeit und Harmonie in mir"
    ]
  },
  {
    id: 3,
    title: "Reaktion in schwierigen Momenten",
    question: "Wie unterstützt dich deine Figur, wenn du Schmerz, Angst oder Überforderung spürst?",
    prompt: "Beschreibe die fürsorglichen Handlungen, die sie tut, um dich zu trösten.",
    example: "Sie nimmt mich in den Arm und beruhigt mich sanft.",
    icon: Shield,
    emoji: "🤗",
    blocks: [
      "Hält mich sanft mit Wärme und Fürsorge",
      "Bleibt nah und teilt meinen Atem",
      "Hält meine Hand und spendet Trost",
      "Hüllt mich in schützendes Licht",
      "Sitzt neben mir, ganz präsent",
      "Hilft mir, mich im Körper zu verankern",
      "Flüstert sanfte Worte, bis ich mich entspanne"
    ]
  },
  {
    id: 4,
    title: "Geteilte Erlebnisse / Körperliche Nähe",
    question: "Welche freudige oder beruhigende Aktivität teilt ihr miteinander?",
    prompt: "Beschreibe ein positives gemeinsames Erlebnis und eure körperliche Nähe.",
    example: "Wir liegen gemeinsam im Gras und schauen in den Himmel.",
    icon: Users,
    emoji: "🫂",
    blocks: [
      "Wir kuscheln still und fühlen uns verbunden",
      "Ich erkunde die Natur auf ihrem Rücken mit Freiheit",
      "Sie streichelt mein Haar, während ich friedlich ruhe",
      "Wir halten Händchen und gehen im Einklang",
      "Wir singen leise Melodien nebeneinander",
      "Wir sitzen Schulter an Schulter in Geborgenheit",
      "Sie umarmt mich mit einem sanften Lächeln"
    ]
  },
  {
    id: 5,
    title: "Dein persönlicher Wunsch / Bitte",
    question: "Welche Unterstützung oder Fürsorge wünschst du dir von dieser Figur?",
    prompt: "Formuliere, was du dir von ihr wünschst.",
    example: "Bitte erinnere mich an meinen Wert und beschütze mich.",
    icon: MessageCircle,
    emoji: "🙏",
    blocks: [
      "Bleibe immer nah mit deiner Liebe",
      "Hilf mir, mich jeden Tag liebenswert zu fühlen",
      "Halte mich sicher und geborgen",
      "Erinnere mich an meinen inneren Wert",
      "Sei eine konstante Präsenz, wenn ich dich brauche",
      "Schenke mir Trost in schwierigen Zeiten",
      "Führe mich zu Vertrauen und Unterstützung"
    ]
  },
  {
    id: 6,
    title: "Worte der Figur an dich",
    question: "Welche tröstenden oder stärkenden Worte sagt dir deine Figur?",
    prompt: "Teile die positiven Bestärkungen und unterstützenden Sätze, die sie dir sagt.",
    example: "Du bist geliebt und wertvoll, so wie du bist.",
    icon: Sparkles,
    emoji: "💬",
    blocks: [
      "Du bist bei mir sicher und geliebt.",
      "Du bist genau so geliebt, wie du bist.",
      "Ich bleibe immer an deiner Seite.",
      "Du bist stark, fähig und wunderschön.",
      "Ich glaube fest an dich.",
      "Es ist okay, alle deine Gefühle zu spüren.",
      "Ich bin stolz auf dich in jedem Moment."
    ]
  },
  {
    id: 7,
    title: "Persönlicher Name",
    question: "Wie soll dich deine Ressource nennen?",
    prompt: "Gib deinen Namen ein, damit deine Ressource dich persönlich ansprechen kann.",
    example: "Markus, ich bin immer gerne für dich da und werde dich immer beschützen.",
    icon: Users,
    emoji: "👤",
    blocks: [
      "Dein Vorname",
      "Dein Spitzname", 
      "Ein besonderer Name",
      "Wie du gerne genannt werden möchtest"
    ]
  }
];

// Funktion zur Anpassung der Fragen mit den korrekten Pronomen und figurspezifischen Antworten
export function getQuestionsWithPronouns(selectedFigure: ResourceFigure) {
  const primaryPronoun = selectedFigure.pronouns.split('/')[0];
  const objectPronoun = selectedFigure.pronouns.split('/')[1];
  
  // Filtere Fragen basierend auf der Ressourcen-Kategorie
  const filteredQuestions = questions.filter(question => {
    // Frage 7 (Namensabfrage) nur bei Personen, nicht bei Orten
    if (question.id === 7) {
      return selectedFigure.category !== 'place';
    }
    return true;
  });
  
  return filteredQuestions.map(question => {
    const adjustedQuestion = { ...question };
    
    // Hole figurspezifische Daten für diese Frage
    const figureSpecificBlocks = getFigureSpecificBlocks(selectedFigure.id, question.id);
    const figureSpecificQuestion = getFigureSpecificQuestion(selectedFigure.id, question.id);
    const figureSpecificPrompt = getFigureSpecificPrompt(selectedFigure.id, question.id);
    const figureSpecificExample = getFigureSpecificExample(selectedFigure.id, question.id);
    
    // Verwende figurspezifische Antworten oder kombiniere mit Standard-Antworten
    if (figureSpecificBlocks.length > 0) {
      adjustedQuestion.blocks = figureSpecificBlocks;
    } else {
      // Fallback: Kombiniere figurspezifische Antworten mit Standard-Antworten
      const combinedBlocks = [
        ...figureSpecificBlocks,
        ...question.blocks
      ];
      const uniqueBlocks = Array.from(new Set(combinedBlocks)).slice(0, 7);
      adjustedQuestion.blocks = uniqueBlocks;
    }
    
    // Verwende figurspezifische Fragen, Prompts und Beispiele wenn verfügbar
    if (figureSpecificQuestion) {
      adjustedQuestion.question = figureSpecificQuestion;
    } else {
      // Fallback: Anpasse die Frage basierend auf der Figur
      switch (question.id) {
        case 1:
          adjustedQuestion.question = `Wie sieht ${primaryPronoun} aus? Was strahlt ${primaryPronoun} aus, wenn ${primaryPronoun} bei dir ist?`;
          break;
        case 2:
          adjustedQuestion.question = `Wie fühlst du dich innerlich, wenn ${primaryPronoun} in deiner Nähe ist?`;
          break;
        case 3:
          adjustedQuestion.question = `Wie unterstützt dich ${primaryPronoun}, wenn du Schmerz, Angst oder Überforderung spürst?`;
          break;
        case 4:
          adjustedQuestion.question = `Welche freudige oder beruhigende Aktivität teilt ihr miteinander?`;
          break;
        case 5:
          adjustedQuestion.question = `Welche Unterstützung oder Fürsorge wünschst du dir von ${objectPronoun}?`;
          break;
        case 6:
          adjustedQuestion.question = `Welche tröstenden oder stärkenden Worte sagt dir ${primaryPronoun}?`;
          break;
      }
    }
    
    if (figureSpecificPrompt) {
      adjustedQuestion.prompt = figureSpecificPrompt;
    } else {
      // Fallback: Anpasse den Prompt basierend auf der Figur
      switch (question.id) {
        case 3:
          adjustedQuestion.prompt = `Beschreibe die fürsorglichen Handlungen, die ${primaryPronoun} tut, um dich zu trösten.`;
          break;
        case 4:
          adjustedQuestion.prompt = `Beschreibe ein positives gemeinsames Erlebnis und eure körperliche Nähe.`;
          break;
        case 5:
          adjustedQuestion.prompt = `Formuliere, was du dir von ${objectPronoun} wünschst.`;
          break;
        case 6:
          adjustedQuestion.prompt = `Teile die positiven Bestärkungen und unterstützenden Sätze, die ${primaryPronoun} dir sagt.`;
          break;
      }
    }
    
    if (figureSpecificExample) {
      adjustedQuestion.example = figureSpecificExample;
    } else {
      // Fallback: Anpasse das Beispiel basierend auf der Figur
      switch (question.id) {
        case 1:
          adjustedQuestion.example = `${primaryPronoun.charAt(0).toUpperCase() + primaryPronoun.slice(1)} steht aufrecht mit einem sanften Leuchten und einem warmen, beruhigenden Blick.`;
          break;
        case 3:
          adjustedQuestion.example = `${primaryPronoun.charAt(0).toUpperCase() + primaryPronoun.slice(1)} nimmt mich in den Arm und beruhigt mich sanft.`;
          break;
        case 4:
          adjustedQuestion.example = `Wir liegen gemeinsam im Gras und schauen in den Himmel.`;
          break;
        case 5:
          adjustedQuestion.example = `Bitte erinnere mich an meinen Wert und beschütze mich.`;
          break;
        case 6:
          adjustedQuestion.example = `Du bist geliebt und wertvoll, so wie du bist.`;
          break;
      }
    }
    
    // Ersetze problematische/irreführende Formulierungen global durch traumasensible Alternativen
    if (Array.isArray(adjustedQuestion.blocks)) {
      adjustedQuestion.blocks = adjustedQuestion.blocks.map((block) => {
        if (block === "Du wirst deinen Weg finden") {
          return "Ich traue dir zu, deinen Weg zu gehen – und ich begleite dich.";
        }
        if (block === "Du bist mein größtes Glück") {
          return "Ich halte dich, auch wenn es schwer wird. Du musst das nicht alleine tragen.";
        }
        return block;
      });
    }

    return adjustedQuestion;
  });
}
