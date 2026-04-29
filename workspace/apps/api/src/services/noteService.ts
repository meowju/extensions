import { noteModel } from '../models/Note.js';
import type { Note, CreateNoteInput, UpdateNoteInput } from '../types/index.js';

export class NoteService {
  async create(userId: string, input: CreateNoteInput): Promise<Note> {
    return noteModel.create(userId, input);
  }

  async findAll(): Promise<Note[]> {
    return noteModel.findAll();
  }

  async findByUserId(userId: string): Promise<Note[]> {
    return noteModel.findByUserId(userId);
  }

  async findById(id: string): Promise<Note | null> {
    return noteModel.findById(id) || null;
  }

  async update(id: string, data: UpdateNoteInput): Promise<Note | null> {
    return noteModel.update(id, data) || null;
  }

  async delete(id: string): Promise<boolean> {
    return noteModel.delete(id);
  }

  async deleteByUserId(userId: string): Promise<number> {
    return noteModel.deleteByUserId(userId);
  }
}

export const noteService = new NoteService();
