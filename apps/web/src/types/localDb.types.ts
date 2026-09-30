import type { z } from "zod";

import type {
  LocalDatabaseV1Schema,
  LocalDatabaseV2Schema,
  PhaseRecordSchema,
  RoutineRecordSchema,
  TrickRecordSchema,
} from "../api/localSchemas";

export type IPhaseRecord = z.infer<typeof PhaseRecordSchema>;
export type IRoutineRecord = z.infer<typeof RoutineRecordSchema>;
export type ITrickRecord = z.infer<typeof TrickRecordSchema>;
export type ILocalDatabaseV2 = z.infer<typeof LocalDatabaseV2Schema>;
export type ILocalDatabaseV1 = z.infer<typeof LocalDatabaseV1Schema>;
