import type { User, CreateUserInput } from '../types/index.js';

class UserModel {
  private users: Map<string, User> = new Map();

  generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  async create(input: CreateUserInput & { hashedPassword: string }): Promise<User> {
    const now = new Date();
    const user: User = {
      id: this.generateId(),
      username: input.username,
      email: input.email,
      password: input.hashedPassword,
      role: 'user',
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  async findById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async update(id: string, data: Partial<Pick<User, 'username' | 'email' | 'role'>>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated: User = {
      ...user,
      ...data,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async clear(): Promise<void> {
    this.users.clear();
  }
}

export const userModel = new UserModel();
