import { type ChangeEvent, type FormEvent, useState } from "react";

import { useTranslation } from "react-i18next";

import type { INote } from "@sleightbook/shared/schemas/note";

import { doCreateNote, doDeleteNote, doUpdateNote } from "../../business/noteBusiness";
import type { TNoteTarget } from "../../types/note.types";
import { Panel } from "../Panel/Panel";

interface NotesPanelProps {
  title: string;
  notes: INote[];
  target: TNoteTarget;
}

export const NotesPanel = ({ title, notes, target }: NotesPanelProps) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleDraftChange = (event: ChangeEvent<HTMLTextAreaElement>) =>
    setDraft(event.target.value);
  const handleEditingBodyChange = (event: ChangeEvent<HTMLTextAreaElement>) =>
    setEditingBody(event.target.value);
  const handleEditStart = (note: INote) => {
    setEditingId(note.id);
    setEditingBody(note.body);
  };
  const handleEditCancel = () => setEditingId(null);
  const handleAddSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setIsSaving(true);
    const isSaved = await doCreateNote({ body, ...target });
    setIsSaving(false);
    if (isSaved) setDraft("");
  };
  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = editingBody.trim();
    if (!editingId || !body) return;
    setIsSaving(true);
    const isSaved = await doUpdateNote(editingId, body);
    setIsSaving(false);
    if (isSaved) setEditingId(null);
  };
  const handleDelete = async (noteId: string) => {
    if (isSaving) return;
    setIsSaving(true);
    await doDeleteNote(noteId);
    setIsSaving(false);
  };

  return (
    <Panel title={title}>
      {notes.length === 0 && <p className="text-sm text-muted">{t("notes.empty")}</p>}
      <ul className="space-y-2">
        {notes.map((note) => (
          <li
            key={note.id}
            className="rounded-md border border-gold-dim/50 bg-panel-2 p-2.5 text-sm"
          >
            {editingId === note.id ? (
              <form onSubmit={handleEditSubmit} className="space-y-2">
                <textarea
                  aria-label={t("notes.editLabel")}
                  value={editingBody}
                  onChange={handleEditingBodyChange}
                  rows={3}
                  className="field"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={isSaving} className="btn-primary">
                    {t("notes.save")}
                  </button>
                  <button type="button" onClick={handleEditCancel} className="btn-secondary">
                    {t("notes.cancel")}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p className="whitespace-pre-wrap text-fg">{note.body}</p>
                <div className="mt-2 flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => handleEditStart(note)}
                    disabled={isSaving}
                    className="text-muted hover:text-gold-2"
                  >
                    {t("notes.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(note.id)}
                    disabled={isSaving}
                    className="text-muted hover:text-danger"
                  >
                    {t("notes.delete")}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={handleAddSubmit} className="mt-3 space-y-2">
        <textarea
          aria-label={t("notes.placeholder")}
          placeholder={t("notes.placeholder")}
          value={draft}
          onChange={handleDraftChange}
          rows={2}
          className="field"
        />
        <button type="submit" disabled={isSaving || draft.trim() === ""} className="btn-secondary">
          {t("notes.add")}
        </button>
      </form>
    </Panel>
  );
};
