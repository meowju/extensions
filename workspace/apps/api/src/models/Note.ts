import type { Note, CreateNoteInput, UpdateNoteInput } from '../types/index.js';

class NoteModel {
  private notes: Map<string, Note> = new Map();

  generateId(): string {
    return `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async create(userId: string, input: CreateNoteInput): Promise<Note> {
    const now = new Date();
    const note: Note = {
      id: this.generateId(),
      userId,
      title: input.title,
      content: input.content,
      createdAt: now,
      updatedAt: now,
    };
    this.notes.set(note.id, note);
    return note;
  }

  async findById(id: string): Promise<Note | undefined> {
    return this.notes.get(id);
  }

  async findByUserId(userId: string): Promise<Note[]> {
    const result: Note[] = [];
    for (const note of this.notes.values()) {
      if (note.userId === userId) result.push(note);
    }
    return result;
  }

  async findAll(): Promise<Note[]> {
    return Array.from(this.notes.values());
  }

  async update(id: string, data: UpdateNoteInput): Promise<Note | undefined> {
    const note = this.notes.get(id);
    if (!note) return undefined;
    
    const updated: Note = {
      ...note,
      ...data,
      updatedAt: new Date(),
    };
    this.notes.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.notes.delete(id);
  }

  async deleteByUserId(userId: string): Promise<number> {
    let count = 0;
    for (const [id, note] of this.notes.entries()) {
      if (note.userId === userId) {
        this.notes.delete(id);
        count++;
      }
    }
    return count;
  }

  async clear(): Promise<void> {
    this.notes.clear();
  }
}

export const noteModel = new NoteModel();
