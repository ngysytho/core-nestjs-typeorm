import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface Including {
  include: string[];
}

export const IncludeRelations = createParamDecorator(
  (validIncludes: string[], ctx: ExecutionContext): Including | null => {
    const req: Request = ctx.switchToHttp().getRequest();
    const includeQuery = req.query.include as string;
    if (!includeQuery) return null;

    // Split the include query into an array of included relations
    const includes = includeQuery.split('|');

    // Validate if the requested includes are part of the validIncludes array
    // includes.forEach((include) => {
    //   if (!validIncludes.includes(include)) {
    //     throw new BadRequestException(`Invalid include parameter: ${include}`);
    //   }
    // });

    return { include: includes };
  },
);
