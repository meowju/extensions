import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { userModel } from '../models/User.js';
import type { User, AuthPayload } from '../types/index.js';

export interface AuthResult {
  user: Omit<User, 'password'>;
  token: string;
}

export class AuthService {
  async register(username: string, email: string, password: string): Promise<AuthResult> {
    // Check if email already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.bcrypt.rounds);

    // Create user
    const user = await userModel.create({
      username,
      email,
      password: hashedPassword,
    });

    // Generate token
    const token = this.generateToken(user);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    // Find user
    const user = await userModel.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  generateToken(user: User): string {
    const payload: AuthPayload = {
      userId: user.id,
      role: user.role,
    };
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  verifyToken(token: string): AuthPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as AuthPayload;
    } catch {
      throw new Error('Invalid token');
    }
  }

  async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await userModel.findById(userId);
    if (!user) return null;
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

export const authService = new AuthService();
