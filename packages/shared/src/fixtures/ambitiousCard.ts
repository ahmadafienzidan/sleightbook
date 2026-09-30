import type { TAction } from "../schemas/action";
import type { TCategory, TDifficulty, TItemKind } from "../schemas/enums";

export interface IFixtureAction {
  action: TAction;
  durationMs: number;
}

export interface IFixturePhase {
  name: string;
  summary: string;
  explanation: string;
  spectatorText: string;
  techniques: string[];
  actions: IFixtureAction[];
}

export interface IFixtureTechnique {
  name: string;
  description: string;
  difficulty: TDifficulty;
  category: string;
  tips: string[];
  commonMistakes: string[];
}

export interface IFixtureItem {
  kind: TItemKind;
  name: string;
  description: string;
  setupNotes: string;
}

export interface ITrickFixture {
  trick: {
    name: string;
    slug: string;
    description: string;
    category: TCategory;
    difficulty: TDifficulty;
    durationMin: number;
    durationMax: number;
  };
  routine: { name: string; description: string; tips: string[] };
  techniques: IFixtureTechnique[];
  items: IFixtureItem[];
  phases: IFixturePhase[];
  trickNote: string;
}

export const AMBITIOUS_CARD: ITrickFixture = {
  trick: {
    name: "Ambitious Card",
    slug: "ambitious-card",
    description:
      "A single card keeps rising to the top of the deck, no matter how many times it is lost. The impossible happens, again and again.",
    category: "card",
    difficulty: "intermediate",
    durationMin: 5,
    durationMax: 8,
  },
  routine: {
    name: "Standard",
    description: "The classic double-lift version with a single insertion and a fan reveal.",
    tips: [
      "Keep your hands relaxed and natural.",
      "Use misdirection during the snap.",
      "Practice the double lift until it is smooth.",
      "Give the reveal enough space.",
    ],
  },
  techniques: [
    {
      name: "Double Lift",
      description: "Lift two cards as if they were one.",
      difficulty: "intermediate",
      category: "Control",
      tips: ["Get a small break first.", "Square the pair before turning it."],
      commonMistakes: ["Flashing the second card during the turnover."],
    },
    {
      name: "Card Insertion",
      description: "Push a card cleanly into the middle of the deck.",
      difficulty: "beginner",
      category: "Control",
      tips: ["Leave the card jogged so the audience sees it go in."],
      commonMistakes: ["Rushing the insertion."],
    },
    {
      name: "Snap",
      description: "A clear audible beat that marks the magic moment.",
      difficulty: "beginner",
      category: "Beat",
      tips: ["Look at the deck, not at your hand."],
      commonMistakes: ["Snapping before the deck is squared."],
    },
    {
      name: "Spread",
      description: "Fan the deck to display the ending cleanly.",
      difficulty: "beginner",
      category: "Display",
      tips: ["Keep the fan even so the face-up card stands out."],
      commonMistakes: ["Spreading too fast to read."],
    },
  ],
  items: [
    {
      kind: "prop",
      name: "Deck of cards",
      description: "A regular 52-card deck.",
      setupNotes: "No preparation needed before the performance.",
    },
  ],
  phases: [
    {
      name: "Preparation",
      summary: "Set the scene",
      explanation:
        "An indifferent card (7♣) sits on top. The selected card (A♥) is secretly second from the top.",
      spectatorText: "The selected card is placed on top of the deck.",
      techniques: [],
      actions: [
        {
          action: {
            type: "setupDeck",
            params: { named: [{ label: "7C" }, { label: "AH" }], restCount: 50 },
          },
          durationMs: 700,
        },
      ],
    },
    {
      name: "Double Lift",
      summary: "Secret handling",
      explanation:
        "Lift the top two cards as one and turn them face up. The spectator sees A♥, but two cards are held as a single unit.",
      spectatorText: "The selected card is shown on top of the deck.",
      techniques: ["Double Lift"],
      actions: [
        { action: { type: "doubleLift", params: { count: 2 } }, durationMs: 800 },
        { action: { type: "turnOver", params: { target: "lifted" } }, durationMs: 700 },
      ],
    },
    {
      name: "Insert",
      summary: "Apparently lost",
      explanation:
        "Turn the pair face down and square it on the deck. Take only the top card — the 7♣ — and push it into the middle. A♥ stays on top.",
      spectatorText: "The selected card is pushed into the middle of the deck.",
      techniques: ["Double Lift", "Card Insertion"],
      actions: [
        { action: { type: "turnOver", params: { target: "lifted" } }, durationMs: 700 },
        { action: { type: "replace", params: {} }, durationMs: 500 },
        { action: { type: "takeTop", params: { count: 1 } }, durationMs: 600 },
        { action: { type: "insert", params: { depth: "middle" } }, durationMs: 800 },
      ],
    },
    {
      name: "Snap",
      summary: "Magical beat",
      explanation:
        "Nothing secret happens. Square the deck and snap your fingers to mark the magic moment.",
      spectatorText: "A snap — the magic happens.",
      techniques: ["Snap"],
      actions: [{ action: { type: "snap", params: {} }, durationMs: 600 }],
    },
    {
      name: "Fan Reveal",
      summary: "Final display",
      explanation:
        "Turn over the top card: it is A♥, which never left. Spread the deck to show the ending cleanly.",
      spectatorText: "The selected card is back on top.",
      techniques: ["Spread"],
      actions: [
        { action: { type: "revealTop", params: {} }, durationMs: 700 },
        { action: { type: "spread", params: {} }, durationMs: 900 },
      ],
    },
  ],
  trickNote: "Need to practice close-up handling and slow down the snap moment.",
};
