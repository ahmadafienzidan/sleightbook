import {
  AMBITIOUS_CARD,
  type IFixtureItem,
  type IFixturePhase,
  type IFixtureTechnique,
  type ITrickFixture,
} from "./ambitiousCard";
import { TRIUMPH_VERNON_PHASES } from "./triumph";

export interface ILibraryRoutineFixture {
  name: string;
  description: string;
  tips: string[];
  isDefault: boolean;
  items: string[];
  phases: IFixturePhase[];
}

export interface ILibraryTrickFixture {
  trick: ITrickFixture["trick"];
  note: string | null;
  routines: ILibraryRoutineFixture[];
}

export interface ILibraryFixture {
  techniques: IFixtureTechnique[];
  items: IFixtureItem[];
  tricks: ILibraryTrickFixture[];
}

const textPhase = (
  name: string,
  summary: string,
  explanation: string,
  spectatorText: string,
  techniques: string[] = [],
): IFixturePhase => ({ name, summary, explanation, spectatorText, techniques, actions: [] });

const TECHNIQUES: IFixtureTechnique[] = [
  ...AMBITIOUS_CARD.techniques,
  {
    name: "Elmsley Count",
    description: "Count four cards while secretly hiding one of them.",
    difficulty: "intermediate",
    category: "Count",
    tips: ["Keep the rhythm identical for every card."],
    commonMistakes: ["Flashing the hidden card on the third count."],
  },
  {
    name: "Top Change",
    description:
      "Switch the card in your hand for the top card of the deck during a natural gesture.",
    difficulty: "advanced",
    category: "Switch",
    tips: ["Motivate the move with a gesture toward the spectator."],
    commonMistakes: ["Looking at your hands during the switch."],
  },
  {
    name: "Riffle Shuffle",
    description: "Interlace two halves of the deck.",
    difficulty: "beginner",
    category: "Shuffle",
    tips: ["Keep the halves low and relaxed."],
    commonMistakes: ["Letting cards fly out of the riffle."],
  },
  {
    name: "Strip-Out Shuffle",
    description: "A false shuffle: the halves look interlaced but are stripped back apart.",
    difficulty: "advanced",
    category: "False Shuffle",
    tips: ["Strip out cleanly in one motion."],
    commonMistakes: ["Pausing before the strip-out."],
  },
  {
    name: "Packet Turnover",
    description: "Turn a packet over while controlling which cards actually reverse.",
    difficulty: "intermediate",
    category: "Control",
    tips: ["Cover the turnover with the squaring action."],
    commonMistakes: ["Exposing the edge of the reversed card."],
  },
  {
    name: "Classic Force",
    description: "Make a spectator take a predetermined card while the choice feels free.",
    difficulty: "advanced",
    category: "Force",
    tips: ["Time the spread to the spectator's reach."],
    commonMistakes: ["Spreading so slowly that the force looks deliberate."],
  },
  {
    name: "Coin Retention Vanish",
    description: "Apparently place a coin in the other hand while retaining it.",
    difficulty: "intermediate",
    category: "Vanish",
    tips: ["Follow the invisible coin with your eyes."],
    commonMistakes: ["Tensing the retaining hand."],
  },
  {
    name: "Thread Rise",
    description: "Use an invisible thread to make a card rise from the deck.",
    difficulty: "intermediate",
    category: "Gimmick",
    tips: ["Keep the thread taut before the rise."],
    commonMistakes: ["Performing against a busy background."],
  },
];

const ITEMS: IFixtureItem[] = [
  ...AMBITIOUS_CARD.items,
  {
    kind: "prop",
    name: "Four coins",
    description: "Four matching coins.",
    setupNotes: "Keep them together in one pocket.",
  },
  {
    kind: "prop",
    name: "Four playing cards",
    description: "Four cards used as covers.",
    setupNotes: "",
  },
  {
    kind: "prop",
    name: "Close-up mat",
    description: "A soft surface for card and coin work.",
    setupNotes: "",
  },
  {
    kind: "prop",
    name: "Prediction envelope",
    description: "A sealed envelope holding the prediction.",
    setupNotes: "Write the force card before the show and seal it.",
  },
  {
    kind: "gimmick",
    name: "Invisible thread",
    description: "Fine thread attached to the deck for the rise.",
    setupNotes: "Attach the thread before performing and test the tension.",
  },
];

export const LIBRARY_FIXTURE: ILibraryFixture = {
  techniques: TECHNIQUES,
  items: ITEMS,
  tricks: [
    {
      trick: AMBITIOUS_CARD.trick,
      note: AMBITIOUS_CARD.trickNote,
      routines: [
        {
          name: AMBITIOUS_CARD.routine.name,
          description: AMBITIOUS_CARD.routine.description,
          tips: AMBITIOUS_CARD.routine.tips,
          isDefault: true,
          items: ["Deck of cards"],
          phases: AMBITIOUS_CARD.phases,
        },
        {
          name: "Elmsley Version",
          description: "The card rises inside a small packet, using an Elmsley count to hide it.",
          tips: ["Keep the count rhythm steady."],
          isDefault: false,
          items: ["Deck of cards"],
          phases: [
            textPhase(
              "Setup",
              "Prepare the packet",
              "Deal four cards from the top; the selection is secretly among them.",
              "Four cards are taken from the deck.",
            ),
            textPhase(
              "Elmsley Count",
              "Hidden card",
              "Count the packet as four cards while hiding the selection.",
              "The four cards are shown; the selection is not among them.",
              ["Elmsley Count"],
            ),
            textPhase(
              "Reveal",
              "Card on top",
              "Turn over the top card of the packet: it is the selection.",
              "The selection is back on top.",
            ),
          ],
        },
        {
          name: "Top Change Version",
          description: "The card jumps back to the top through a top change.",
          tips: ["Make the switch during a natural gesture."],
          isDefault: false,
          items: ["Deck of cards"],
          phases: [
            textPhase(
              "Show",
              "Card on top",
              "Show the selection on top with a double lift.",
              "The selection is shown on top.",
              ["Double Lift"],
            ),
            textPhase(
              "Top Change",
              "The switch",
              "While gesturing, switch the card in your hand for the top card of the deck.",
              "The selection is held away from the deck.",
              ["Top Change"],
            ),
            textPhase(
              "Reveal",
              "Card is back",
              "Turn over the top card: the selection is back.",
              "The selection has jumped back to the top.",
            ),
          ],
        },
      ],
    },
    {
      trick: {
        name: "Triumph",
        slug: "triumph",
        description:
          "Face-up and face-down cards are shuffled together, yet with a snap every card rights itself — except the selection.",
        category: "card",
        difficulty: "intermediate",
        durationMin: 4,
        durationMax: 6,
      },
      note: null,
      routines: [
        {
          name: "Vernon",
          description: "Dai Vernon's classic handling with a strip-out shuffle.",
          tips: [
            "Let the mix look genuinely messy.",
            "Square the deck slowly during the correction.",
          ],
          isDefault: true,
          items: ["Deck of cards", "Close-up mat"],
          phases: TRIUMPH_VERNON_PHASES,
        },
      ],
    },
    {
      trick: {
        name: "Oil & Water",
        slug: "oil-and-water",
        description: "Red and black cards are mixed, yet they keep separating like oil and water.",
        category: "card",
        difficulty: "advanced",
        durationMin: 3,
        durationMax: 5,
      },
      note: null,
      routines: [
        {
          name: "Standard",
          description: "Six cards, three red and three black, separate three times.",
          tips: ["Slow down the final separation."],
          isDefault: true,
          items: ["Deck of cards"],
          phases: [
            textPhase(
              "Display",
              "Alternate colors",
              "Show three red and three black cards alternated.",
              "Red and black cards are mixed.",
            ),
            textPhase(
              "Elmsley Count",
              "Hidden order",
              "Use Elmsley counts to show alternating colors while the packet is already separated.",
              "The cards are still alternating.",
              ["Elmsley Count"],
            ),
            textPhase(
              "Separation",
              "Colors separate",
              "Spread the packet: reds and blacks have separated.",
              "The colors separate on their own.",
              ["Spread"],
            ),
          ],
        },
      ],
    },
    {
      trick: {
        name: "Coin Matrix",
        slug: "coin-matrix",
        description: "Four coins under four cards gather one by one under a single card.",
        category: "coin",
        difficulty: "advanced",
        durationMin: 4,
        durationMax: 6,
      },
      note: null,
      routines: [
        {
          name: "Standard",
          description: "Classic four-coin matrix on a close-up mat.",
          tips: ["Keep the rhythm of lifting and covering identical."],
          isDefault: true,
          items: ["Four coins", "Four playing cards", "Close-up mat"],
          phases: [
            textPhase(
              "Setup",
              "Four corners",
              "Place a coin at each corner of the mat and cover each with a card.",
              "Four coins, four cards.",
            ),
            textPhase(
              "First Travel",
              "One coin moves",
              "While lifting a card, retain one coin and load it under the target card.",
              "A coin vanishes and joins another.",
              ["Coin Retention Vanish"],
            ),
            textPhase(
              "Gathering",
              "Coins gather",
              "Repeat the load for the remaining coins.",
              "One by one the coins gather under one card.",
              ["Coin Retention Vanish"],
            ),
            textPhase(
              "Reveal",
              "All together",
              "Lift the last card to show all four coins.",
              "All four coins are together.",
            ),
          ],
        },
      ],
    },
    {
      trick: {
        name: "Thought Card",
        slug: "thought-card",
        description: "A freely chosen card matches a prediction made before the performance.",
        category: "mentalism",
        difficulty: "intermediate",
        durationMin: 3,
        durationMax: 5,
      },
      note: null,
      routines: [
        {
          name: "Classic Force & Prediction",
          description: "A sealed prediction and a classic force.",
          tips: ["Place the envelope in view before the force."],
          isDefault: true,
          items: ["Deck of cards", "Prediction envelope"],
          phases: [
            textPhase(
              "Prediction",
              "Sealed envelope",
              "Place the envelope holding the prediction in view.",
              "A prediction is set aside.",
            ),
            textPhase(
              "Force",
              "Free choice",
              "Classic force the predicted card.",
              "The spectator freely takes a card.",
              ["Classic Force"],
            ),
            textPhase(
              "Reveal",
              "It matches",
              "Open the envelope: the prediction matches.",
              "The prediction matches the chosen card.",
            ),
          ],
        },
      ],
    },
    {
      trick: {
        name: "Rising Card",
        slug: "rising-card",
        description: "The chosen card rises out of the deck on command.",
        category: "gimmick",
        difficulty: "intermediate",
        durationMin: 2,
        durationMax: 4,
      },
      note: null,
      routines: [
        {
          name: "Thread Rise",
          description: "An invisible thread lifts the selection.",
          tips: ["Perform against a plain background."],
          isDefault: true,
          items: ["Deck of cards", "Invisible thread"],
          phases: [
            textPhase(
              "Setup",
              "Rigged deck",
              "The thread is attached; control the selection to the threaded position.",
              "A card is chosen and returned.",
            ),
            textPhase(
              "Rise",
              "On command",
              "Move the hand slightly to tension the thread; the card rises.",
              "The card rises by itself.",
              ["Thread Rise"],
            ),
            textPhase(
              "Clean Up",
              "Nothing to see",
              "Remove the card and ditch the thread.",
              "The card is handed out for examination.",
            ),
          ],
        },
      ],
    },
  ],
};
