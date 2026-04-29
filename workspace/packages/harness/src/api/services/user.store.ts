/**
 * User authentication store (in-memory)
 * Handles user management, password hashing, and token generation
 */

import { createHash, randomBytes } from 'crypto';
import { jwtService } from '../middleware/jwt.service.js';
import { type AuthenticatedUser, UserRole } from '../middleware/auth.types.js';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface AuthToken {
  token: string;
  userId: string;
  expiresAt: Date;
}

class UserStore {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map();
  private tokens: Map<string, AuthToken> = new Map();

  generateId(): string {
    return crypto.randomUUID();
  }

  generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  hashPassword(password: string, salt: string): string {
    return createHash('sha256').update(password + salt).digest('hex');
  }

  generateSalt(): string {
    return randomBytes(16).toString('hex');
  }

  getAll(): Omit<User, 'passwordHash' | 'salt'>[] {
    return Array.from(this.users.values()).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
    }));
  }

  getById(id: string): Omit<User, 'passwordHash' | 'salt'> | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  getByEmail(email: string): User | undefined {
    const id = this.emailIndex.get(email.toLowerCase());
    return id ? this.users.get(id) : undefined;
  }

  create(data: { email: string; name: string; password: string; role?: UserRole }): Omit<User, 'passwordHash' | 'salt'> {
    const existing = this.getByEmail(data.email);
    if (existing) {
      throw new Error(`User with email '${data.email}' already exists`);
    }

    const salt = this.generateSalt();
    const passwordHash = this.hashPassword(data.password, salt);

    const user: User = {
      id: this.generateId(),
      email: data.email.toLowerCase(),
      name: data.name,
      role: data.role ?? UserRole.USER,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    this.users.set(user.id, user);
    this.emailIndex.set(user.email.toLowerCase(), user.id);

    const { passwordHash: _, salt: __, ...result } = user;
    return result;
  }

  verifyPassword(email: string, password: string): User | null {
    const user = this.getByEmail(email);
    if (!user) return null;

    const hash = this.hashPassword(password, user.salt);
    if (hash !== user.passwordHash) return null;

    return user;
  }

  createToken(userId: string): AuthToken {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const authToken: AuthToken = {
      token,
      userId,
      expiresAt,
    };

    this.tokens.set(token, authToken);
    return authToken;
  }

  verifyToken(token: string): AuthToken | null {
    const authToken = this.tokens.get(token);
    if (!authToken) return null;

    if (authToken.expiresAt < new Date()) {
      this.tokens.delete(token);
      return null;
    }

    return authToken;
  }

  revokeToken(token: string): boolean {
    return this.tokens.delete(token);
  }

  clear(): void {
    this.users.clear();
    this.emailIndex.clear();
    this.tokens.clear();
  }

  seed(users: { email: string; name: string; password: string }[]): Omit<User, 'passwordHash' | 'salt'>[] {
    return users.map((u) => this.create(u));
  }
}

export const userStore = new UserStore();