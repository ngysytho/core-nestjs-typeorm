import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ExpressRequest } from '../types/express-request.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  /**
   * Guard to check if user is authenticated or not.
   * @param context The execution context.
   * @returns Whether the user is authenticated or not.
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ExpressRequest>();

    if (request.staff) {
      return true;
    }

    throw new HttpException('Not authorized', HttpStatus.UNAUTHORIZED);
  }
}
