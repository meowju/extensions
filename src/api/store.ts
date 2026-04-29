import type { User } from './server.ts';
import { generateId, hashPassword } from './crypto.ts';

const users = new Map<string, User>();
const emailIndex = new Map<string, string>();

export async function createUser(email: string, password: string, name: string): Promise<User | null> {
  if (emailIndex.has(email)) {
    return null;
  }

  const id = generateId();
  const passwordHash = await hashPassword(password);
  
  const user: User = {
    id,
    email,
    passwordHash,
    name,
    createdAt: new Date()
  };

  users.set(id, user);
  emailIndex.set(email, id);
  
  return user;
}

export function getUserById(id: string): User | null {
  return users.get(id) || null;
}

export function getUserByEmail(email: string): User | null {
  const id = emailIndex.get(email);
  return id ? users.get(id) || null : null;
}

export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
