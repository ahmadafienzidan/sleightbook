import { z } from "zod";

const EmptyParamsSchema = z.strictObject({});

export const ActionSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("setupDeck"),
    params: z.strictObject({
      named: z
        .array(z.strictObject({ label: z.string().min(1).max(8) }))
        .min(1)
        .max(8),
      restCount: z.number().int().min(0).max(60),
    }),
  }),
  z.strictObject({
    type: z.literal("doubleLift"),
    params: z.strictObject({ count: z.number().int().min(2).max(4) }),
  }),
  z.strictObject({
    type: z.literal("turnOver"),
    params: z.strictObject({ target: z.enum(["lifted", "top"]) }),
  }),
  z.strictObject({ type: z.literal("replace"), params: EmptyParamsSchema }),
  z.strictObject({
    type: z.literal("takeTop"),
    params: z.strictObject({ count: z.number().int().min(1).max(4) }),
  }),
  z.strictObject({
    type: z.literal("insert"),
    params: z.strictObject({ depth: z.literal("middle") }),
  }),
  z.strictObject({ type: z.literal("square"), params: EmptyParamsSchema }),
  z.strictObject({ type: z.literal("snap"), params: EmptyParamsSchema }),
  z.strictObject({ type: z.literal("revealTop"), params: EmptyParamsSchema }),
  z.strictObject({ type: z.literal("spread"), params: EmptyParamsSchema }),
  z.strictObject({
    type: z.literal("setupPackets"),
    params: z.strictObject({
      selection: z.strictObject({ label: z.string().min(1).max(8) }),
      count: z.number().int().min(20).max(52),
    }),
  }),
  z.strictObject({ type: z.literal("cutHalves"), params: EmptyParamsSchema }),
  z.strictObject({
    type: z.literal("turnPacket"),
    params: z.strictObject({
      packet: z.enum(["left", "right"]),
      keepTop: z.boolean(),
      covert: z.boolean(),
    }),
  }),
  z.strictObject({
    type: z.literal("riffle"),
    params: z.strictObject({ mode: z.literal("stripOut") }),
  }),
  z.strictObject({ type: z.literal("spreadReveal"), params: EmptyParamsSchema }),
]);

export type TAction = z.infer<typeof ActionSchema>;
export type TActionType = TAction["type"];

export const PACKET_ACTION_TYPES = ["cutHalves", "turnPacket", "riffle", "spreadReveal"] as const;
export type TPacketActionType = (typeof PACKET_ACTION_TYPES)[number];
