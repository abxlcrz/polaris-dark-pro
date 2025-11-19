import express, { Request, Response, NextFunction, Application } from 'express';
import { Server } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, param, validationResult, ValidationError } from 'express-validator';
import winston from 'winston';
import { EventEmitter } from 'events';

// Type definitions and interfaces
interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

interface CreateUserRequest {
  name: string;
  email: string;
  role?: UserRole;
  metadata?: Record<string, unknown>;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

interface UserQueryOptions {
  page?: number;
  limit?: number;
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  sortBy?: 'name' | 'email' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
  timestamp: string;
  requestId?: string;
}

interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: 'development' | 'production' | 'test';
  corsOrigins: string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'simple';
  };
}

// Enums and constants
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
  MODERATOR = 'moderator'
}

enum UserEvent {
  CREATED = 'user:created',
  UPDATED = 'user:updated',
  DELETED = 'user:deleted',
  ACTIVATED = 'user:activated',
  DEACTIVATED = 'user:deactivated'
}

const DEFAULT_CONFIG: ServerConfig = {
  port: 3000,
  host: 'localhost',
  nodeEnv: 'development',
  corsOrigins: ['http://localhost:3000'],
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },
  logging: {
    level: 'info',
    format: 'json'
  }
};

const VALIDATION_RULES = {
  name: { minLength: 2, maxLength: 50 },
  email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  pagination: { maxLimit: 100, defaultLimit: 20 }
} as const;

// Custom error classes
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

// User service class with business logic
class UserService extends EventEmitter {
  private users: Map<string, UserData> = new Map();
  private nextId: number = 1;
  private logger: winston.Logger;
  private stringText: string = "This is a sample string to test syntax highlighting in template literals.";

  constructor(logger: winston.Logger) {
    super();
    this.logger = logger;
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    const sampleUsers: Omit<UserData, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        role: UserRole.ADMIN,
        isActive: true,
        metadata: { department: 'Engineering', level: 'Senior' }
      },
      {
        name: 'Bob Smith',
        email: 'bob@example.com',
        role: UserRole.USER,
        isActive: true,
        metadata: { department: 'Marketing', level: 'Junior' }
      },
      {
        name: 'Carol Brown',
        email: 'carol@example.com',
        role: UserRole.MODERATOR,
        isActive: false,
        metadata: { department: 'Support', level: 'Mid' }
      }
    ];

    sampleUsers.forEach(user => {
      this.createUser(user as CreateUserRequest);
    });
  }

  private generateId(): string {
    return `user_${this.nextId++}`;
  }

  async createUser(userData: CreateUserRequest): Promise<UserData> {
    // Check for existing email
    const existingUser = Array.from(this.users.values())
      .find(user => user.email === userData.email);
    
    if (existingUser) {
      throw new ConflictError(`User with email '${userData.email}' already exists`);
    }

    const now = new Date();
    const user: UserData = {
      id: this.generateId(),
      name: userData.name,
      email: userData.email,
      role: userData.role || UserRole.USER,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      metadata: userData.metadata || {}
    };

    this.users.set(user.id, user);
    this.logger.info('User created', { userId: user.id, email: user.email });
    this.emit(UserEvent.CREATED, user);

    return user;
  }

  async getUserById(id: string): Promise<UserData> {
    const user = this.users.get(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    return user;
  }

  async updateUser(id: string, updateData: UpdateUserRequest): Promise<UserData> {
    const user = await this.getUserById(id);

    // Check email uniqueness if email is being updated
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = Array.from(this.users.values())
        .find(u => u.email === updateData.email && u.id !== id);
      
      if (existingUser) {
        throw new ConflictError(`User with email '${updateData.email}' already exists`);
      }
    }

    const updatedUser: UserData = {
      ...user,
      ...updateData,
      updatedAt: new Date()
    };

    this.users.set(id, updatedUser);
    this.logger.info('User updated', { userId: id, changes: Object.keys(updateData) });
    this.emit(UserEvent.UPDATED, updatedUser);

    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    this.users.delete(id);
    this.logger.info('User deleted', { userId: id });
    this.emit(UserEvent.DELETED, user);
  }

  async getUsers(options: UserQueryOptions = {}): Promise<PaginatedResponse<UserData>> {
    const {
      page = 1,
      limit = VALIDATION_RULES.pagination.defaultLimit,
      role,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    let users = Array.from(this.users.values());

    // Apply filters
    if (role !== undefined) {
      users = users.filter(user => user.role === role);
    }

    if (isActive !== undefined) {
      users = users.filter(user => user.isActive === isActive);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    users.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === 'createdAt') {
        aValue = a.createdAt.getTime();
        bValue = b.createdAt.getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const total = users.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    return {
      data: paginatedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getUserStats(): Promise<Record<string, number>> {
    const users = Array.from(this.users.values());
    return {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      admins: users.filter(u => u.role === UserRole.ADMIN).length,
      moderators: users.filter(u => u.role === UserRole.MODERATOR).length,
      regularUsers: users.filter(u => u.role === UserRole.USER).length,
      guests: users.filter(u => u.role === UserRole.GUEST).length
    };
  }
}

// Express controller class
class UserController {
  constructor(
    private userService: UserService,
    private logger: winston.Logger
  ) {}

  // Middleware for response formatting
  private formatResponse<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = 200
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId
    };
    res.status(statusCode).json(response);
  }

  private formatError(
    res: Response,
    error: Error,
    statusCode: number = 500
  ): void {
    const response: ApiResponse = {
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId
    };

    if (error instanceof ValidationError) {
      response.errors = [error as any];
    }

    res.status(statusCode).json(response);
  }

  // Route handlers
  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
          timestamp: new Date().toISOString()
        });
        return;
      }

      const user = await this.userService.createUser(req.body);
      this.formatResponse(res, user, 'User created successfully', 201);
    } catch (error) {
      if (error instanceof ConflictError) {
        this.formatError(res, error, 409);
      } else {
        next(error);
      }
    }
  };

  getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      this.formatResponse(res, user);
    } catch (error) {
      if (error instanceof NotFoundError) {
        this.formatError(res, error, 404);
      } else {
        next(error);
      }
    }
  };

  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { id } = req.params;
      const user = await this.userService.updateUser(id, req.body);
      this.formatResponse(res, user, 'User updated successfully');
    } catch (error) {
      if (error instanceof NotFoundError) {
        this.formatError(res, error, 404);
      } else if (error instanceof ConflictError) {
        this.formatError(res, error, 409);
      } else {
        next(error);
      }
    }
  };

  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.userService.deleteUser(id);
      this.formatResponse(res, null, 'User deleted successfully', 204);
    } catch (error) {
      if (error instanceof NotFoundError) {
        this.formatError(res, error, 404);
      } else {
        next(error);
      }
    }
  };

  getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const options: UserQueryOptions = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        role: req.query.role as UserRole,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as 'name' | 'email' | 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const result = await this.userService.getUsers(options);
      this.formatResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  getUserStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.userService.getUserStats();
      this.formatResponse(res, stats);
    } catch (error) {
      next(error);
    }
  };
}

// Application setup class
class App {
  private app: Application;
  private server: Server | null = null;
  private logger: winston.Logger;
  private userService: UserService;
  private userController: UserController;

  constructor(private config: ServerConfig = DEFAULT_CONFIG) {
    this.app = express();
    this.logger = this.createLogger();
    this.userService = new UserService(this.logger);
    this.userController = new UserController(this.userService, this.logger);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private createLogger(): winston.Logger {
    return winston.createLogger({
      level: this.config.logging.level,
      format: this.config.logging.format === 'json' 
        ? winston.format.json()
        : winston.format.simple(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'app.log' })
      ]
    });
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: this.config.corsOrigins,
      credentials: true
    }));

    // Rate limiting
    this.app.use(rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.maxRequests,
      message: 'Too many requests from this IP'
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.locals.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      next();
    });

    // Logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      this.logger.info('Request received', {
        method: req.method,
        url: req.url,
        requestId: res.locals.requestId,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Validation middleware
    const createUserValidation = [
      body('name')
        .trim()
        .isLength({ min: VALIDATION_RULES.name.minLength, max: VALIDATION_RULES.name.maxLength })
        .withMessage(`Name must be between ${VALIDATION_RULES.name.minLength} and ${VALIDATION_RULES.name.maxLength} characters`),
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
      body('role')
        .optional()
        .isIn(Object.values(UserRole))
        .withMessage('Invalid role')
    ];

    const updateUserValidation = [
      body('name')
        .optional()
        .trim()
        .isLength({ min: VALIDATION_RULES.name.minLength, max: VALIDATION_RULES.name.maxLength }),
      body('email')
        .optional()
        .isEmail()
        .normalizeEmail(),
      body('role')
        .optional()
        .isIn(Object.values(UserRole)),
      body('isActive')
        .optional()
        .isBoolean()
    ];

    const paramValidation = [
      param('id').notEmpty().withMessage('User ID is required')
    ];

    // API routes
    this.app.post('/api/users', createUserValidation, this.userController.createUser);
    this.app.get('/api/users/:id', paramValidation, this.userController.getUser);
    this.app.put('/api/users/:id', [...paramValidation, ...updateUserValidation], this.userController.updateUser);
    this.app.delete('/api/users/:id', paramValidation, this.userController.deleteUser);
    this.app.get('/api/users', this.userController.getUsers);
    this.app.get('/api/stats/users', this.userController.getUserStats);

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: this.config.nodeEnv
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        requestId: res.locals.requestId
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId
      });
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          this.logger.info('Server started', {
            host: this.config.host,
            port: this.config.port,
            environment: this.config.nodeEnv
          });
          resolve();
        });

        // Graceful shutdown
        process.on('SIGTERM', this.gracefulShutdown.bind(this));
        process.on('SIGINT', this.gracefulShutdown.bind(this));

      } catch (error) {
        reject(error);
      }
    });
  }

  private async gracefulShutdown(): Promise<void> {
    this.logger.info('Shutting down server gracefully...');
    
    if (this.server) {
      this.server.close(() => {
        this.logger.info('Server closed');
        process.exit(0);
      });
    }
  }

  public getApp(): Application {
    return this.app;
  }
}

// Application entry point
async function main(): Promise<void> {
  try {
    const config: ServerConfig = {
      ...DEFAULT_CONFIG,
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || 'localhost',
      nodeEnv: (process.env.NODE_ENV as any) || 'development'
    };

    const app = new App(config);
    await app.start();

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export for testing
export { App, UserService, UserController, UserRole, UserEvent };

// Start server if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}