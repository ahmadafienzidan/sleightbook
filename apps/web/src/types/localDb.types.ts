import type { z } from "zod";

import type { LocalDatabaseV1Schema, LocalDatabaseV2Schema } from "../api/localSchemas";

export type ILocalDatabaseV2 = z.infer<typeof LocalDatabaseV2Schema>;
export type ILocalDatabaseV1 = z.infer<typeof LocalDatabaseV1Schema>;
