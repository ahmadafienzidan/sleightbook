import type { z } from "zod";

import { LIBRARY_FIXTURE } from "@sleightbook/shared/fixtures/library";
import {
  toItemDetail,
  toItemSummary,
  toRoutineDetail,
  toTechniqueDetail,
  toTechniqueSummary,
  toTrickCard,
  toTrickDetail,
  toTrickSummary,
} from "@sleightbook/shared/library/assemble";
import { buildLibrarySnapshot } from "@sleightbook/shared/library/buildSnapshot";
import type { IRoutineRecord, ITrickRecord } from "@sleightbook/shared/library/records";
import { matchesQuery } from "@sleightbook/shared/library/search";
import type { IItemDetail, IItemSummary } from "@sleightbook/shared/schemas/item";
import {
  CreateNoteSchema,
  type ICreateNoteInput,
  type INote,
  UpdateNoteSchema,
} from "@sleightbook/shared/schemas/note";
import type { IRoutineDetail, ITechnique } from "@sleightbook/shared/schemas/routine";
import type { ITechniqueDetail, ITechniqueSummary } from "@sleightbook/shared/schemas/technique";
import {
  type IItem,
  type ILibraryQuery,
  LibraryQuerySchema,
  type ITrickCard,
  type ITrickDetail,
  type ITrickSummary,
} from "@sleightbook/shared/schemas/trick";

import type { ILocalDatabaseV2 } from "../types/localDb.types";
import { ApiError } from "./apiError";
import { LocalDatabaseV1Schema, LocalDatabaseV2Schema } from "./localSchemas";
import { migrateV1 } from "./migrateV1";
import { getBrowserStorage, type IStorageLike } from "./storage";

export const DB_STORAGE_KEY = "sleightbook.db.v2";
export const LEGACY_STORAGE_KEY = "sleightbook.db.v1";

interface ILocalDbOptions {
  storage: IStorageLike;
  newId: () => string;
  now: () => string;
}

const notFound = (entity: string): ApiError =>
  new ApiError(404, "NOT_FOUND", `${entity} not found`);

const validationError = (error: z.ZodError): ApiError =>
  new ApiError(400, "VALIDATION", error.issues.map((issue) => issue.message).join("; "));

const byName = <T extends { name: string }>(a: T, b: T): number => a.name.localeCompare(b.name);

export const createLocalDb = ({ storage, newId, now }: ILocalDbOptions) => {
  const save = (database: ILocalDatabaseV2): void =>
    storage.setItem(DB_STORAGE_KEY, JSON.stringify(database));

  const readStored = (raw: string): ILocalDatabaseV2 | null => {
    try {
      const parsed = LocalDatabaseV2Schema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  };

  const migrateLegacy = (target: ILocalDatabaseV2): void => {
    const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return;
    const legacy = (() => {
      try {
        const parsed = LocalDatabaseV1Schema.safeParse(JSON.parse(legacyRaw));
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    })();
    if (legacy) {
      migrateV1(legacy, target, newId);
      storage.setItem(`${LEGACY_STORAGE_KEY}.migrated`, legacyRaw);
    } else {
      const backupKey = `${LEGACY_STORAGE_KEY}.backup-${now()}`;
      storage.setItem(backupKey, legacyRaw);
      console.warn(
        `Sleightbook: old local data was unreadable; a backup was saved under ${backupKey}.`,
      );
    }
    storage.removeItem(LEGACY_STORAGE_KEY);
  };

  const load = (): ILocalDatabaseV2 => {
    const raw = storage.getItem(DB_STORAGE_KEY);
    if (raw) {
      const stored = readStored(raw);
      if (stored) return stored;
      const backupKey = `${DB_STORAGE_KEY}.backup-${now()}`;
      storage.setItem(backupKey, raw);
      console.warn(
        `Sleightbook: local data was unreadable; a backup was saved under ${backupKey} and the data was reset.`,
      );
    }
    const seeded: ILocalDatabaseV2 = {
      version: 2,
      ...buildLibrarySnapshot(LIBRARY_FIXTURE, newId, now()),
    };
    if (!raw) migrateLegacy(seeded);
    save(seeded);
    return seeded;
  };

  const findTrick = (db: ILocalDatabaseV2, id: string): ITrickRecord => {
    const trick = db.tricks.find((candidate) => candidate.id === id);
    if (!trick) throw notFound("Trick");
    return trick;
  };

  const findRoutine = (db: ILocalDatabaseV2, id: string): IRoutineRecord => {
    const routine = db.routines.find((candidate) => candidate.id === id);
    if (!routine) throw notFound("Routine");
    return routine;
  };

  const findTechnique = (db: ILocalDatabaseV2, id: string): ITechnique => {
    const technique = db.techniques.find((candidate) => candidate.id === id);
    if (!technique) throw notFound("Technique");
    return technique;
  };

  const findItem = (db: ILocalDatabaseV2, id: string): IItem => {
    const item = db.items.find((candidate) => candidate.id === id);
    if (!item) throw notFound("Item");
    return item;
  };

  const findNoteIndex = (db: ILocalDatabaseV2, id: string): number => {
    const index = db.notes.findIndex((note) => note.id === id);
    if (index < 0) throw notFound("Note");
    return index;
  };

  const targetExists = (db: ILocalDatabaseV2, input: ICreateNoteInput): boolean => {
    if (input.trickId) return db.tricks.some((trick) => trick.id === input.trickId);
    if (input.phaseId) {
      return db.routines.some((routine) =>
        routine.phases.some((phase) => phase.id === input.phaseId),
      );
    }
    if (input.techniqueId)
      return db.techniques.some((technique) => technique.id === input.techniqueId);
    if (input.itemId) return db.items.some((item) => item.id === input.itemId);
    return false;
  };

  return {
    listTricks: (): ITrickSummary[] => load().tricks.map(toTrickSummary).sort(byName),

    searchTricks: (query: ILibraryQuery): ITrickCard[] => {
      const parsed = LibraryQuerySchema.safeParse(query);
      if (!parsed.success) throw validationError(parsed.error);
      const db = load();
      return structuredClone(
        db.tricks
          .filter((trick) => matchesQuery(db, trick, parsed.data))
          .map((trick) => toTrickCard(db, trick))
          .sort(byName),
      );
    },

    getTrick: (id: string): ITrickDetail => {
      const db = load();
      return structuredClone(toTrickDetail(db, findTrick(db, id)));
    },

    setFavorite: (id: string, isFavorite: boolean): ITrickDetail => {
      const db = load();
      const trick = findTrick(db, id);
      trick.isFavorite = isFavorite;
      save(db);
      return structuredClone(toTrickDetail(db, trick));
    },

    getRoutine: (id: string): IRoutineDetail => {
      const db = load();
      return structuredClone(toRoutineDetail(db, findRoutine(db, id)));
    },

    listTechniques: (): ITechniqueSummary[] => {
      const db = load();
      return structuredClone(
        db.techniques.map((technique) => toTechniqueSummary(db, technique)).sort(byName),
      );
    },

    getTechnique: (id: string): ITechniqueDetail => {
      const db = load();
      return structuredClone(toTechniqueDetail(db, findTechnique(db, id)));
    },

    listItems: (): IItemSummary[] => {
      const db = load();
      return structuredClone(db.items.map((item) => toItemSummary(db, item)).sort(byName));
    },

    getItem: (id: string): IItemDetail => {
      const db = load();
      return structuredClone(toItemDetail(db, findItem(db, id)));
    },

    createNote: (input: ICreateNoteInput): INote => {
      const parsed = CreateNoteSchema.safeParse(input);
      if (!parsed.success) throw validationError(parsed.error);
      if (parsed.data.routineId) {
        throw new ApiError(400, "NOT_SUPPORTED", "Local mode does not support routine notes");
      }
      const db = load();
      if (!targetExists(db, parsed.data)) throw notFound("Note target");
      const timestamp = now();
      const note: INote = {
        id: newId(),
        body: parsed.data.body,
        trickId: parsed.data.trickId ?? null,
        routineId: null,
        phaseId: parsed.data.phaseId ?? null,
        techniqueId: parsed.data.techniqueId ?? null,
        itemId: parsed.data.itemId ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.notes.push(note);
      save(db);
      return structuredClone(note);
    },

    updateNote: (id: string, body: string): INote => {
      const parsed = UpdateNoteSchema.safeParse({ body });
      if (!parsed.success) throw validationError(parsed.error);
      const db = load();
      const index = findNoteIndex(db, id);
      const updated: INote = { ...db.notes[index], body: parsed.data.body, updatedAt: now() };
      db.notes[index] = updated;
      save(db);
      return structuredClone(updated);
    },

    deleteNote: (id: string): void => {
      const db = load();
      db.notes.splice(findNoteIndex(db, id), 1);
      save(db);
    },
  };
};

export type TLocalDb = ReturnType<typeof createLocalDb>;

// App instance. Replaced by the Hono client once the API (Part 2) exists.
export const localDb = createLocalDb({
  storage: getBrowserStorage(),
  newId: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
});
