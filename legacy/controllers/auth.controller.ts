import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, RegisterDto, LoginDto, ConflictError, UnauthorizedError } from '../types';
import { userService } from '../services/user.service';
import { authService } from '../services/auth.service';
import { config } from '../config';

export class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    const { email, username, password, firstName, lastName }: RegisterDto = req.body;
    
    // Check if email already exists
    if (await userService.emailExists(email)) {
      throw new ConflictError('Email');
    }
    
    // Check if username already exists
    if (await userService.usernameExists(username)) {
      throw new ConflictError('Username');
    }
    
    // Create user
    const user = await userService.create({ email, username, password, firstName, lastName });
    
    // Generate tokens
    const tokens = await authService.generateTokens(
      user.id,
      user.email,
      user.role,
      req.ip,
      req.headers['user-agent']
    );
    
    res.status(201).json({
      success: true,
      data: {
        user,
        ...tokens,
      },
      message: 'Registration successful',
    });
  }
  
  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    const { email, password }: LoginDto = req.body;
    
    // Find user
    const user = await userService.findByEmail(email);
    
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }
    
    // Verify password
    const isValid = await userService.verifyPassword(user, password);
    
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }
    
    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }
    
    // Generate tokens
    const tokens = await authService.generateTokens(
      user.id,
      user.email,
      user.role,
      req.ip,
      req.headers['user-agent']
    );
    
    // Update last login
    await userService.updateLastLogin(user.id);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        ...tokens,
      },
      message: 'Login successful',
    });
  }
  
  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refresh(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token required');
    }
    
    const tokens = await authService.refreshTokens(
      refreshToken,
      req.ip,
      req.headers['user-agent']
    );
    
    if (!tokens) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
    
    res.json({
      success: true,
      data: tokens,
      message: 'Token refreshed successfully',
    });
  }
  
  /**
   * Logout user (revoke tokens)
   * POST /api/auth/logout
   */
  async logout(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await authService.revokeToken(token);
    }
    
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await authService.revokeToken(refreshToken);
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
  
  /**
   * Get current user
   * GET /api/auth/me
   */
  async me(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }
    
    const user = await userService.findById(req.user.id);
    
    if (!user) {
      throw new UnauthorizedError('User not found');
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
      },
    });
  }
  
  /**
   * Verify email with token
   * POST /api/auth/verify-email
   */
  async verifyEmail(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    const { token } = req.body;
    
    if (!token) {
      throw new UnauthorizedError('Verification token required');
    }
    
    const userId = await authService.verifyVerificationToken(token);
    
    if (!userId) {
      throw new UnauthorizedError('Invalid or expired verification token');
    }
    
    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  }
  
  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    const { email } = req.body;
    
    const user = await userService.findByEmail(email);
    
    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If the email exists, a reset link has been sent',
    });
    
    if (!user) return;
    
    // Create password reset token
    await authService.createPasswordResetToken(
      user.id,
      req.ip,
      req.headers['user-agent']
    );
    
    // TODO: Send email with reset link
    // In production, send email with reset link containing the token
  }
  
  /**
   * Reset password with token
   * POST /api/auth/reset-password
   */
  async resetPassword(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      throw new UnauthorizedError('Token and new password required');
    }
    
    const userId = await authService.verifyPasswordResetToken(token);
    
    if (!userId) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }
    
    // Update password
    await userService.updatePassword(userId, newPassword);
    
    // Revoke all tokens for security
    await authService.revokeAllUserTokens(userId);
    
    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  }
  
  /**
   * Change password (authenticated)
   * POST /api/auth/change-password
   */
  async changePassword(req: AuthenticatedRequest, res: Response<ApiResponse>): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }
    
    const { currentPassword, newPassword } = req.body;
    
    const user = await userService.findById(req.user.id);
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    
    // Verify current password
    const isValid = await userService.verifyPassword(user, currentPassword);
    
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }
    
    // Update password
    await userService.updatePassword(req.user.id, newPassword);
    
    // Revoke all tokens except current
    await authService.revokeAllUserTokens(req.user.id);
    
    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  }
}

export const authController = new AuthController();