import type { IFixturePhase } from "./ambitiousCard";

// Vernon's Triumph, simplified (spec §3.4). The user verified this order.
export const TRIUMPH_VERNON_PHASES: IFixturePhase[] = [
  {
    name: "Selection",
    summary: "Card chosen",
    explanation: "The selection (4♠) is secretly controlled to the top of the deck.",
    spectatorText: "A card is chosen and lost in the deck.",
    techniques: [],
    actions: [
      {
        action: { type: "setupPackets", params: { selection: { label: "4S" }, count: 52 } },
        durationMs: 700,
      },
    ],
  },
  {
    name: "Cut & Turn",
    summary: "Half face up",
    explanation:
      "Cut the deck into halves. Turn the half holding the 4♠ face up — except the 4♠ itself, which stays face down, reversed within its half.",
    spectatorText: "The deck is cut and one half is turned face up.",
    techniques: ["Packet Turnover"],
    actions: [
      { action: { type: "cutHalves", params: {} }, durationMs: 700 },
      {
        action: { type: "turnPacket", params: { packet: "left", keepTop: true, covert: false } },
        durationMs: 800,
      },
    ],
  },
  {
    name: "The Shuffle",
    summary: "Apparently mixed",
    explanation: "A strip-out shuffle: the halves only look interlaced and stay separate.",
    spectatorText: "The face-up and face-down halves are shuffled together.",
    techniques: ["Riffle Shuffle", "Strip-Out Shuffle"],
    actions: [{ action: { type: "riffle", params: { mode: "stripOut" } }, durationMs: 1000 }],
  },
  {
    name: "Secret Correction",
    summary: "Nothing to see",
    explanation:
      "While squaring, secretly turn the face-up half over. Now every card faces down — except the 4♠.",
    spectatorText: "The deck is squared. Nothing seems to happen.",
    techniques: ["Packet Turnover"],
    actions: [
      {
        action: { type: "turnPacket", params: { packet: "left", keepTop: false, covert: true } },
        durationMs: 800,
      },
    ],
  },
  {
    name: "Triumph",
    summary: "Order restored",
    explanation:
      "Snap and spread: every card faces down except the 4♠ — the only reversed card since the cut.",
    spectatorText: "With a snap, every card rights itself — except the selection, face up.",
    techniques: ["Spread"],
    actions: [
      { action: { type: "snap", params: {} }, durationMs: 600 },
      { action: { type: "spreadReveal", params: {} }, durationMs: 900 },
    ],
  },
];
