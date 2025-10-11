import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface Filtering {
  property: string;
  rule: string;
  value: string;
}

// valid filter rules
export enum FilterRule {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUALS = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUALS = 'lte',
  LIKE = 'like',
  NOT_LIKE = 'nlike',
  IN = 'in',
  NOT_IN = 'nin',
  IS_NULL = 'isnull',
  IS_NOT_NULL = 'isnotnull',
}

export const FilteringParams = createParamDecorator((data, ctx: ExecutionContext): Filtering[] | null => {
  const req: Request = ctx.switchToHttp().getRequest();
  const filterQuery = req.query.filter;
  if (!filterQuery) return null;

  const filters = filterQuery
    .toString()
    .split('&&')
    .map((filter) => {
      const [property, rule, ...rest] = filter.split(':');
      const value = rest.join(':');

      if (!property || !rule) {
        throw new BadRequestException('Invalid filter format');
      }

      if (rule === FilterRule.IS_NULL || rule === FilterRule.IS_NOT_NULL) {
        return { property, rule, value: '' };
      }

      if (!Object.values(FilterRule).includes(rule as FilterRule)) {
        throw new BadRequestException(`Invalid filter rule: ${rule}`);
      }

      if (!value) {
        throw new BadRequestException(`Missing value for property ${property}`);
      }

      return { property, rule, value };
    });

  return filters;
});
