import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { ExpressRequest } from '../types/express-request.interface';
import { JwtService } from '../services/jwt.service';
import { omit } from '../utils';

export const AUTH_USER_LOADER = Symbol('AUTH_USER_LOADER');
export type LoadUserById<User = any> = (id: string | number) => Promise<User | null>;

@Injectable()
export class AuthMiddleware<User = any> implements NestMiddleware {
  constructor(
    @Inject(AUTH_USER_LOADER) private readonly loadUser: LoadUserById<User>,
    private readonly jwtService: JwtService,
  ) {}

  async use(req: ExpressRequest<User>, _res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (!token) {
        req.user = null;
        return next();
      }

      const payload = this.jwtService.verifyJwtToken<{ sub?: string | number } & JwtPayload>(token);
      if (!payload?.sub) {
        req.user = null;
        return next();
      }

      const user = await this.loadUser(payload.sub);
      req.user = user ? (omit(user as any, 'password') as any) : null;
      next();
    } catch (err) {
      // token invalid/expired => tiếp tục như anonymous
      req.user = null;
      next();
    }
  }
}
