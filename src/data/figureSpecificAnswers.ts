import { ResourceFigure } from '@/app/page';

export interface FigureSpecificData {
  [figureId: string]: {
    [questionId: number]: {
      blocks: string[];
      question?: string;
      prompt?: string;
      example?: string;
    };
  };
}

// Funktion um Antworten mit Namen zu personalisieren
export function personalizeAnswers(blocks: string[], userName: string): string[] {
  if (!userName || userName.trim().length === 0) {
    return blocks;
  }
  
  return blocks.map(block => 
    block.replace(/\bdu\b/g, userName)
         .replace(/\bdir\b/g, `${userName}`)
         .replace(/\bdich\b/g, `${userName}`)
         .replace(/\bdein\b/g, `${userName}s`)
         .replace(/\bdeine\b/g, `${userName}s`)
         .replace(/\bdeiner\b/g, `${userName}s`)
         .replace(/\bdeines\b/g, `${userName}s`)
         .replace(/\bdeinem\b/g, `${userName}s`)
         .replace(/\bdeinen\b/g, `${userName}s`)
  );
}

// Figurspezifische Antworten und Fragen für jede Figur
export const figureSpecificData: FigureSpecificData = {
  // REAL FIGURES
  'grandma': {
    1: {
      question: "Wie wirkt sie und was strahlt sie aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung deiner Oma.",
      example: "Sie hat weise Augen und strahlt eine tiefe Geborgenheit aus.",
      blocks: [
        "Weise Augen voller Lebenserfahrung und Liebe",
        "Warmherzige, mütterliche Ausstrahlung",
        "Sanfte, gebrechliche aber starke Präsenz",
        "Faltige, liebevolle Hände, die mich beschützen",
        "Graue Haare und ein versöhnliches Lächeln",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn sie nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe deiner Oma.",
      example: "Ich fühle mich vollständig geborgen und geliebt.",
      blocks: [
        "Tief entspannt und geborgen wie in ihrer Umarmung",
        "Wirklich geliebt und willkommen so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Entspannt, offen und frei",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht sie, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie deine Oma dich in schwierigen Momenten unterstützt.",
      example: "Sie nimmt mich in den Arm und streichelt sanft mein Haar.",
      blocks: [
        "Sie nimmt mich in den Arm und streichelt sanft mein Haar",
        "Sie backt mir meine Lieblingskekse",
        "Sie erzählt mir Geschichten aus ihrer Kindheit",
        "Sie hält meine Hand und hört mir zu",
        "Sie macht mir einen warmen Tee",
        "Sie umarmt mich fest und flüstert tröstende Worte",
        "Sie sitzt einfach neben mir und ist da"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihr geliebt fühlen?",
      prompt: "Beschreibe, was deine Oma tut, um dir ihre Liebe zu zeigen.",
      example: "Sie umarmt mich fest und sagt mir, wie wichtig ich ihr bin.",
      blocks: [
        "Sie umarmt mich fest und sagt mir, wie wichtig ich ihr bin",
        "Sie backt mir meine Lieblingskekse ohne Grund",
        "Sie hört mir geduldig zu, wenn ich reden möchte",
        "Sie erinnert sich an alle wichtigen Dinge in meinem Leben",
        "Sie macht sich Sorgen um mich und kümmert sich",
        "Sie ist stolz auf mich, egal was ich tue",
        "Sie akzeptiert mich so, wie ich bin"
      ]
    },
    5: {
      question: "Um was würdest du sie bitten?",
      prompt: "Formuliere, was du dir von deiner Oma wünschst.",
      example: "Bitte bleib immer so liebevoll und geduldig mit mir.",
      blocks: [
        "Bleib immer so liebevoll und geduldig mit mir",
        "Erzähl mir weiterhin deine Geschichten",
        "Sei immer da, wenn ich dich brauche",
        "Erinnere mich an die wichtigen Dinge im Leben",
        "Schenk mir weiterhin deine Weisheit",
        "Bleib gesund und stark",
        "Lass mich immer bei dir willkommen sein"
      ]
    },
    6: {
      question: "Was würde sie dir idealerweise sagen?",
      prompt: "Teile die liebevollen Sätze, die deine Oma dir sagen würde.",
      example: "Du bist mein Schatz und ich liebe dich so wie du bist.",
      blocks: [
        "Du bist mein Schatz und ich liebe dich so wie du bist",
        "Du wirst das schaffen, ich glaube an dich",
        "Du bist genau richtig, so wie du bist",
        "Ich bin immer für dich da, egal was passiert",
        "Du bist wunderschön, innen und außen",
        "Ich bin so stolz auf dich, mein Liebling",
        "Du bist mein größtes Glück"
      ]
    }
  },

  'grandpa': {
    1: {
      question: "Wie wirkt er und was strahlt er aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung deines Opas.",
      example: "Er hat weise Augen und strahlt eine tiefe Stabilität aus.",
      blocks: [
        "Starke, weise Hände voller Lebenserfahrung",
        "Gütige Augen, die viel gesehen haben",
        "Ruhige, stabile Präsenz",
        "Väterliche Weisheit und Kraft",
        "Graue Haare und ein weises Lächeln",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn er nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe deines Opas.",
      example: "Ich fühle mich sicher und beschützt.",
      blocks: [
        "Tief entspannt und geborgen in seiner Nähe",
        "Wirklich geliebt und willkommen so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Entspannt, offen und frei",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht er, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie dein Opa dich in schwierigen Momenten unterstützt.",
      example: "Er nimmt mich in den Arm und gibt mir das Gefühl von Sicherheit.",
      blocks: [
        "Er nimmt mich in den Arm und gibt mir Sicherheit",
        "Er erklärt mir, dass alles gut wird",
        "Er zeigt mir, wie man stark bleibt",
        "Er gibt mir praktische Ratschläge",
        "Er ist einfach da und gibt mir Kraft",
        "Er macht mir Mut, mich zu wehren",
        "Er erzählt mir Geschichten von früher"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihm geliebt fühlen?",
      prompt: "Beschreibe, was dein Opa tut, um dir seine Liebe zu zeigen.",
      example: "Er ist stolz auf mich und zeigt es mir jeden Tag.",
      blocks: [
        "Er ist stolz auf mich und zeigt es mir jeden Tag",
        "Er hört mir geduldig zu und gibt mir Ratschläge",
        "Er beschützt mich vor allen Gefahren",
        "Er zeigt mir, wie man stark und mutig ist",
        "Er erinnert sich an alle wichtigen Dinge in meinem Leben",
        "Er akzeptiert mich so, wie ich bin",
        "Er ist immer da, wenn ich ihn brauche"
      ]
    },
    5: {
      question: "Um was würdest du ihn bitten?",
      prompt: "Formuliere, was du dir von deinem Opa wünschst.",
      example: "Bitte bleib immer so weise und beschützend.",
      blocks: [
        "Bleib immer so weise und beschützend",
        "Sei immer da, wenn ich dich brauche",
        "Erzähl mir weiterhin deine Geschichten",
        "Zeig mir weiterhin, wie man stark ist",
        "Bleib gesund und stark",
        "Lass mich immer bei dir willkommen sein",
        "Schenk mir weiterhin deine Weisheit"
      ]
    },
    6: {
      question: "Was würde er dir idealerweise sagen?",
      prompt: "Teile die weisen Sätze, die dein Opa dir sagen würde.",
      example: "Du bist stark und du schaffst das.",
      blocks: [
        "Du bist stark und du schaffst das",
        "Ich bin so stolz auf dich",
        "Ich werde dich immer lieben, egal was ist.",
        "Du bist genau richtig, so wie du bist",
        "Ich bin immer für dich da",
        "Ich traue dir zu, deinen Weg zu gehen – und ich begleite dich.",
        "Du bist mein größtes Glück"
      ]
    }
  },

  'mom': {
    1: {
      question: "Wie wirkt sie und was strahlt sie aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung deiner Mama.",
      example: "Sie hat warme Augen und strahlt eine tiefe mütterliche Liebe aus.",
      blocks: [
        "Warme, liebevolle Augen",
        "Sanfte, mütterliche Hände",
        "Beruhigende, melodische Stimme",
        "Mütterliche Geborgenheit und Wärme",
        "Tröstende, verständnisvolle Ausstrahlung",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn sie nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe deiner Mama.",
      example: "Ich fühle mich vollständig geliebt und geborgen.",
      blocks: [
        "Tief entspannt und geborgen in ihrer Nähe",
        "Wirklich geliebt und willkommen so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Entspannt, offen und frei",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht sie, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie deine Mama dich in schwierigen Momenten unterstützt.",
      example: "Sie nimmt mich in den Arm und streichelt sanft mein Haar.",
      blocks: [
        "Sie nimmt mich in den Arm und streichelt mein Haar",
        "Sie macht mir mein Lieblingsessen",
        "Sie hört mir geduldig zu",
        "Sie umarmt mich fest und flüstert tröstende Worte",
        "Sie macht mir einen warmen Tee",
        "Sie sitzt einfach neben mir und ist da",
        "Sie gibt mir praktische Ratschläge"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihr geliebt fühlen?",
      prompt: "Beschreibe, was deine Mama tut, um dir ihre Liebe zu zeigen.",
      example: "Sie umarmt mich fest und sagt mir, wie wichtig ich ihr bin.",
      blocks: [
        "Sie umarmt mich fest und sagt mir, wie wichtig ich ihr bin",
        "Sie macht mir mein Lieblingsessen ohne Grund",
        "Sie hört mir geduldig zu, wenn ich reden möchte",
        "Sie erinnert sich an alle wichtigen Dinge in meinem Leben",
        "Sie macht sich Sorgen um mich und kümmert sich",
        "Sie ist stolz auf mich, egal was ich tue",
        "Sie akzeptiert mich so, wie ich bin"
      ]
    },
    5: {
      question: "Um was würdest du sie bitten?",
      prompt: "Formuliere, was du dir von deiner Mama wünschst.",
      example: "Bitte bleib immer so liebevoll und verständnisvoll.",
      blocks: [
        "Bleib immer so liebevoll und verständnisvoll",
        "Sei immer da, wenn ich dich brauche",
        "Verstehe mich weiterhin so gut",
        "Erinnere mich an meinen Wert",
        "Schenk mir weiterhin deine Liebe",
        "Bleib gesund und glücklich",
        "Lass mich immer bei dir willkommen sein"
      ]
    },
    6: {
      question: "Was würde sie dir idealerweise sagen?",
      prompt: "Teile die liebevollen Sätze, die deine Mama dir sagen würde.",
      example: "Du bist mein Schatz und ich liebe dich bedingungslos.",
      blocks: [
        "Du bist mein Schatz und ich liebe dich bedingungslos",
        "Du bist genau richtig, so wie du bist",
        "Ich bin immer für dich da",
        "Ich bin so stolz auf dich",
        "Du bist wunderschön, innen und außen",
        "Ich glaube an dich",
        "Du bist mein größtes Glück"
      ]
    }
  },

  'dad': {
    1: {
      question: "Wie wirkt er und was strahlt er aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung deines Papas.",
      example: "Er hat starke Augen und strahlt eine tiefe väterliche Kraft aus.",
      blocks: [
        "Starke, beschützende Hände",
        "Ein sicherer Blick, der mich stärkt",
        "Feste, aber sanfte Stimme",
        "Väterliche Kraft und Stabilität",
        "Starke Schultern, die mich tragen",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn er nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe deines Papas.",
      example: "Ich fühle mich sicher und beschützt.",
      blocks: [
        "Tief entspannt und geborgen in seiner Nähe",
        "Wirklich geliebt und willkommen so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Entspannt, offen und frei",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht er, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie dein Papa dich in schwierigen Momenten unterstützt.",
      example: "Er nimmt mich in den Arm und gibt mir das Gefühl von Sicherheit.",
      blocks: [
        "Er nimmt mich in den Arm und gibt mir Sicherheit",
        "Er steht vor mir und beschützt mich",
        "Er erklärt mir, dass alles gut wird",
        "Er zeigt mir, wie man stark bleibt",
        "Er gibt mir praktische Lösungen",
        "Er ist einfach da und gibt mir Kraft",
        "Er macht mir Mut, mich zu wehren"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihm geliebt fühlen?",
      prompt: "Beschreibe, was dein Papa tut, um dir seine Liebe zu zeigen.",
      example: "Er ist stolz auf mich und zeigt es mir jeden Tag.",
      blocks: [
        "Er ist stolz auf mich und zeigt es mir jeden Tag",
        "Er beschützt mich vor allen Gefahren",
        "Er hört mir geduldig zu und gibt mir Ratschläge",
        "Er zeigt mir, wie man stark und mutig ist",
        "Er erinnert sich an alle wichtigen Dinge in meinem Leben",
        "Er akzeptiert mich so, wie ich bin",
        "Er ist immer da, wenn ich ihn brauche"
      ]
    },
    5: {
      question: "Um was würdest du ihn bitten?",
      prompt: "Formuliere, was du dir von deinem Papa wünschst.",
      example: "Bitte bleib immer so stark und beschützend.",
      blocks: [
        "Bleib immer so stark und beschützend",
        "Sei immer da, wenn ich dich brauche",
        "Zeig mir weiterhin, wie man stark ist",
        "Erkläre mir weiterhin die Welt",
        "Bleib gesund und stark",
        "Lass mich immer bei dir willkommen sein",
        "Sei weiterhin mein Vorbild"
      ]
    },
    6: {
      question: "Was würde er dir idealerweise sagen?",
      prompt: "Teile die kraftvollen Sätze, die dein Papa dir sagen würde.",
      example: "Du bist stark und du schaffst das.",
      blocks: [
        "Du bist stark und du schaffst das",
        "Ich bin so stolz auf dich",
        "Ich werde dich immer lieben, egal was ist.",
        "Du bist genau richtig, so wie du bist",
        "Ich bin immer für dich da",
        "Ich traue dir zu, deinen Weg zu gehen – und ich begleite dich.",
        "Du bist mein größtes Glück"
      ]
    }
  },

  'partner': {
    1: {
      question: "Wie wirkt er/sie und was strahlt er/sie aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung deines Partners/deiner Partnerin.",
      example: "Er/sie hat warme, liebevolle Augen und strahlt eine tiefe Verbundenheit aus.",
      blocks: [
        "Warme, liebevolle Augen voller Verständnis",
        "Sanfte, vertraute Ausstrahlung",
        "Weiche, tröstende Hände",
        "Beruhigende, vertraute Stimme",
        "Tiefe Verbundenheit und Wärme",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn er/sie nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe deines Partners/deiner Partnerin.",
      example: "Ich fühle mich vollständig geliebt und verstanden.",
      blocks: [
        "Vollständig geliebt und verstanden",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht er/sie, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie dein Partner/deine Partnerin dich in schwierigen Momenten unterstützt.",
      example: "Er/sie nimmt mich in den Arm und flüstert tröstende Worte.",
      blocks: [
        "Er/sie nimmt mich in den Arm und flüstert tröstende Worte",
        "Er/sie streichelt sanft mein Haar",
        "Er/sie hält mich fest und gibt mir Sicherheit",
        "Er/sie macht mir einen warmen Tee",
        "Er/sie hört mir geduldig zu",
        "Er/sie umarmt mich und lässt mich weinen",
        "Er/sie ist einfach da und gibt mir Kraft"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihm/ihr geliebt fühlen?",
      prompt: "Beschreibe, was dein Partner/deine Partnerin tut, um dir seine/ihre Liebe zu zeigen.",
      example: "Er/sie umarmt mich fest und sagt mir, wie wichtig ich bin.",
      blocks: [
        "Er/sie umarmt mich fest und sagt mir, wie wichtig ich bin",
        "Er/sie hört mir geduldig zu, wenn ich reden möchte",
        "Er/sie erinnert sich an alle wichtigen Dinge in meinem Leben",
        "Er/sie macht sich Sorgen um mich und kümmert sich",
        "Er/sie ist stolz auf mich, egal was ich tue",
        "Er/sie akzeptiert mich so, wie ich bin",
        "Er/sie ist immer da, wenn ich ihn/sie brauche"
      ]
    },
    5: {
      question: "Um was würdest du ihn/sie bitten?",
      prompt: "Formuliere, was du dir von deinem Partner/deiner Partnerin wünschst.",
      example: "Bitte bleib immer so liebevoll und verständnisvoll.",
      blocks: [
        "Bleib immer so liebevoll und verständnisvoll",
        "Sei immer da, wenn ich dich brauche",
        "Verstehe mich weiterhin so gut",
        "Erinnere mich an meinen Wert",
        "Schenk mir weiterhin deine bedingungslose Liebe",
        "Bleib gesund und glücklich",
        "Lass mich immer bei dir willkommen sein"
      ]
    },
    6: {
      question: "Was würde er/sie dir idealerweise sagen?",
      prompt: "Teile die liebevollen Sätze, die dein Partner/deine Partnerin dir sagen würde.",
      example: "Du bist mein Schatz und ich liebe dich bedingungslos.",
      blocks: [
        "Du bist mein Schatz und ich liebe dich bedingungslos",
        "Du bist genau richtig, so wie du bist",
        "Ich bin immer für dich da, egal was passiert",
        "Ich halte dich, auch wenn es schwer wird. Du musst das nicht alleine tragen.",
        "Du bist wunderschön, innen und außen",
        "Ich glaube fest an dich",
        "Du bist mein bester Freund"
      ]
    }
  },

  'best-friend': {
    1: {
      question: "Wie wirkt er/sie und was strahlt er/sie aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung deines besten Freundes/deiner besten Freundin.",
      example: "Er/sie hat freundliche, verständnisvolle Augen und strahlt eine tiefe Freundschaft aus.",
      blocks: [
        "Freundliche, verständnisvolle Augen",
        "Offene, einladende Ausstrahlung",
        "Warme, vertraute Hände",
        "Lachende, fröhliche Stimme",
        "Tiefe Freundschaft und Vertrauen",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn er/sie nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe deines besten Freundes/deiner besten Freundin.",
      example: "Ich fühle mich vollständig verstanden und akzeptiert.",
      blocks: [
        "Vollständig verstanden und akzeptiert",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht er/sie, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie dein bester Freund/deine beste Freundin dich in schwierigen Momenten unterstützt.",
      example: "Er/sie hört mir zu und gibt mir praktische Ratschläge.",
      blocks: [
        "Er/sie hört mir geduldig zu",
        "Er/sie gibt mir praktische Ratschläge",
        "Er/sie macht mich zum Lachen",
        "Er/sie umarmt mich und gibt mir Kraft",
        "Er/sie lenkt mich ab mit lustigen Geschichten",
        "Er/sie ist einfach da und unterstützt mich",
        "Er/sie erinnert mich an meine Stärken"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihm/ihr geliebt fühlen?",
      prompt: "Beschreibe, was dein bester Freund/deine beste Freundin tut, um dir seine/ihre Freundschaft zu zeigen.",
      example: "Er/sie ist immer da, wenn ich ihn/sie brauche.",
      blocks: [
        "Er/sie ist immer da, wenn ich ihn/sie brauche",
        "Er/sie hört mir geduldig zu, wenn ich reden möchte",
        "Er/sie erinnert mich an meine Stärken",
        "Er/sie macht sich Sorgen um mich und kümmert sich",
        "Er/sie ist stolz auf mich, egal was ich tue",
        "Er/sie akzeptiert mich so, wie ich bin",
        "Er/sie vertraut mir vollkommen"
      ]
    },
    5: {
      question: "Um was würdest du ihn/sie bitten?",
      prompt: "Formuliere, was du dir von deinem besten Freund/deiner besten Freundin wünschst.",
      example: "Bitte bleib immer so verständnisvoll und loyal.",
      blocks: [
        "Bleib immer so verständnisvoll und loyal",
        "Sei immer da, wenn ich dich brauche",
        "Verstehe mich weiterhin so gut",
        "Erinnere mich an meine Stärken",
        "Schenk mir weiterhin deine Freundschaft",
        "Bleib gesund und glücklich",
        "Lass mich immer bei dir willkommen sein"
      ]
    },
    6: {
      question: "Was würde er/sie dir idealerweise sagen?",
      prompt: "Teile die motivierenden Sätze, die dein bester Freund/deine beste Freundin dir sagen würde.",
      example: "Du bist stark und du schaffst das, ich glaube an dich.",
      blocks: [
        "Du bist stark und du schaffst das",
        "Ich glaube fest an dich",
        "Du bist genau richtig, so wie du bist",
        "Ich bin immer für dich da",
        "Du bist mein größtes Glück",
        "Ich traue dir zu, deinen Weg zu gehen – und ich begleite dich.",
        "Du bist mein bester Freund"
      ]
    }
  },

  'teacher': {
    1: {
      question: "Wie wirkt er/sie und was strahlt er/sie aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung deines Lieblingslehrers/deiner Lieblingslehrerin.",
      example: "Er/sie hat weise, ermutigende Augen und strahlt eine tiefe Weisheit aus.",
      blocks: [
        "Weise, ermutigende Augen",
        "Sanfte, lehrende Ausstrahlung",
        "Warme, unterstützende Hände",
        "Beruhigende, erklärende Stimme",
        "Tiefe Weisheit und Geduld",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn er/sie nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe deines Lieblingslehrers/deiner Lieblingslehrerin.",
      example: "Ich fühle mich verstanden und ermutigt.",
      blocks: [
        "Verstanden und ermutigt",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht er/sie, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie dein Lieblingslehrer/deine Lieblingslehrerin dich in schwierigen Momenten unterstützt.",
      example: "Er/sie erklärt mir geduldig und gibt mir das Gefühl, dass ich es schaffen kann.",
      blocks: [
        "Er/sie erklärt mir geduldig",
        "Er/sie gibt mir das Gefühl, dass ich es schaffen kann",
        "Er/sie hört mir zu und versteht mich",
        "Er/sie ermutigt mich, nicht aufzugeben",
        "Er/sie zeigt mir neue Perspektiven",
        "Er/sie ist einfach da und unterstützt mich",
        "Er/sie erinnert mich an meine Fähigkeiten"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihm/ihr geliebt fühlen?",
      prompt: "Beschreibe, was dein Lieblingslehrer/deine Lieblingslehrerin tut, um dir seine/ihre Unterstützung zu zeigen.",
      example: "Er/sie glaubt an mich und zeigt es mir jeden Tag.",
      blocks: [
        "Er/sie glaubt an mich und zeigt es mir jeden Tag",
        "Er/sie hört mir geduldig zu und versteht mich",
        "Er/sie erinnert mich an meine Fähigkeiten",
        "Er/sie macht sich Sorgen um mich und kümmert sich",
        "Er/sie ist stolz auf mich, egal was ich tue",
        "Er/sie akzeptiert mich so, wie ich bin",
        "Er/sie ist immer da, wenn ich ihn/sie brauche"
      ]
    },
    5: {
      question: "Um was würdest du ihn/sie bitten?",
      prompt: "Formuliere, was du dir von deinem Lieblingslehrer/deiner Lieblingslehrerin wünschst.",
      example: "Bitte bleib immer so geduldig und ermutigend.",
      blocks: [
        "Bleib immer so geduldig und ermutigend",
        "Sei immer da, wenn ich dich brauche",
        "Verstehe mich weiterhin so gut",
        "Erinnere mich an meine Fähigkeiten",
        "Schenk mir weiterhin deine Weisheit",
        "Bleib gesund und glücklich",
        "Lass mich immer bei dir willkommen sein"
      ]
    },
    6: {
      question: "Was würde er/sie dir idealerweise sagen?",
      prompt: "Teile die motivierenden Sätze, die dein Lieblingslehrer/deine Lieblingslehrerin dir sagen würde.",
      example: "Du hast so viel Potenzial und ich glaube fest an dich.",
      blocks: [
        "Du hast so viel Potenzial",
        "Ich glaube fest an dich",
        "Du bist genau richtig, so wie du bist",
        "Ich werde dich immer lieben, egal was ist.",
        "Ich bin so stolz auf dich",
        "Du wirst deinen Weg finden",
        "Du bist mein größtes Glück"
      ]
    }
  },

  'pet-cat': {
    1: {
      question: "Wie wirkt sie und was strahlt sie aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung deiner Katze.",
      example: "Sie hat sanfte, grüne Augen und strahlt eine ruhige Gelassenheit aus.",
      blocks: [
        "Sanfte, grüne Augen voller Weisheit",
        "Weiches, warmes Fell",
        "Anmutige, elegante Bewegungen",
        "Ruhige, gelassene Ausstrahlung",
        "Tröstende, beruhigende Präsenz",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn sie nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe deiner Katze.",
      example: "Ich fühle mich ruhig und entspannt.",
      blocks: [
        "Ruhig und entspannt",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht sie, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie deine Katze dich in schwierigen Momenten tröstet.",
      example: "Sie kommt zu mir und schnurrt sanft in meiner Nähe.",
      blocks: [
        "Sie kommt zu mir und schnurrt sanft",
        "Sie liegt eng an mir und wärmt mich",
        "Sie reibt sich sanft an mir",
        "Sie schaut mich mit verständnisvollen Augen an",
        "Sie sitzt einfach neben mir",
        "Sie lässt mich sie streicheln",
        "Sie ist einfach da und gibt mir Ruhe"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihr geliebt fühlen?",
      prompt: "Beschreibe, was deine Katze tut, um dir ihre Liebe zu zeigen.",
      example: "Sie vertraut mir vollkommen und zeigt es mir jeden Tag.",
      blocks: [
        "Sie vertraut mir vollkommen und zeigt es mir jeden Tag",
        "Sie kommt zu mir, wenn ich traurig bin",
        "Sie lässt mich sie streicheln und schnurrt dabei",
        "Sie erinnert mich an die wichtigen Dinge im Leben",
        "Sie macht sich Sorgen um mich und kümmert sich",
        "Sie ist stolz darauf, meine Katze zu sein",
        "Sie akzeptiert mich so, wie ich bin"
      ]
    },
    5: {
      question: "Um was würdest du sie bitten?",
      prompt: "Formuliere, was du dir von deiner Katze wünschst.",
      example: "Bleib immer so ruhig und tröstend.",
      blocks: [
        "Bleib immer so ruhig und tröstend",
        "Sei immer da, wenn ich dich brauche",
        "Schenk mir weiterhin deine Gelassenheit",
        "Bleib gesund und glücklich",
        "Lass mich immer bei dir willkommen sein",
        "Bleib so anmutig und weise",
        "Lass mich immer dein Freund sein"
      ]
    },
    6: {
      question: "Was würde sie dir idealerweise sagen?",
      prompt: "Stelle dir vor, was deine Katze dir sagen würde.",
      example: "Du bist mein Mensch und ich vertraue dir vollkommen.",
      blocks: [
        "Du bist mein Mensch",
        "Ich vertraue dir vollkommen",
        "Ich bin immer für dich da",
        "Ich halte dich, auch wenn es schwer wird. Du musst das nicht alleine tragen.",
        "Ich fühle mich sicher bei dir",
        "Du bist mein Zuhause",
        "Ich bin stolz darauf, deine Katze zu sein"
      ]
    }
  },

  'sibling': {
    1: {
      question: "Wie wirkt er/sie und was strahlt er/sie aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung deines Geschwisters.",
      example: "Er/sie hat vertraute, verständnisvolle Augen und strahlt eine tiefe Verbundenheit aus.",
      blocks: [
        "Vertraute, verständnisvolle Augen",
        "Offene, einladende Ausstrahlung",
        "Warme, vertraute Hände",
        "Lachende, fröhliche Stimme",
        "Tiefe Verbundenheit und Vertrauen",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn er/sie nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe deines Geschwisters.",
      example: "Ich fühle mich verstanden und verbunden.",
      blocks: [
        "Verstanden und verbunden",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht er/sie, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie dein Geschwister dich in schwierigen Momenten unterstützt.",
      example: "Er/sie hört mir zu und gibt mir praktische Ratschläge.",
      blocks: [
        "Er/sie hört mir geduldig zu",
        "Er/sie gibt mir praktische Ratschläge",
        "Er/sie macht mich zum Lachen",
        "Er/sie umarmt mich und gibt mir Kraft",
        "Er/sie lenkt mich ab mit lustigen Geschichten",
        "Er/sie ist einfach da und unterstützt mich",
        "Er/sie erinnert mich an meine Stärken"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihm/ihr geliebt fühlen?",
      prompt: "Beschreibe, was dein Geschwister tut, um dir seine/ihre Verbundenheit zu zeigen.",
      example: "Er/sie ist immer da, wenn ich ihn/sie brauche.",
      blocks: [
        "Er/sie ist immer da, wenn ich ihn/sie brauche",
        "Er/sie hört mir geduldig zu, wenn ich reden möchte",
        "Er/sie erinnert mich an meine Stärken",
        "Er/sie macht sich Sorgen um mich und kümmert sich",
        "Er/sie ist stolz auf mich, egal was ich tue",
        "Er/sie akzeptiert mich so, wie ich bin",
        "Er/sie vertraut mir vollkommen"
      ]
    },
    5: {
      question: "Um was würdest du ihn/sie bitten?",
      prompt: "Formuliere, was du dir von deinem Geschwister wünschst.",
      example: "Bitte bleib immer so verständnisvoll und loyal.",
      blocks: [
        "Bleib immer so verständnisvoll und loyal",
        "Sei immer da, wenn ich dich brauche",
        "Verstehe mich weiterhin so gut",
        "Erinnere mich an meine Stärken",
        "Schenk mir weiterhin deine Verbundenheit",
        "Bleib gesund und glücklich",
        "Lass mich immer bei dir willkommen sein"
      ]
    },
    6: {
      question: "Was würde er/sie dir idealerweise sagen?",
      prompt: "Teile die motivierenden Sätze, die dein Geschwister dir sagen würde.",
      example: "Du bist stark und du schaffst das, ich glaube an dich.",
      blocks: [
        "Du bist stark und du schaffst das",
        "Ich glaube fest an dich",
        "Du bist genau richtig, so wie du bist",
        "Ich bin immer für dich da",
        "Du bist mein größtes Glück",
        "Ich traue dir zu, deinen Weg zu gehen – und ich begleite dich.",
        "Du bist mein Geschwister"
      ]
    }
  },

  // FICTIONAL FIGURES
  'wise-wizard': {
    1: {
      question: "Wie wirkt er und was strahlt er aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung des Zauberers.",
      example: "Er hat magische Augen und strahlt eine mystische Kraft aus.",
      blocks: [
        "Magische Aura, die mich umhüllt",
        "Weise Augen, die alles verstehen",
        "Mystische Präsenz voller Kraft",
        "Zauberhafte Ausstrahlung",
        "Magische Robe mit funkelnden Sternen",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn er nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe des Zauberers.",
      example: "Ich fühle mich magisch und beschützt.",
      blocks: [
        "Tief entspannt und geborgen in seiner Nähe",
        "Wirklich geliebt und willkommen so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Entspannt, offen und frei",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht er, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie der Zauberer dich in schwierigen Momenten unterstützt.",
      example: "Er umhüllt mich mit einem schützenden Zauberkreis.",
      blocks: [
        "Er umhüllt mich mit einem schützenden Zauberkreis",
        "Er bannt böse Energien von mir",
        "Er zeigt mir magische Verteidigungstechniken",
        "Er gibt mir magische Amulette zum Schutz",
        "Er lehrt mich, mich unsichtbar zu machen",
        "Er schafft eine magische Schutzhülle um mich",
        "Er weist böse Geister von mir ab"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihm geliebt fühlen?",
      prompt: "Beschreibe, was der Zauberer tut, um dir seine magische Unterstützung zu zeigen.",
      example: "Er glaubt an meine magischen Kräfte und zeigt es mir jeden Tag.",
      blocks: [
        "Er glaubt an meine magischen Kräfte und zeigt es mir jeden Tag",
        "Er lehrt mich seine magischen Geheimnisse",
        "Er beschützt mich vor allen Gefahren",
        "Er erinnert mich an meine magischen Fähigkeiten",
        "Er macht sich Sorgen um mich und kümmert sich",
        "Er ist stolz auf mich, egal was ich tue",
        "Er akzeptiert mich so, wie ich bin"
      ]
    },
    5: {
      question: "Um was würdest du ihn bitten?",
      prompt: "Formuliere, was du dir von dem Zauberer wünschst.",
      example: "Bitte lehre mich, wie ich mich unsichtbar machen kann.",
      blocks: [
        "Lehre mich, wie ich mich unsichtbar machen kann",
        "Zeig mir, wie ich fliegen kann",
        "Gib mir die Kraft, andere zu heilen",
        "Lehre mich, Gedanken zu lesen",
        "Zeig mir, wie ich mich verwandeln kann",
        "Gib mir die Kraft, die Zeit zu verlangsamen",
        "Lehre mich, mit Tieren zu sprechen"
      ]
    },
    6: {
      question: "Was würde er dir idealerweise sagen?",
      prompt: "Teile die zauberhaften Sätze, die der Zauberer dir sagen würde.",
      example: "Du bist ein besonderes Kind mit magischen Kräften.",
      blocks: [
        "Du bist ein besonderes Kind mit magischen Kräften",
        "Du hast die Kraft, alles zu erreichen",
        "Ich glaube fest an deine Magie",
        "Du bist ein wahrer Zauberer",
        "Du wirst große Dinge vollbringen",
        "Ich bin so stolz auf dich",
        "Du bist mein größtes Glück"
      ]
    }
  },

  'fairy': {
    1: {
      question: "Wie wirkt sie und was strahlt sie aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung der Fee.",
      example: "Sie hat funkelnde Augen und strahlt eine zauberhafte Freude aus.",
      blocks: [
        "Glitzernde Flügel, die im Licht schimmern",
        "Zarte, feenartige Gestalt",
        "Magische Ausstrahlung voller Freude",
        "Sanfte, melodische Stimme",
        "Funkelnde Augen voller Wunder",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn sie nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe der Fee.",
      example: "Ich fühle mich magisch und voller Freude.",
      blocks: [
        "Tief entspannt und geborgen in ihrer Nähe",
        "Wirklich geliebt und willkommen so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Entspannt, offen und frei",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht sie, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie die Fee dich in schwierigen Momenten unterstützt.",
      example: "Sie umhüllt mich mit glitzerndem Feenstaub.",
      blocks: [
        "Sie umhüllt mich mit glitzerndem Feenstaub",
        "Sie fliegt um mich herum und beschützt mich",
        "Sie zaubert einen schützenden Schild um mich",
        "Sie weist böse Geister von mir ab",
        "Sie gibt mir magische Kräfte",
        "Sie schafft eine feenartige Schutzhülle",
        "Sie flüstert mir Mut zu"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihr geliebt fühlen?",
      prompt: "Beschreibe, was die Fee tut, um dir ihre magische Unterstützung zu zeigen.",
      example: "Sie glaubt an meine Feenkräfte und zeigt es mir jeden Tag.",
      blocks: [
        "Sie glaubt an meine Feenkräfte und zeigt es mir jeden Tag",
        "Sie lehrt mich ihre feenhaften Geheimnisse",
        "Sie beschützt mich vor allen Gefahren",
        "Sie erinnert mich an meine magischen Fähigkeiten",
        "Sie macht sich Sorgen um mich und kümmert sich",
        "Sie ist stolz auf mich, egal was ich tue",
        "Sie akzeptiert mich so, wie ich bin"
      ]
    },
    5: {
      question: "Um was würdest du sie bitten?",
      prompt: "Formuliere, was du dir von der Fee wünschst.",
      example: "Bitte lehre mich, wie ich fliegen kann.",
      blocks: [
        "Lehre mich, wie ich fliegen kann",
        "Zeig mir, wie ich Feenstaub zaubern kann",
        "Gib mir die Kraft, Wünsche zu erfüllen",
        "Lehre mich, mit Tieren zu sprechen",
        "Zeig mir, wie ich mich unsichtbar machen kann",
        "Gib mir die Kraft, Blumen zum Blühen zu bringen",
        "Lehre mich, Träume zu verwirklichen"
      ]
    },
    6: {
      question: "Was würde sie dir idealerweise sagen?",
      prompt: "Teile die zauberhaften Sätze, die die Fee dir sagen würde.",
      example: "Du bist ein besonderes Kind mit Feenkräften.",
      blocks: [
        "Du bist ein besonderes Kind mit Feenkräften",
        "Du hast die Kraft, Wünsche zu erfüllen",
        "Ich glaube fest an deine Magie",
        "Du bist eine wahre Fee",
        "Du wirst zauberhafte Dinge vollbringen",
        "Ich bin so stolz auf dich",
        "Du bist mein größtes Glück"
      ]
    }
  },

  'superhero': {
    1: {
      question: "Wie wirkt er und was strahlt er aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung des Superhelden.",
      example: "Er hat heldenhafte Augen und strahlt eine unerschütterliche Kraft aus.",
      blocks: [
        "Starke, muskulöse Gestalt",
        "Heldhafte Ausstrahlung voller Kraft",
        "Mutiger, entschlossener Blick",
        "Superhelden-Kostüm mit Symbol",
        "Aura von Stärke und Mut",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn er nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe des Superhelden.",
      example: "Ich fühle mich stark und beschützt.",
      blocks: [
        "Tief entspannt und geborgen in seiner Nähe",
        "Wirklich geliebt und willkommen so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Entspannt, offen und frei",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht er, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie der Superheld dich in schwierigen Momenten unterstützt.",
      example: "Er fliegt herbei und beschützt mich vor Gefahren.",
      blocks: [
        "Er fliegt herbei und beschützt mich vor Gefahren",
        "Er steht vor mir und wehrt Angriffe ab",
        "Er nutzt seine Superkräfte, um mich zu retten",
        "Er gibt mir ein schützendes Kraftfeld",
        "Er kämpft für mich und meine Sicherheit",
        "Er ist immer zur Stelle, wenn ich Hilfe brauche",
        "Er gibt mir Mut und Stärke"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihm geliebt fühlen?",
      prompt: "Beschreibe, was der Superheld tut, um dir seine heldenhafte Unterstützung zu zeigen.",
      example: "Er glaubt an meine Stärke und zeigt es mir jeden Tag.",
      blocks: [
        "Er glaubt an meine Stärke und zeigt es mir jeden Tag",
        "Er lehrt mich seine heldenhaften Geheimnisse",
        "Er beschützt mich vor allen Gefahren",
        "Er erinnert mich an meine heldenhaften Fähigkeiten",
        "Er macht sich Sorgen um mich und kümmert sich",
        "Er ist stolz auf mich, egal was ich tue",
        "Er akzeptiert mich so, wie ich bin"
      ]
    },
    5: {
      question: "Um was würdest du ihn bitten?",
      prompt: "Formuliere, was du dir von dem Superhelden wünschst.",
      example: "Bitte lehre mich, wie ich fliegen kann.",
      blocks: [
        "Lehre mich, wie ich fliegen kann",
        "Zeig mir, wie ich super stark werde",
        "Gib mir die Kraft, andere zu beschützen",
        "Lehre mich, wie ich unsichtbar werde",
        "Zeig mir, wie ich durch Wände gehen kann",
        "Gib mir die Kraft, Feuer zu kontrollieren",
        "Lehre mich, wie ich Gedanken lesen kann"
      ]
    },
    6: {
      question: "Was würde er dir idealerweise sagen?",
      prompt: "Teile die kraftvollen Sätze, die der Superheld dir sagen würde.",
      example: "Du bist ein wahrer Held mit besonderen Kräften.",
      blocks: [
        "Du bist ein wahrer Held mit besonderen Kräften",
        "Du hast die Kraft, alles zu erreichen",
        "Ich glaube fest an deine Stärke",
        "Du bist ein natürlicher Held",
        "Du wirst große Taten vollbringen",
        "Ich bin so stolz auf dich",
        "Du bist mein größtes Glück"
      ]
    }
  },

  'pet-dog': {
    1: {
      question: "Wie wirkt er und was strahlt er aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung deines Hundes.",
      example: "Er hat treue Augen und strahlt eine bedingungslose Liebe aus.",
      blocks: [
        "Treue Augen, die mich lieben",
        "Weiches, warmes Fell",
        "Schwanzwedelnde Freude",
        "Loyale, liebevolle Präsenz",
        "Freundliche, einladende Augen",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn er nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe deines Hundes.",
      example: "Ich fühle mich geborgen und geliebt.",
      blocks: [
        "Tief entspannt und geborgen in seiner Nähe",
        "Wirklich geliebt und willkommen so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Entspannt, offen und frei",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht er, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie dein Hund dich in schwierigen Momenten unterstützt.",
      example: "Er wedelt mit dem Schwanz und leckt sanft meine Hand.",
      blocks: [
        "Er wedelt mit dem Schwanz und leckt sanft meine Hand",
        "Er bringt mir sein Lieblingsspielzeug",
        "Er liegt eng an mir und wärmt mich",
        "Er folgt mir überall hin",
        "Er schaut mich mit treuen Augen an",
        "Er springt freudig auf, wenn ich komme",
        "Er beschützt mich vor Gefahren"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihm geliebt fühlen?",
      prompt: "Beschreibe, was dein Hund tut, um dir seine bedingungslose Liebe zu zeigen.",
      example: "Er glaubt an mich und zeigt es mir jeden Tag.",
      blocks: [
        "Er glaubt an mich und zeigt es mir jeden Tag",
        "Er lehrt mich seine treuen Geheimnisse",
        "Er beschützt mich vor allen Gefahren",
        "Er erinnert mich an meine liebevollen Fähigkeiten",
        "Er macht sich Sorgen um mich und kümmert sich",
        "Er ist stolz auf mich, egal was ich tue",
        "Er akzeptiert mich so, wie ich bin"
      ]
    },
    5: {
      question: "Um was würdest du ihn bitten?",
      prompt: "Formuliere, was du dir von deinem Hund wünschst.",
      example: "Bleib immer so treu und liebevoll.",
      blocks: [
        "Bleib immer so treu und liebevoll",
        "Sei immer da, wenn ich dich brauche",
        "Beschütze mich weiterhin",
        "Bleib gesund und glücklich",
        "Lass mich immer bei dir willkommen sein",
        "Bleib so verspielt und fröhlich",
        "Lass mich immer dein bester Freund sein"
      ]
    },
    6: {
      question: "Was würde er dir idealerweise sagen?",
      prompt: "Stelle dir vor, was dein Hund dir sagen würde.",
      example: "Du bist mein bester Freund und ich liebe dich bedingungslos.",
      blocks: [
        "Du bist mein bester Freund",
        "Ich liebe dich bedingungslos",
        "Ich bin immer für dich da",
        "Du bist mein größtes Glück",
        "Ich vertraue dir vollkommen",
        "Du bist mein Rudel",
        "Ich bin so stolz darauf, dein Hund zu sein"
      ]
    }
  },

  'angel': {
    1: {
      question: "Wie wirkt er und was strahlt er aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung deines Engels.",
      example: "Er hat sanfte, himmlische Augen und strahlt eine tiefe Ruhe und Liebe aus.",
      blocks: [
        "Sanfte, himmlische Augen voller Liebe",
        "Leuchtende, engelhafte Ausstrahlung",
        "Weiche, schützende Flügel",
        "Beruhigende, himmlische Stimme",
        "Tiefe Ruhe und bedingungslose Liebe",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn er nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe deines Engels.",
      example: "Ich fühle mich himmlisch geborgen und voller Frieden.",
      blocks: [
        "Himmlisch geborgen und voller Frieden",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht er, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie dein Engel dich in schwierigen Momenten unterstützt.",
      example: "Er umhüllt mich mit seinen schützenden Flügeln.",
      blocks: [
        "Er umhüllt mich mit seinen schützenden Flügeln",
        "Er flüstert mir tröstende Worte zu",
        "Er hält mich fest und gibt mir Sicherheit",
        "Er schützt mich vor negativen Energien",
        "Er ist einfach da und gibt mir Kraft",
        "Er umarmt mich und lässt mich weinen",
        "Er erinnert mich an meine göttliche Natur"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihm geliebt fühlen?",
      prompt: "Beschreibe, was dein Engel tut, um dir seine himmlische Liebe zu zeigen.",
      example: "Er glaubt an meine göttliche Natur und zeigt es mir jeden Tag.",
      blocks: [
        "Er glaubt an meine göttliche Natur und zeigt es mir jeden Tag",
        "Er lehrt mich seine himmlischen Geheimnisse",
        "Er beschützt mich vor allen Gefahren",
        "Er erinnert mich an meine göttlichen Fähigkeiten",
        "Er macht sich Sorgen um mich und kümmert sich",
        "Er ist stolz auf mich, egal was ich tue",
        "Er akzeptiert mich so, wie ich bin"
      ]
    },
    5: {
      question: "Um was würdest du ihn bitten?",
      prompt: "Formuliere, was du dir von deinem Engel wünschst.",
      example: "Bitte bleib immer so beschützend und liebevoll.",
      blocks: [
        "Bleib immer so beschützend und liebevoll",
        "Sei immer da, wenn ich dich brauche",
        "Beschütze mich weiterhin",
        "Erinnere mich an meine göttliche Natur",
        "Schenk mir weiterhin deine himmlische Liebe",
        "Bleib gesund und stark",
        "Lass mich immer bei dir willkommen sein"
      ]
    },
    6: {
      question: "Was würde er dir idealerweise sagen?",
      prompt: "Teile die göttlichen Sätze, die dein Engel dir sagen würde.",
      example: "Du bist ein Kind Gottes und wirst bedingungslos geliebt.",
      blocks: [
        "Du bist ein Kind Gottes",
        "Du wirst bedingungslos geliebt",
        "Ich bin immer für dich da",
        "Du bist mein größtes Glück",
        "Du bist wunderschön, innen und außen",
        "Ich glaube fest an dich",
        "Du bist mein himmlisches Kind"
      ]
    }
  },

  'ideal-father': {
    1: {
      question: "Wie wirkt er und was strahlt er aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung deines Ideal-Vaters.",
      example: "Er hat starke, liebevolle Augen und strahlt eine väterliche Geborgenheit aus.",
      blocks: [
        "Starke, liebevolle Augen voller Verständnis",
        "Sanfte, väterliche Ausstrahlung",
        "Weiche, tröstende Hände",
        "Beruhigende, melodische Stimme",
        "Väterliche Geborgenheit und Wärme",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn er nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe deines Ideal-Vaters.",
      example: "Ich fühle mich vollständig geliebt und geborgen.",
      blocks: [
        "Vollständig geliebt und geborgen",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht er, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie dein Ideal-Vater dich in schwierigen Momenten unterstützt.",
      example: "Er nimmt mich in den Arm und flüstert tröstende Worte.",
      blocks: [
        "Er nimmt mich in den Arm und flüstert tröstende Worte",
        "Er streichelt sanft mein Haar",
        "Er hält mich fest und gibt mir Sicherheit",
        "Er macht mir einen warmen Tee",
        "Er hört mir geduldig zu",
        "Er umarmt mich und lässt mich weinen",
        "Er ist einfach da und gibt mir Kraft"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihm geliebt fühlen?",
      prompt: "Beschreibe, was dein Ideal-Vater tut, um dir seine väterliche Liebe zu zeigen.",
      example: "Er glaubt an mich und zeigt es mir jeden Tag.",
      blocks: [
        "Er glaubt an mich und zeigt es mir jeden Tag",
        "Er lehrt mich seine väterlichen Geheimnisse",
        "Er beschützt mich vor allen Gefahren",
        "Er erinnert mich an meine väterlichen Fähigkeiten",
        "Er macht sich Sorgen um mich und kümmert sich",
        "Er ist stolz auf mich, egal was ich tue",
        "Er akzeptiert mich so, wie ich bin"
      ]
    },
    5: {
      question: "Um was würdest du ihn bitten?",
      prompt: "Formuliere, was du dir von deinem Ideal-Vater wünschst.",
      example: "Bitte bleib immer so liebevoll und beschützend.",
      blocks: [
        "Bleib immer so liebevoll und beschützend",
        "Sei immer da, wenn ich dich brauche",
        "Verstehe mich weiterhin so gut",
        "Erinnere mich an meinen Wert",
        "Schenk mir weiterhin deine bedingungslose Liebe",
        "Bleib gesund und glücklich",
        "Lass mich immer bei dir willkommen sein"
      ]
    },
    6: {
      question: "Welche tröstenden Worte sagt dir dein Ideal-Vater?",
      prompt: "Teile die liebevollen Sätze, die dein Ideal-Vater dir sagt.",
      example: "Du bist mein Schatz und ich liebe dich bedingungslos.",
      blocks: [
        "Du bist mein Schatz und ich liebe dich bedingungslos",
        "Du bist genau richtig, so wie du bist",
        "Ich bin immer für dich da, egal was passiert",
        "Ich bin so stolz auf dich",
        "Du bist wunderschön, innen und außen",
        "Ich glaube fest an dich",
        "Du bist mein größtes Glück"
      ]
    }
  },

  'godmother': {
    1: {
      question: "Wie spürst du Mutter Erde? Was strahlt sie aus?",
      prompt: "Beschreibe, wie du Mutter Erde wahrnimmst und was sie ausstrahlt.",
      example: "Ich spüre ihre nährende Energie durch die Erde und ihre warme Ausstrahlung.",
      blocks: [
        "Nährende Energie, die durch die Erde fließt",
        "Warme, erdige Ausstrahlung, die alles umhüllt",
        "Sanfte Vibrationen, die durch meinen Körper strömen",
        "Beruhigende Erdenergie, die mich trägt",
        "Mütterliche Weisheit, die in der Luft liegt",
        "Tiefe Ruhe und Frieden, die von ihr ausgeht",
        "Ein Gefühl, als würde ich wirklich zählen und dazugehören"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn Mutter Erde für dich da ist?",
      prompt: "Beschreibe deine inneren Gefühle, wenn Mutter Erde für dich da ist.",
      example: "Ich fühle mich vollständig genährt und geborgen, als wäre ich zu Hause.",
      blocks: [
        "Vollständig genährt und geborgen",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Wie macht Mutter Erde, wenn du Schmerz oder Angst verspürst?",
      prompt: "Beschreibe, wie Mutter Erde auf deine Schmerzen oder Ängste reagiert.",
      example: "Sie umhüllt mich mit ihrer erdigen Wärme und gibt mir Kraft.",
      blocks: [
        "Sie umhüllt mich mit ihrer erdigen Wärme",
        "Sie flüstert mir tröstende Worte zu",
        "Sie hält mich fest und gibt mir Sicherheit",
        "Sie nährt mich mit ihrer Liebe",
        "Sie ist einfach da und gibt mir Kraft",
        "Sie umarmt mich und lässt mich weinen",
        "Sie erinnert mich an meine Verbindung zur Erde"
      ]
    },
    4: {
      question: "Wie verbindest du dich mit Mutter Erde?",
      prompt: "Beschreibe, wie du dich mit der Erde und der Natur verbindest.",
      example: "Ich spüre ihre Energie durch meine Füße und fühle mich geerdet.",
      blocks: [
        "Ich spüre ihre Energie durch meine Füße und fühle mich geerdet",
        "Ich atme tief ein und verbinde mich mit der Natur",
        "Ich lege mich auf den Boden und spüre ihre Wärme",
        "Ich umarme einen Baum und fühle seine Kraft",
        "Ich gehe barfuß über die Erde und spüre ihre Lebendigkeit",
        "Ich sitze still in der Natur und lausche ihren Geräuschen",
        "Ich pflanze etwas und nähre das Leben"
      ]
    },
    5: {
      question: "Welche Unterstützung wünschst du dir von Mutter Erde?",
      prompt: "Formuliere, was du dir von Mutter Erde wünschst.",
      example: "Hilf mir, geerdet und stabil zu sein sowie Halt im Leben zu finden.",
      blocks: [
        "Hilf mir, geerdet und stabil zu sein sowie Halt im Leben zu finden",
        "Hilf mir, meine Wurzeln zu spüren und mich verbunden mit dir zu fühlen",
        "Schenk mir deine bedingungslose Liebe und sei immer da, wenn ich dich brauche",
        "Erinnere mich an meine Verbindung zu dir und zeig mir, dass ich ein Teil von dir bin",
        "Lass mich immer bei dir willkommen sein und zeige mir wie sehr du mich liebst",
        "Sei immer für mich da, wenn ich dich brauche und schenk mir deine bedingungslose Akzeptanz"
      ]
    },
    6: {
      question: "Was verspricht dir Mutter Erde?",
      prompt: "Teile die Versprechen, die Mutter Erde dir gibt.",
      example: "Ich werde dich immer halten und tragen.",
      blocks: [
        "Ich werde dich immer halten und tragen",
        "Du bist ein Teil von mir und wirst immer willkommen sein",
        "Ich nähre dich mit meiner bedingungslosen Liebe",
        "Du gehörst zu mir und bist hier zu Hause",
        "Ich werde dich immer beschützen und umhüllen",
        "Du bist mein geliebtes Kind und wirst immer bei mir sein",
        "Ich schenke dir meine Kraft und Stärke"
      ]
    }
  },

  'wise-owl': {
    1: {
      question: "Wie sieht die Weise Eule aus? Was strahlt sie aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung der Weisen Eule.",
      example: "Sie hat weise, durchdringende Augen und strahlt eine tiefe Weisheit aus.",
      blocks: [
        "Weise, durchdringende Augen",
        "Sanfte, weise Ausstrahlung",
        "Weiche, schützende Flügel",
        "Beruhigende, weise Stimme",
        "Tiefe Weisheit und Klarheit",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich innerlich, wenn die Weise Eule bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe der Weisen Eule.",
      example: "Ich fühle mich verstanden und weise, als könnte ich alles verstehen.",
      blocks: [
        "Verstanden und weise",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Wie berät dich die Weise Eule, wenn du Schmerz oder Angst spürst?",
      prompt: "Beschreibe, wie die Weise Eule dich in schwierigen Momenten berät.",
      example: "Sie gibt mir weise Ratschläge und hilft mir, die Situation zu verstehen.",
      blocks: [
        "Sie gibt mir weise Ratschläge",
        "Sie hilft mir, die Situation zu verstehen",
        "Sie erklärt mir geduldig",
        "Sie zeigt mir neue Perspektiven",
        "Sie ist einfach da und unterstützt mich",
        "Sie umarmt mich und lässt mich weinen",
        "Sie erinnert mich an meine Weisheit"
      ]
    },
    4: {
      question: "Welche weise Aktivität teilt ihr miteinander?",
      prompt: "Beschreibe weise, gemeinsame Momente mit der Weisen Eule.",
      example: "Wir sitzen zusammen und philosophieren über das Leben.",
      blocks: [
        "Wir sitzen zusammen und philosophieren",
        "Wir genießen zusammen die weise Stille",
        "Sie zeigt mir weise Bücher",
        "Wir meditieren zusammen",
        "Wir teilen zusammen weise Gedanken",
        "Wir fliegen zusammen durch die Nacht",
        "Wir sitzen zusammen im Mondlicht"
      ]
    },
    5: {
      question: "Welche Unterstützung wünschst du dir von der Weisen Eule?",
      prompt: "Formuliere, was du dir von der Weisen Eule wünschst.",
      example: "Bitte bleib immer so weise und beruhigend.",
      blocks: [
        "Bleib immer so weise und beruhigend",
        "Sei immer da, wenn ich dich brauche",
        "Berate mich weiterhin",
        "Erinnere mich an meine Weisheit",
        "Schenk mir weiterhin deine weise Liebe",
        "Bleib gesund und stark",
        "Lass mich immer bei dir willkommen sein"
      ]
    },
    6: {
      question: "Welche weisen Worte sagt dir die Weise Eule?",
      prompt: "Teile die weisen Sätze, die die Weise Eule dir sagt.",
      example: "Du bist weise und du verstehst mehr, als du denkst.",
      blocks: [
        "Du bist weise",
        "Du verstehst mehr, als du denkst",
        "Ich bin immer für dich da",
        "Du bist mein größtes Glück",
        "Du bist wunderschön, innen und außen",
        "Ich glaube fest an dich",
        "Du bist mein weises Kind"
      ]
    }
  },

  'gentle-giant': {
    1: {
      question: "Wie sieht der Sanfte Riese aus? Was strahlt er aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung des Sanften Riesen.",
      example: "Er hat sanfte, ruhige Augen und strahlt eine beschützende Stärke aus.",
      blocks: [
        "Sanfte, ruhige Augen voller Güte",
        "Große, beschützende Gestalt",
        "Weiche, sanfte Hände",
        "Beruhigende, tiefe Stimme",
        "Beschützende Stärke und Güte",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich innerlich, wenn der Sanfte Riese bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe des Sanften Riesen.",
      example: "Ich fühle mich vollständig beschützt und sicher, als könnte mir nichts passieren.",
      blocks: [
        "Vollständig beschützt und sicher",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Wie beschützt dich der Sanfte Riese, wenn du Schmerz oder Angst spürst?",
      prompt: "Beschreibe, wie der Sanfte Riese dich in schwierigen Momenten beschützt.",
      example: "Er nimmt mich sanft in seine großen Arme und gibt mir das Gefühl von Sicherheit.",
      blocks: [
        "Er nimmt mich sanft in seine großen Arme",
        "Er flüstert mir tröstende Worte zu",
        "Er hält mich fest und gibt mir Sicherheit",
        "Er schützt mich vor allen Gefahren",
        "Er ist einfach da und gibt mir Kraft",
        "Er umarmt mich und lässt mich weinen",
        "Er erinnert mich an meine Stärke"
      ]
    },
    4: {
      question: "Welche sanfte Aktivität teilt ihr miteinander?",
      prompt: "Beschreibe sanfte, gemeinsame Momente mit dem Sanften Riesen.",
      example: "Wir sitzen zusammen und genießen die ruhige Stille.",
      blocks: [
        "Wir sitzen zusammen und genießen die Stille",
        "Er trägt mich sanft auf seinen Schultern",
        "Wir machen zusammen einen Spaziergang",
        "Wir sitzen zusammen und reden",
        "Wir teilen zusammen ruhige Momente",
        "Er zeigt mir die Welt von oben",
        "Wir liegen zusammen im Gras"
      ]
    },
    5: {
      question: "Welche Unterstützung wünschst du dir vom Sanften Riesen?",
      prompt: "Formuliere, was du dir vom Sanften Riesen wünschst.",
      example: "Bitte bleib immer so beschützend und sanft.",
      blocks: [
        "Bleib immer so beschützend und sanft",
        "Sei immer da, wenn ich dich brauche",
        "Beschütze mich weiterhin",
        "Erinnere mich an meine Stärke",
        "Schenk mir weiterhin deine sanfte Liebe",
        "Bleib gesund und stark",
        "Lass mich immer bei dir willkommen sein"
      ]
    },
    6: {
      question: "Welche sanften Worte sagt dir der Sanfte Riese?",
      prompt: "Teile die sanften Sätze, die der Sanfte Riese dir sagt.",
      example: "Du bist stark und wirst beschützt, so wie du bist.",
      blocks: [
        "Du bist stark",
        "Du wirst beschützt",
        "Ich bin immer für dich da",
        "Du bist mein größtes Glück",
        "Du bist wunderschön, innen und außen",
        "Ich glaube fest an dich",
        "Du bist mein beschütztes Kind"
      ]
    }
  },

  'healing-light': {
    1: {
      question: "Wie wirkt es und was strahlt es aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung des Heilenden Lichts.",
      example: "Es hat leuchtende, warme Strahlen und strahlt eine heilende Energie aus.",
      blocks: [
        "Leuchtende, warme Strahlen",
        "Sanfte, heilende Ausstrahlung",
        "Weiche, umhüllende Energie",
        "Beruhigende, harmonische Schwingung",
        "Heilende Energie und Wärme",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn es nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe des Heilenden Lichts.",
      example: "Ich fühle mich vollständig geheilt und erneuert, als wäre alles wieder gut.",
      blocks: [
        "Vollständig geheilt und erneuert",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Was macht es, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie das Heilende Licht dich in schwierigen Momenten unterstützt.",
      example: "Es umhüllt mich mit seinen warmen Strahlen und heilt meine Wunden.",
      blocks: [
        "Es umhüllt mich mit warmen Strahlen",
        "Es heilt meine Wunden",
        "Es flüstert mir tröstende Worte zu",
        "Es gibt mir neue Kraft",
        "Es ist einfach da und heilt mich",
        "Es umarmt mich und lässt mich weinen",
        "Es erinnert mich an meine Heilungskraft"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihm geliebt fühlen?",
      prompt: "Beschreibe, was das Heilende Licht tut, um dir seine heilende Liebe zu zeigen.",
      example: "Es glaubt an meine Heilungskraft und zeigt es mir jeden Tag.",
      blocks: [
        "Es glaubt an meine Heilungskraft und zeigt es mir jeden Tag",
        "Es lehrt mich seine heilenden Geheimnisse",
        "Es beschützt mich vor allen Gefahren",
        "Es erinnert mich an meine heilenden Fähigkeiten",
        "Es macht sich Sorgen um mich und kümmert sich",
        "Es ist stolz auf mich, egal was ich tue",
        "Es akzeptiert mich so, wie ich bin"
      ]
    },
    5: {
      question: "Um was würdest du es bitten?",
      prompt: "Formuliere, was du dir vom Heilenden Licht wünschst.",
      example: "Bitte bleib immer so heilend und liebevoll.",
      blocks: [
        "Bleib immer so heilend und liebevoll",
        "Sei immer da, wenn ich dich brauche",
        "Heile mich weiterhin",
        "Erinnere mich an meine Heilungskraft",
        "Schenk mir weiterhin deine heilende Liebe",
        "Bleib gesund und stark",
        "Lass mich immer bei dir willkommen sein"
      ]
    },
    6: {
      question: "Was würde es dir idealerweise sagen?",
      prompt: "Teile die heilenden Sätze, die das Heilende Licht dir sagen würde.",
      example: "Du bist heil und vollständig, so wie du bist.",
      blocks: [
        "Du bist heil und vollständig",
        "Du wirst geliebt",
        "Ich bin immer für dich da",
        "Du bist mein größtes Glück",
        "Du bist wunderschön, innen und außen",
        "Ich glaube fest an dich",
        "Du bist mein heilendes Kind"
      ]
    }
  },

  'dragon-protector': {
    1: {
      question: "Wie wirkt er und was strahlt er aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung des Drachen.",
      example: "Er hat starke, beschützende Augen und strahlt eine mächtige Kraft aus.",
      blocks: [
        "Starke, beschützende Augen",
        "Mächtige, schützende Gestalt",
        "Weiche, schützende Schuppen",
        "Beruhigende, tiefe Stimme",
        "Mächtige Kraft und Beschützung",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn er nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe des Drachen.",
      example: "Ich fühle mich vollständig beschützt und stark.",
      blocks: [
        "Vollständig beschützt und stark",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Wie beschützt dich der Drache, wenn du Schmerz oder Angst spürst?",
      prompt: "Beschreibe, wie der Drache dich in schwierigen Momenten beschützt.",
      example: "Er umhüllt mich mit seinen Flügeln und beschützt mich vor allen Gefahren.",
      blocks: [
        "Er umhüllt mich mit seinen Flügeln",
        "Er beschützt mich vor allen Gefahren",
        "Er flüstert mir tröstende Worte zu",
        "Er gibt mir seine Kraft",
        "Er ist einfach da und beschützt mich",
        "Er umarmt mich und lässt mich weinen",
        "Er erinnert mich an meine Stärke"
      ]
    },
    4: {
      question: "Welche mächtige Aktivität teilt ihr miteinander?",
      prompt: "Beschreibe mächtige, gemeinsame Momente mit dem Drachen.",
      example: "Wir fliegen zusammen durch die Lüfte und erkunden die Welt.",
      blocks: [
        "Wir fliegen zusammen durch die Lüfte",
        "Wir erkunden zusammen die Welt",
        "Er zeigt mir mächtige Orte",
        "Wir kämpfen zusammen gegen das Böse",
        "Wir teilen zusammen mächtige Kraft",
        "Er lehrt mich, stark zu sein",
        "Wir sitzen zusammen und genießen die Stille"
      ]
    },
    5: {
      question: "Welche Unterstützung wünschst du dir vom Drachen?",
      prompt: "Formuliere, was du dir vom Drachen wünschst.",
      example: "Bitte bleib immer so beschützend und mächtig.",
      blocks: [
        "Bleib immer so beschützend und mächtig",
        "Sei immer da, wenn ich dich brauche",
        "Beschütze mich weiterhin",
        "Erinnere mich an meine Stärke",
        "Schenk mir weiterhin deine mächtige Liebe",
        "Bleib gesund und stark",
        "Lass mich immer bei dir willkommen sein"
      ]
    },
    6: {
      question: "Welche mächtigen Worte sagt dir der Drache?",
      prompt: "Teile die mächtigen Sätze, die der Drache dir sagt.",
      example: "Du bist stark und wirst beschützt, so wie du bist.",
      blocks: [
        "Du bist stark",
        "Du wirst beschützt",
        "Ich bin immer für dich da",
        "Du bist mein größtes Glück",
        "Du bist wunderschön, innen und außen",
        "Ich glaube fest an dich",
        "Du bist mein mächtiges Kind"
      ]
    }
  },

  'ocean-spirit': {
    1: {
      question: "Wie sieht der Ozeangeist aus? Was strahlt er aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung des Ozeangeists.",
      example: "Er hat fließende, beruhigende Wellen und strahlt eine tiefe Ruhe aus.",
      blocks: [
        "Fließende, beruhigende Wellen",
        "Sanfte, ozeanische Ausstrahlung",
        "Weiche, umhüllende Energie",
        "Beruhigende, fließende Stimme",
        "Tiefe Ruhe und Reinigung",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich innerlich, wenn der Ozeangeist bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe des Ozeangeists.",
      example: "Ich fühle mich vollständig gereinigt und ruhig, als würde ich im Ozean schweben.",
      blocks: [
        "Vollständig gereinigt und ruhig",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Wie reinigt dich der Ozeangeist, wenn du Schmerz oder Angst spürst?",
      prompt: "Beschreibe, wie der Ozeangeist dich in schwierigen Momenten reinigt.",
      example: "Er umhüllt mich mit seinen reinigenden Wellen und wäscht meine Sorgen weg.",
      blocks: [
        "Er umhüllt mich mit reinigenden Wellen",
        "Er wäscht meine Sorgen weg",
        "Er flüstert mir tröstende Worte zu",
        "Er gibt mir neue Klarheit",
        "Er ist einfach da und reinigt mich",
        "Er umarmt mich und lässt mich weinen",
        "Er erinnert mich an meine Reinheit"
      ]
    },
    4: {
      question: "Welche ozeanische Aktivität teilt ihr miteinander?",
      prompt: "Beschreibe ozeanische, gemeinsame Momente mit dem Ozeangeist.",
      example: "Wir schwimmen zusammen im Ozean und genießen die Wellen.",
      blocks: [
        "Wir schwimmen zusammen im Ozean",
        "Wir genießen zusammen die Wellen",
        "Er zeigt mir ozeanische Orte",
        "Wir meditieren zusammen",
        "Wir teilen zusammen ozeanische Liebe",
        "Er lehrt mich zu fließen",
        "Wir sitzen zusammen am Strand"
      ]
    },
    5: {
      question: "Welche Unterstützung wünschst du dir vom Ozeangeist?",
      prompt: "Formuliere, was du dir vom Ozeangeist wünschst.",
      example: "Bitte bleib immer so reinigend und beruhigend.",
      blocks: [
        "Bleib immer so reinigend und beruhigend",
        "Sei immer da, wenn ich dich brauche",
        "Reinige mich weiterhin",
        "Erinnere mich an meine Reinheit",
        "Schenk mir weiterhin deine ozeanische Liebe",
        "Bleib gesund und stark",
        "Lass mich immer bei dir willkommen sein"
      ]
    },
    6: {
      question: "Welche ozeanischen Worte sagt dir der Ozeangeist?",
      prompt: "Teile die ozeanischen Sätze, die der Ozeangeist dir sagt.",
      example: "Du bist rein und fließend, so wie du bist.",
      blocks: [
        "Du bist rein und fließend",
        "Du wirst geliebt",
        "Ich bin immer für dich da",
        "Du bist mein größtes Glück",
        "Du bist wunderschön, innen und außen",
        "Ich glaube fest an dich",
        "Du bist mein ozeanisches Kind"
      ]
    }
  },

  'animal-spirit': {
    1: {
      question: "Wie sieht dein Krafttier aus? Was strahlt es aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung deines Krafttiers.",
      example: "Es hat weise, tierische Augen und strahlt eine natürliche Kraft aus.",
      blocks: [
        "Weise, tierische Augen",
        "Sanfte, tierische Ausstrahlung",
        "Weiche, schützende Energie",
        "Beruhigende, tierische Stimme",
        "Natürliche Kraft und Weisheit",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich innerlich, wenn dein Krafttier bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe deines Krafttiers.",
      example: "Ich fühle mich verbunden mit der Natur und stark, als wäre ich unbesiegbar.",
      blocks: [
        "Verbunden mit der Natur und stark",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Wie stärkt dich dein Krafttier, wenn du Schmerz oder Angst spürst?",
      prompt: "Beschreibe, wie dein Krafttier dich in schwierigen Momenten stärkt.",
      example: "Es gibt mir seine tierische Kraft und hilft mir, stark zu bleiben.",
      blocks: [
        "Es gibt mir seine tierische Kraft",
        "Es hilft mir, stark zu bleiben",
        "Es flüstert mir tröstende Worte zu",
        "Es zeigt mir den Weg",
        "Es ist einfach da und stärkt mich",
        "Es umarmt mich und lässt mich weinen",
        "Es erinnert mich an meine tierische Natur"
      ]
    },
    4: {
      question: "Welche tierische Aktivität teilt ihr miteinander?",
      prompt: "Beschreibe tierische, gemeinsame Momente mit deinem Krafttier.",
      example: "Wir laufen zusammen durch die Natur und genießen die Freiheit.",
      blocks: [
        "Wir laufen zusammen durch die Natur",
        "Wir genießen zusammen die Freiheit",
        "Es zeigt mir tierische Orte",
        "Wir meditieren zusammen",
        "Wir teilen zusammen tierische Liebe",
        "Es lehrt mich, wild zu sein",
        "Wir sitzen zusammen in der Wildnis"
      ]
    },
    5: {
      question: "Welche Unterstützung wünschst du dir von deinem Krafttier?",
      prompt: "Formuliere, was du dir von deinem Krafttier wünschst.",
      example: "Bitte bleib immer so stärkend und wild.",
      blocks: [
        "Bleib immer so stärkend und wild",
        "Sei immer da, wenn ich dich brauche",
        "Stärke mich weiterhin",
        "Erinnere mich an meine tierische Natur",
        "Schenk mir weiterhin deine tierische Liebe",
        "Bleib gesund und stark",
        "Lass mich immer bei dir willkommen sein"
      ]
    },
    6: {
      question: "Welche tierischen Worte sagt dir dein Krafttier?",
      prompt: "Teile die tierischen Sätze, die dein Krafttier dir sagt.",
      example: "Du bist wild und frei, so wie du bist.",
      blocks: [
        "Du bist wild und frei",
        "Du wirst geliebt",
        "Ich bin immer für dich da",
        "Du bist mein größtes Glück",
        "Du bist wunderschön, innen und außen",
        "Ich glaube fest an dich",
        "Du bist mein wildes Kind"
      ]
    }
  },

  'archangel-michael': {
    1: {
      question: "Wie wirkt Erzengel Michael und was strahlt er aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung von Erzengel Michael.",
      example: "Er ist groß und mächtig mit einem flammenden Schwert in der Hand und einer goldenen Aura.",
      blocks: [
        "Große, mächtige Gestalt voller göttlicher Kraft",
        "Flammendes Schwert, das für gesunde Grenzen und klare Verhältnisse sorgt",
        "Goldene Aura, die alles umhüllt und Schutz ausstrahlt",
        "Roter Umhang, der im Wind weht und Stärke symbolisiert",
        "Mächtige Flügel, die Kraft und Mut ausstrahlen",
        "Starke Augen, die Güte und Entschlossenheit ausstrahlen"
      ]
    },
    2: {
      question: "Wie fühlst du dich, wenn Erzengel Michael nah bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe von Erzengel Michael.",
      example: "Ich fühle mich vollständig beschützt und stark, als könnte mir nichts passieren.",
      blocks: [
        "Vollständig beschützt und unbesiegbar",
        "Stark und mutig, als könnte ich alles schaffen",
        "Gerecht und klar in meinen Entscheidungen",
        "Göttlich beschützt und geliebt",
        "Kraftvoll und entschlossen",
        "Sicher vor allen Gefahren und Bedrohungen",
        "Erhoben und gestärkt in meiner göttlichen Natur"
      ]
    },
    3: {
      question: "Was macht Erzengel Michael, wenn es dir mal nicht gut geht?",
      prompt: "Beschreibe, wie Erzengel Michael dich in schwierigen Momenten unterstützt.",
      example: "Er steht vor mir und kämpft gegen alle bösen Kräfte, die mich bedrohen.",
      blocks: [
        "Er stellt sich zwischen mich und alle Bedrohungen",
        "Er umhüllt mich mit seinem goldenen Schutzschild",
        "Er schneidet mit seinem Schwert alle negativen Energien von mir ab",
        "Er flüstert mir göttliche Kraft und Mut zu",
        "Er wacht über mich und lässt nichts Böses zu mir",
        "Er hält mich fest und gibt mir göttlichen Trost",
        "Er erweckt meine innere Stärke und göttliche Macht"
      ]
    },
    4: {
      question: "Durch was würdest du dich von ihm geliebt fühlen?",
      prompt: "Beschreibe, was Erzengel Michael tut, um dir seine göttliche Liebe zu zeigen.",
      example: "Er kämpft für mich und zeigt mir jeden Tag, dass ich wertvoll bin.",
      blocks: [
        "Er kämpft für mich und zeigt mir jeden Tag, dass ich wertvoll bin",
        "Er lehrt mich seine göttlichen Geheimnisse der Stärke",
        "Er stellt sich schützend vor alle Gefahren, die mir drohen",
        "Er erweckt meine göttlichen Fähigkeiten und meine wahre Kraft",
        "Er wacht über mich und kümmert sich um mein Wohlergehen",
        "Er ist stolz auf mich und glaubt an meine göttliche Natur",
        "Er sieht mich als sein geliebtes göttliches Kind"
      ]
    },
    5: {
      question: "Um was würdest du ihn bitten?",
      prompt: "Formuliere, was du dir von Erzengel Michael wünschst.",
      example: "Bitte bleib immer so beschützend und kämpfe für mich.",
      blocks: [
        "Beschütze mich, wann immer ich dich brauche",
        "Stell dich bitte schützend zwischen mich und alle Gefahren",
        "Kannst du mir bitte helfen, gesunde Grenzen zu setzen?",
        "Erwecke weiterhin meine göttliche Kraft und Stärke",
        "Schenk mir weiterhin deine göttliche Liebe und Führung",
        "Lass mich immer als dein geliebtes Kind bei dir willkommen sein"
      ]
    },
    6: {
      question: "Was würde Erzengel Michael dir idealerweise sagen?",
      prompt: "Teile die mächtigen Sätze, die Erzengel Michael dir sagen würde.",
      example: "Du bist ein Kind Gottes und wirst von mir beschützt.",
      blocks: [
        "Du bist ein Kind Gottes und wirst von mir beschützt",
        "Ich bin immer für dich da und kämpfe für dich",
        "Du hast göttliche Kraft in dir, die ich erwecken kann",
        "Du bist wertvoll und verdienst Schutz und Liebe",
        "Ich glaube fest an deine Stärke und deine göttliche Natur",
        "Du bist mein geliebtes Kind und ich werde mich immer einsetzen für dich"
      ]
    }
  },

  // JESUS
  'jesus': {
    1: {
      question: "Wie sieht Jesus aus? Was strahlt er aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung von Jesus.",
      example: "Er hat warme, barmherzige Augen und strahlt eine tiefe Liebe aus.",
      blocks: [
        "Warme, barmherzige Augen voller Verständnis",
        "Sanfte, liebevolle Ausstrahlung",
        "Ruhige, friedliche Präsenz",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen",
        "Strahlende, göttliche Liebe",
        "Demütige, aber starke Präsenz"
      ]
    },
    2: {
      question: "Wie fühlst du dich innerlich, wenn Jesus bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe von Jesus.",
      example: "Ich fühle mich vollständig geliebt und verstanden.",
      blocks: [
        "Vollständig geliebt und verstanden",
        "Tief entspannt und sicher",
        "Vergeben und angenommen so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Wie tröstet dich Jesus, wenn du Schmerz oder Angst spürst?",
      prompt: "Beschreibe, wie Jesus dich in schwierigen Momenten tröstet.",
      example: "Er nimmt mich in den Arm und flüstert tröstende Worte.",
      blocks: [
        "Er nimmt mich in den Arm und flüstert tröstende Worte",
        "Er streichelt sanft mein Haar",
        "Er hält mich fest und gibt mir Sicherheit",
        "Er hört mir geduldig zu",
        "Er umarmt mich und lässt mich weinen",
        "Er ist einfach da und gibt mir Kraft",
        "Er erinnert mich an seine bedingungslose Liebe"
      ]
    },
    4: {
      question: "Welche freudige Aktivität teilt ihr miteinander?",
      prompt: "Beschreibe schöne, gemeinsame Momente mit Jesus.",
      example: "Wir sitzen zusammen und reden über alles.",
      blocks: [
        "Wir sitzen zusammen und reden über alles",
        "Wir machen zusammen einen Spaziergang",
        "Wir beten zusammen",
        "Wir schauen zusammen in die Natur",
        "Wir machen zusammen eine Massage",
        "Wir liegen zusammen und kuscheln",
        "Wir teilen ein einfaches Mahl"
      ]
    },
    5: {
      question: "Welche Unterstützung wünschst du dir von Jesus?",
      prompt: "Formuliere, was du dir von Jesus wünschst.",
      example: "Bitte bleib immer so liebevoll und verständnisvoll.",
      blocks: [
        "Bleib immer so liebevoll und verständnisvoll",
        "Sei immer da, wenn ich dich brauche",
        "Verstehe mich weiterhin so gut",
        "Vergebe mir weiterhin meine Fehler",
        "Führe mich weiterhin auf dem rechten Weg",
        "Lass mich immer bei dir willkommen sein",
        "Schenk mir weiterhin deine bedingungslose Liebe"
      ]
    },
    6: {
      question: "Was würde Jesus dir idealerweise sagen?",
      prompt: "Teile die tröstenden Sätze, die Jesus dir sagen würde.",
      example: "Du bist geliebt und wertvoll, genau so wie du bist.",
      blocks: [
        "Du bist geliebt und wertvoll, genau so wie du bist",
        "Ich bin immer für dich da, egal was passiert",
        "Du bist vergeben und angenommen",
        "Du hast einen besonderen Platz in meinem Herzen",
        "Ich werde dich nie verlassen",
        "Du bist mein geliebtes Kind",
        "Du bist wertvoll und verdienst Liebe und Frieden"
      ]
    }
  },

  // GÖTTLICHE MUTTER
  'divine-mother': {
    1: {
      question: "Wie sieht die Göttliche Mutter aus? Was strahlt sie aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung der Göttlichen Mutter.",
      example: "Sie hat allumfassende, liebevolle Augen und strahlt eine mütterliche Geborgenheit aus.",
      blocks: [
        "Allumfassende, liebevolle Augen voller Weisheit",
        "Sanfte, mütterliche Ausstrahlung",
        "Weiche, tröstende Hände",
        "Beruhigende, melodische Stimme",
        "Mütterliche Geborgenheit und Wärme",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich innerlich, wenn die Göttliche Mutter bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe der Göttlichen Mutter.",
      example: "Ich fühle mich vollständig geliebt und geborgen, als wäre alles gut.",
      blocks: [
        "Vollständig geliebt und geborgen",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Wie tröstet dich die Göttliche Mutter, wenn du Schmerz oder Angst spürst?",
      prompt: "Beschreibe, wie die Göttliche Mutter dich in schwierigen Momenten tröstet.",
      example: "Sie nimmt mich in den Arm und flüstert tröstende Worte.",
      blocks: [
        "Sie nimmt mich in den Arm und flüstert tröstende Worte",
        "Sie streichelt sanft mein Haar",
        "Sie hält mich fest und gibt mir Sicherheit",
        "Sie hört mir geduldig zu",
        "Sie umarmt mich und lässt mich weinen",
        "Sie ist einfach da und gibt mir Kraft",
        "Sie erinnert mich an ihre bedingungslose Liebe"
      ]
    },
    4: {
      question: "Welche freudige Aktivität teilt ihr miteinander?",
      prompt: "Beschreibe schöne, gemeinsame Momente mit der Göttlichen Mutter.",
      example: "Wir sitzen zusammen und reden über alles.",
      blocks: [
        "Wir sitzen zusammen und reden über alles",
        "Wir machen zusammen einen Spaziergang",
        "Wir beten zusammen",
        "Wir schauen zusammen in die Natur",
        "Wir machen zusammen eine Massage",
        "Wir liegen zusammen und kuscheln",
        "Wir teilen ein einfaches Mahl"
      ]
    },
    5: {
      question: "Welche Unterstützung wünschst du dir von der Göttlichen Mutter?",
      prompt: "Formuliere, was du dir von der Göttlichen Mutter wünschst.",
      example: "Bitte bleib immer so liebevoll und verständnisvoll.",
      blocks: [
        "Bleib immer so liebevoll und verständnisvoll",
        "Sei immer da, wenn ich dich brauche",
        "Verstehe mich weiterhin so gut",
        "Führe mich weiterhin auf dem rechten Weg",
        "Lass mich immer bei dir willkommen sein",
        "Schenk mir weiterhin deine bedingungslose Liebe",
        "Erinnere mich an meine göttliche Natur"
      ]
    },
    6: {
      question: "Was würde die Göttliche Mutter dir idealerweise sagen?",
      prompt: "Teile die tröstenden Sätze, die die Göttliche Mutter dir sagen würde.",
      example: "Du bist geliebt und wertvoll, genau so wie du bist.",
      blocks: [
        "Du bist geliebt und wertvoll, genau so wie du bist",
        "Ich bin immer für dich da, egal was passiert",
        "Du bist vergeben und angenommen",
        "Du hast einen besonderen Platz in meinem Herzen",
        "Ich werde dich nie verlassen",
        "Du bist mein geliebtes Kind",
        "Du bist wertvoll und verdienst Liebe und Frieden"
      ]
    }
  },

  // GÖTTLICHER VATER
  'divine-father': {
    1: {
      question: "Wie sieht der Göttliche Vater aus? Was strahlt er aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung des Göttlichen Vaters.",
      example: "Er hat starke, weise Augen und strahlt eine väterliche Stärke aus.",
      blocks: [
        "Starke, weise Augen voller Führung",
        "Väterliche, beschützende Ausstrahlung",
        "Ruhige, stabile Präsenz",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen",
        "Strahlende, göttliche Stärke",
        "Demütige, aber mächtige Präsenz"
      ]
    },
    2: {
      question: "Wie fühlst du dich innerlich, wenn der Göttliche Vater bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe des Göttlichen Vaters.",
      example: "Ich fühle mich vollständig beschützt und geführt.",
      blocks: [
        "Vollständig beschützt und geführt",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Wie tröstet dich der Göttliche Vater, wenn du Schmerz oder Angst spürst?",
      prompt: "Beschreibe, wie der Göttliche Vater dich in schwierigen Momenten tröstet.",
      example: "Er nimmt mich in den Arm und flüstert tröstende Worte.",
      blocks: [
        "Er nimmt mich in den Arm und flüstert tröstende Worte",
        "Er streichelt sanft mein Haar",
        "Er hält mich fest und gibt mir Sicherheit",
        "Er hört mir geduldig zu",
        "Er umarmt mich und lässt mich weinen",
        "Er ist einfach da und gibt mir Kraft",
        "Er erinnert mich an seine bedingungslose Liebe"
      ]
    },
    4: {
      question: "Welche freudige Aktivität teilt ihr miteinander?",
      prompt: "Beschreibe schöne, gemeinsame Momente mit dem Göttlichen Vater.",
      example: "Wir sitzen zusammen und reden über alles.",
      blocks: [
        "Wir sitzen zusammen und reden über alles",
        "Wir machen zusammen einen Spaziergang",
        "Wir beten zusammen",
        "Wir schauen zusammen in die Natur",
        "Wir machen zusammen eine Massage",
        "Wir liegen zusammen und kuscheln",
        "Wir teilen ein einfaches Mahl"
      ]
    },
    5: {
      question: "Welche Unterstützung wünschst du dir vom Göttlichen Vater?",
      prompt: "Formuliere, was du dir vom Göttlichen Vater wünschst.",
      example: "Bitte bleib immer so beschützend und führungsreich.",
      blocks: [
        "Bleib immer so beschützend und führungsreich",
        "Sei immer da, wenn ich dich brauche",
        "Verstehe mich weiterhin so gut",
        "Führe mich weiterhin auf dem rechten Weg",
        "Lass mich immer bei dir willkommen sein",
        "Schenk mir weiterhin deine bedingungslose Liebe",
        "Erinnere mich an meine göttliche Natur"
      ]
    },
    6: {
      question: "Was würde der Göttliche Vater dir idealerweise sagen?",
      prompt: "Teile die tröstenden Sätze, die der Göttliche Vater dir sagen würde.",
      example: "Du bist geliebt und wertvoll, genau so wie du bist.",
      blocks: [
        "Du bist geliebt und wertvoll, genau so wie du bist",
        "Ich bin immer für dich da, egal was passiert",
        "Du bist vergeben und angenommen",
        "Du hast einen besonderen Platz in meinem Herzen",
        "Ich werde dich nie verlassen",
        "Du bist mein geliebtes Kind",
        "Du bist wertvoll und verdienst Liebe und Frieden"
      ]
    }
  },

  // IDEAL-GROßFAMILIE
  'ideal-family': {
    1: {
      question: "Wie sieht deine Ideal-Großfamilie aus? Was strahlt sie aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung deiner perfekten Großfamilie.",
      example: "Sie strahlt eine warme, familiäre Geborgenheit aus.",
      blocks: [
        "Warme, familiäre Ausstrahlung",
        "Viele liebevolle Gesichter",
        "Beruhigende, melodische Stimmen",
        "Familiäre Geborgenheit und Wärme",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen",
        "Strahlende, bedingungslose Liebe"
      ]
    },
    2: {
      question: "Wie fühlst du dich innerlich, wenn deine Ideal-Großfamilie bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe deiner Ideal-Großfamilie.",
      example: "Ich fühle mich vollständig geliebt und geborgen, als wäre alles gut.",
      blocks: [
        "Vollständig geliebt und geborgen",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Wie tröstet dich deine Ideal-Großfamilie, wenn du Schmerz oder Angst spürst?",
      prompt: "Beschreibe, wie deine Ideal-Großfamilie dich in schwierigen Momenten tröstet.",
      example: "Sie nehmen mich in den Arm und flüstern tröstende Worte.",
      blocks: [
        "Sie nehmen mich in den Arm und flüstern tröstende Worte",
        "Sie streicheln sanft mein Haar",
        "Sie halten mich fest und geben mir Sicherheit",
        "Sie hören mir geduldig zu",
        "Sie umarmen mich und lassen mich weinen",
        "Sie sind einfach da und geben mir Kraft",
        "Sie erinnern mich an ihre bedingungslose Liebe"
      ]
    },
    4: {
      question: "Welche freudige Aktivität teilt ihr miteinander?",
      prompt: "Beschreibe schöne, gemeinsame Momente mit deiner Ideal-Großfamilie.",
      example: "Wir sitzen zusammen und reden über alles.",
      blocks: [
        "Wir sitzen zusammen und reden über alles",
        "Wir machen zusammen einen Spaziergang",
        "Wir beten zusammen",
        "Wir schauen zusammen in die Natur",
        "Wir machen zusammen eine Massage",
        "Wir liegen zusammen und kuscheln",
        "Wir teilen ein einfaches Mahl"
      ]
    },
    5: {
      question: "Welche Unterstützung wünschst du dir von deiner Ideal-Großfamilie?",
      prompt: "Formuliere, was du dir von deiner Ideal-Großfamilie wünschst.",
      example: "Bitte bleibt immer so liebevoll und verständnisvoll.",
      blocks: [
        "Bleibt immer so liebevoll und verständnisvoll",
        "Seid immer da, wenn ich euch brauche",
        "Versteht mich weiterhin so gut",
        "Führt mich weiterhin auf dem rechten Weg",
        "Lasst mich immer bei euch willkommen sein",
        "Schenkt mir weiterhin eure bedingungslose Liebe",
        "Erinnert mich an meine göttliche Natur"
      ]
    },
    6: {
      question: "Was würde deine Ideal-Großfamilie dir idealerweise sagen?",
      prompt: "Teile die tröstenden Sätze, die deine Ideal-Großfamilie dir sagen würde.",
      example: "Du bist geliebt und wertvoll, genau so wie du bist.",
      blocks: [
        "Du bist geliebt und wertvoll, genau so wie du bist",
        "Wir sind immer für dich da, egal was passiert",
        "Du bist vergeben und angenommen",
        "Du hast einen besonderen Platz in unserem Herzen",
        "Wir werden dich nie verlassen",
        "Du bist unser geliebtes Kind",
        "Du bist wertvoll und verdienst Liebe und Frieden"
      ]
    }
  },

  // IDEAL FIGURES
  'ideal-mother': {
    1: {
      question: "Wie sieht deine Ideal-Mutter aus? Was strahlt sie aus?",
      prompt: "Beschreibe das Aussehen und die Ausstrahlung deiner perfekten Mutter.",
      example: "Sie hat warme, liebevolle Augen und strahlt eine mütterliche Geborgenheit aus.",
      blocks: [
        "Warme, liebevolle Augen voller Verständnis",
        "Sanfte, mütterliche Ausstrahlung",
        "Weiche, tröstende Hände",
        "Beruhigende, melodische Stimme",
        "Mütterliche Geborgenheit und Wärme",
        "Trägt einen tiefen inneren Frieden in sich",
        "Schaut mich an, als würde ich wirklich zählen"
      ]
    },
    2: {
      question: "Wie fühlst du dich innerlich, wenn deine Ideal-Mutter bei dir ist?",
      prompt: "Beschreibe deine inneren Gefühle in der Nähe deiner Ideal-Mutter.",
      example: "Ich fühle mich vollständig geliebt und geborgen, als wäre alles gut.",
      blocks: [
        "Vollständig geliebt und geborgen",
        "Tief entspannt und sicher",
        "Verstanden und akzeptiert so wie ich bin",
        "Wärme und Geborgenheit in mir",
        "Ein echtes Gefühl von Zugehörigkeit",
        "Stabil und in jedem Moment unterstützt",
        "Vollständigkeit und Harmonie in mir"
      ]
    },
    3: {
      question: "Wie tröstet dich deine Ideal-Mutter, wenn du Schmerz oder Angst spürst?",
      prompt: "Beschreibe, wie deine Ideal-Mutter dich in schwierigen Momenten tröstet.",
      example: "Sie nimmt mich in den Arm und flüstert tröstende Worte.",
      blocks: [
        "Sie nimmt mich in den Arm und flüstert tröstende Worte",
        "Sie streichelt sanft mein Haar",
        "Sie hält mich fest und gibt mir Sicherheit",
        "Sie macht mir einen warmen Tee",
        "Sie hört mir geduldig zu",
        "Sie umarmt mich und lässt mich weinen",
        "Sie ist einfach da und gibt mir Kraft"
      ]
    },
    4: {
      question: "Welche freudige Aktivität teilt ihr miteinander?",
      prompt: "Beschreibe schöne, gemeinsame Momente mit deiner Ideal-Mutter.",
      example: "Wir backen zusammen Kuchen und genießen die Zeit.",
      blocks: [
        "Wir backen zusammen Kuchen und genießen die Zeit",
        "Wir sitzen zusammen und reden über alles",
        "Wir machen zusammen einen Spaziergang",
        "Wir kochen zusammen und probieren neue Rezepte",
        "Wir schauen zusammen Filme",
        "Wir machen zusammen eine Massage",
        "Wir liegen zusammen und kuscheln"
      ]
    },
    5: {
      question: "Welche Unterstützung wünschst du dir von deiner Ideal-Mutter?",
      prompt: "Formuliere, was du dir von deiner Ideal-Mutter wünschst.",
      example: "Bitte bleib immer so liebevoll und verständnisvoll.",
      blocks: [
        "Bleib immer so liebevoll und verständnisvoll",
        "Sei immer da, wenn ich dich brauche",
        "Verstehe mich weiterhin so gut",
        "Erinnere mich an meinen Wert",
        "Schenk mir weiterhin deine bedingungslose Liebe",
        "Bleib gesund und glücklich",
        "Lass mich immer bei dir willkommen sein"
      ]
    },
    6: {
      question: "Welche tröstenden Worte sagt dir deine Ideal-Mutter?",
      prompt: "Teile die liebevollen Sätze, die deine Ideal-Mutter dir sagt.",
      example: "Du bist mein Schatz und ich liebe dich bedingungslos.",
      blocks: [
        "Du bist mein Schatz und ich liebe dich bedingungslos",
        "Du bist genau richtig, so wie du bist",
        "Ich bin immer für dich da, egal was passiert",
        "Ich bin so stolz auf dich",
        "Du bist wunderschön, innen und außen",
        "Ich glaube fest an dich",
        "Du bist mein größtes Glück"
      ]
    }
  }
};

// Fallback zu den Standard-Antworten, wenn keine figurspezifischen Antworten vorhanden sind
export function getFigureSpecificBlocks(figureId: string, questionId: number): string[] {
  return figureSpecificData[figureId]?.[questionId]?.blocks || [];
}

// Neue Funktionen für individualisierte Fragen
export function getFigureSpecificQuestion(figureId: string, questionId: number): string | undefined {
  return figureSpecificData[figureId]?.[questionId]?.question;
}

export function getFigureSpecificPrompt(figureId: string, questionId: number): string | undefined {
  return figureSpecificData[figureId]?.[questionId]?.prompt;
}

export function getFigureSpecificExample(figureId: string, questionId: number): string | undefined {
  return figureSpecificData[figureId]?.[questionId]?.example;
}
