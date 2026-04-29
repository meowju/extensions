import { PrismaClient, User, UserRole, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { CreateUserDto, UpdateUserDto } from '../types';
import bcrypt from 'bcryptjs';
import { config } from '../config';

export class UserService {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = prisma;
  }
  
  /**
   * Create a new user
   */
  async create(data: CreateUserDto): Promise<Omit<User, 'password'>> {
    const passwordHash = await bcrypt.hash(data.password, config.bcrypt.rounds);
    
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        username: data.username,
        password: passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
    });
    
    return user;
  }
  
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
  
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }
  
  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }
  
  /**
   * Find user by email or username
   */
  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername },
        ],
      },
    });
  }
  
  /**
   * Update user
   */
  async update(id: string, data: UpdateUserDto): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        email: data.email?.toLowerCase(),
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
    });
    
    return user;
  }
  
  /**
   * Update user password
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.rounds);
    
    await this.prisma.user.update({
      where: { id },
      data: { password: passwordHash },
    });
  }
  
  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }
  
  /**
   * Verify user password
   */
  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }
  
  /**
   * Deactivate user (soft delete)
   */
  async deactivate(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
  
  /**
   * Activate user
   */
  async activate(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }
  
  /**
   * Update user role
   */
  async updateRole(id: string, role: UserRole): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
    });
    
    return user;
  }
  
  /**
   * Find all users with pagination
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ users: Omit<User, 'password'>[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;
    
    const where: Prisma.UserWhereInput = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isActive: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);
    
    return { users, total };
  }
  
  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        email: email.toLowerCase(),
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
    });
    return count > 0;
  }
  
  /**
   * Check if username exists
   */
  async usernameExists(username: string, excludeUserId?: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        username,
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
    });
    return count > 0;
  }
}

export const userService = new UserService();