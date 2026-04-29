import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, UpdateUserDto, BadRequestError, NotFoundError } from '../types';
import { userService } from '../services/user.service';

export class UserController {
  /**
   * Get all users (admin only)
   * GET /api/users
   */
  async getAll(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as any;
    
    const result = await userService.findAll({
      page: Number(page),
      limit: Number(limit),
      search,
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      sortBy,
      sortOrder,
    });
    
    res.json({
      success: true,
      data: result.users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / Number(limit)),
      },
    });
  }
  
  /**
   * Get user by ID
   * GET /api/users/:id
   */
  async getById(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    const { id } = req.params;
    
    const user = await userService.findById(id);
    
    if (!user) {
      throw new NotFoundError('User');
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  }
  
  /**
   * Get current user profile
   * GET /api/users/me
   */
  async getMe(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    if (!req.user) {
      throw new BadRequestError('Not authenticated');
    }
    
    const user = await userService.findById(req.user.id);
    
    if (!user) {
      throw new NotFoundError('User');
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  }
  
  /**
   * Update current user profile
   * PATCH /api/users/me
   */
  async updateMe(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    if (!req.user) {
      throw new BadRequestError('Not authenticated');
    }
    
    const data: UpdateUserDto = req.body;
    
    // Check email uniqueness if changing
    if (data.email) {
      const emailExists = await userService.emailExists(data.email, req.user.id);
      if (emailExists) {
        throw new BadRequestError('Email already in use');
      }
    }
    
    // Check username uniqueness if changing
    if (data.username) {
      const usernameExists = await userService.usernameExists(data.username, req.user.id);
      if (usernameExists) {
        throw new BadRequestError('Username already in use');
      }
    }
    
    const updatedUser = await userService.update(req.user.id, data);
    
    res.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully',
    });
  }
  
  /**
   * Update user (admin only)
   * PATCH /api/users/:id
   */
  async update(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    const { id } = req.params;
    const data: UpdateUserDto = req.body;
    
    const existingUser = await userService.findById(id);
    
    if (!existingUser) {
      throw new NotFoundError('User');
    }
    
    // Check email uniqueness if changing
    if (data.email) {
      const emailExists = await userService.emailExists(data.email, id);
      if (emailExists) {
        throw new BadRequestError('Email already in use');
      }
    }
    
    // Check username uniqueness if changing
    if (data.username) {
      const usernameExists = await userService.usernameExists(data.username, id);
      if (usernameExists) {
        throw new BadRequestError('Username already in use');
      }
    }
    
    const updatedUser = await userService.update(id, data);
    
    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  }
  
  /**
   * Deactivate user (admin only)
   * DELETE /api/users/:id
   */
  async deactivate(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    const { id } = req.params;
    
    const user = await userService.findById(id);
    
    if (!user) {
      throw new NotFoundError('User');
    }
    
    await userService.deactivate(id);
    
    res.json({
      success: true,
      message: 'User deactivated successfully',
    });
  }
  
  /**
   * Activate user (admin only)
   * POST /api/users/:id/activate
   */
  async activate(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    const { id } = req.params;
    
    const user = await userService.findById(id);
    
    if (!user) {
      throw new NotFoundError('User');
    }
    
    await userService.activate(id);
    
    res.json({
      success: true,
      message: 'User activated successfully',
    });
  }
  
  /**
   * Update user role (admin only)
   * PATCH /api/users/:id/role
   */
  async updateRole(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['USER', 'ADMIN', 'MODERATOR'].includes(role)) {
      throw new BadRequestError('Invalid role');
    }
    
    const user = await userService.findById(id);
    
    if (!user) {
      throw new NotFoundError('User');
    }
    
    const updatedUser = await userService.updateRole(id, role);
    
    res.json({
      success: true,
      data: updatedUser,
      message: 'User role updated successfully',
    });
  }
}

export const userController = new UserController();