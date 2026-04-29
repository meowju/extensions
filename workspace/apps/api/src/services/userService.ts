import { userModel } from '../models/User.js';
import type { User, UpdateUserInput } from '../types/index.js';

export class UserService {
  async findAll(): Promise<Omit<User, 'password'>[]> {
    const users = await userModel.findAll();
    return users.map(({ password: _, ...user }) => user);
  }

  async findById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await userModel.findById(id);
    if (!user) return null;
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, data: UpdateUserInput): Promise<Omit<User, 'password'> | null> {
    const user = await userModel.update(id, data);
    if (!user) return null;
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async delete(id: string): Promise<boolean> {
    return userModel.delete(id);
  }
}

export const userService = new UserService();
