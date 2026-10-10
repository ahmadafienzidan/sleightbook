import type { z } from "zod";

import { ApiErrorSchema } from "@sleightbook/shared/schemas/error";
import { type ICreateNoteInput, NoteSchema } from "@sleightbook/shared/schemas/note";
import { RoutineDetailSchema } from "@sleightbook/shared/schemas/routine";
import { TrickDetailSchema, TrickSummarySchema } from "@sleightbook/shared/schemas/trick";

import { ApiError } from "./apiError";

type THttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

// Talks to apps/api; same methods as the local data layer for the calls the web makes.
export const createHttpDb = (baseUrl: string, fetchFn: typeof fetch) => {
  const send = async (method: THttpMethod, path: string, body?: unknown): Promise<Response> => {
    const response = await fetchFn(
      `${baseUrl}${path}`,
      body === undefined
        ? { method }
        : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    if (!response.ok) {
      const { error } = ApiErrorSchema.parse(await response.json());
      throw new ApiError(response.status, error.code, error.message);
    }
    return response;
  };

  const read = async <TSchema extends z.ZodType>(
    schema: TSchema,
    method: THttpMethod,
    path: string,
    body?: unknown,
  ): Promise<z.output<TSchema>> => schema.parse(await (await send(method, path, body)).json());

  return {
    listTricks: () => read(TrickSummarySchema.array(), "GET", "/tricks"),

    getTrick: (id: string) => read(TrickDetailSchema, "GET", `/tricks/${id}`),

    setFavorite: (id: string, isFavorite: boolean) =>
      read(TrickDetailSchema, "PATCH", `/tricks/${id}`, { isFavorite }),

    getRoutine: (id: string) => read(RoutineDetailSchema, "GET", `/routines/${id}`),

    createNote: (input: ICreateNoteInput) => read(NoteSchema, "POST", "/notes", input),

    updateNote: (id: string, body: string) => read(NoteSchema, "PATCH", `/notes/${id}`, { body }),

    deleteNote: async (id: string): Promise<void> => {
      await send("DELETE", `/notes/${id}`);
    },
  };
};
