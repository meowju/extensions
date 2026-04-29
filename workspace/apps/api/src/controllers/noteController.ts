import { Response, NextFunction } from 'express';
import { noteService } from '../services/noteService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export class NoteController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const notes = await noteService.findByUserId(req.user!.userId);
      res.status(200).json({
        success: true,
        data: notes,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const note = await noteService.create(req.user!.userId, req.body);
      res.status(201).json({
        success: true,
        data: note,
        message: 'Note created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const note = await noteService.findById(id);
      
      if (!note) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOTE_NOT_FOUND',
            message: 'Note not found',
          },
        });
        return;
      }

      // Users can only view their own notes
      if (note.userId !== req.user!.userId && req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only view your own notes',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: note,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const existingNote = await noteService.findById(id);
      
      if (!existingNote) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOTE_NOT_FOUND',
            message: 'Note not found',
          },
        });
        return;
      }

      // Users can only update their own notes
      if (existingNote.userId !== req.user!.userId && req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only update your own notes',
          },
        });
        return;
      }

      const note = await noteService.update(id, updateData);
      
      res.status(200).json({
        success: true,
        data: note,
        message: 'Note updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      const existingNote = await noteService.findById(id);
      
      if (!existingNote) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOTE_NOT_FOUND',
            message: 'Note not found',
          },
        });
        return;
      }

      // Users can only delete their own notes
      if (existingNote.userId !== req.user!.userId && req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only delete your own notes',
          },
        });
        return;
      }

      await noteService.delete(id);
      
      res.status(200).json({
        success: true,
        message: 'Note deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const noteController = new NoteController();
