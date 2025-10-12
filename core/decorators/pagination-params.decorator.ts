import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface Pagination {
  page: number;
  limit: number;
  size: number;
  offset: number;
}

export const PaginationParams = createParamDecorator((data, ctx: ExecutionContext): Pagination => {
  const req: Request = ctx.switchToHttp().getRequest();
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  let size: any = req.query.size;

  let isUnlimited = false;

  // Check if size is "unlimited"
  if (typeof size === 'string' && size.toLowerCase() === 'unlimited') {
    isUnlimited = true;
    size = 10000;
  } else {
    size = size ? parseInt(size as string) : 10;
  }

  // Validate pagination parameters
  if (isNaN(page) || page < 1 || isNaN(size) || size < 1) {
    throw new BadRequestException('Invalid pagination params');
  }

  const limit = size;
  const offset = (page - 1) * limit;

  return { page, limit, size: isUnlimited ? 'unlimited' : size, offset };
});
