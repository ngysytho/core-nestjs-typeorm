import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface Sorting {
  property: string;
  direction: string; // ASC or DESC
}

export const SortingParams = createParamDecorator((validParams, ctx: ExecutionContext): Sorting[] | null => {
  const req: Request = ctx.switchToHttp().getRequest();
  const sortQuery = req.query.sort;
  if (!sortQuery) return null;

  const sortStrings = sortQuery.toString().split('&&');
  const sorts: Sorting[] = sortStrings.map((sort) => {
    if (!sort.match(/^([a-zA-Z0-9_]+):(asc|desc)$/)) {
      throw new BadRequestException('Invalid sort parameter');
    }

    const [property, direction] = sort.split(':');
    // if (!validParams.includes(property)) {
    //   throw new BadRequestException(`Invalid sort property: ${property}`);
    // }

    return { property, direction };
  });

  return sorts;
});
