import { IsNull, Not, LessThan, LessThanOrEqual, MoreThan, MoreThanOrEqual, ILike, In, Between } from 'typeorm';
import { Filtering, FilterRule } from '../decorators/filtering-params.decorator';
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { Sorting } from '../decorators/sorting-params.decorator';
import { Including } from '../decorators/including-params.decorator';

export const getOrder = (sorts: Sorting[]) => {
  const order: {
    [key: string]: any;
  } = {};
  sorts.forEach((sort) => {
    order[sort.property] = sort.direction === 'asc' ? 'ASC' : 'DESC';
  });
  return order;
};

/**
 * Transforms the given filtering criteria into a WHERE clause
 * for the TypeORM find options.
 *
 * @param filters - The filtering criteria.
 * @returns The WHERE clause for the TypeORM find options.
 */
export const getWhere = (filters: Filtering[]) => {
  const where: {
    [key: string]: any;
  } = {};

  const rangeConditions: { [key: string]: { min?: number | string; max?: number | string } } = {};

  filters.forEach((filter) => {
    const { property, rule, value } = filter;
    const keys = property.split('.');
    const lastKey = keys.pop();
    if (!lastKey) {
      throw new BadRequestException(`Invalid property path: ${property}`);
    }

    let current = where;
    for (const key of keys) {
      if (!current[key]) current[key] = {};
      current = current[key];
    }

    const fullKey = keys.concat(lastKey).join('.');

    if (rule === FilterRule.GREATER_THAN_OR_EQUALS || rule === FilterRule.LESS_THAN_OR_EQUALS) {
      if (!rangeConditions[fullKey]) rangeConditions[fullKey] = {};
      if (rule === FilterRule.GREATER_THAN_OR_EQUALS) rangeConditions[fullKey].min = value;
      if (rule === FilterRule.LESS_THAN_OR_EQUALS) rangeConditions[fullKey].max = value;
      return;
    }

    let condition: any;
    switch (rule) {
      case FilterRule.IS_NULL:
        condition = IsNull();
        break;
      case FilterRule.IS_NOT_NULL:
        condition = Not(IsNull());
        break;
      case FilterRule.EQUALS:
        condition = value;
        break;
      case FilterRule.NOT_EQUALS:
        condition = Not(value);
        break;
      case FilterRule.GREATER_THAN:
        condition = MoreThan(value);
        break;
      case FilterRule.LESS_THAN:
        condition = LessThan(value);
        break;
      case FilterRule.LIKE:
        if (isNaN(Number(value))) {
          condition = ILike(`%${value}%`);
        } else {
          condition = value;
        }
        break;
      case FilterRule.NOT_LIKE:
        if (isNaN(Number(value))) {
          condition = Not(ILike(`%${value}%`));
        } else {
          condition = Not(value);
        }
        break;
      case FilterRule.IN:
        condition = In(JSON.parse(value.replace(/'/g, '"')));
        break;
      case FilterRule.NOT_IN:
        condition = Not(In(JSON.parse(value.replace(/'/g, '"'))));
        break;
      default:
        throw new BadRequestException(`Unsupported filter rule: ${rule}`);
    }

    if (!current[lastKey]) {
      current[lastKey] = condition;
    } else if (Array.isArray(current[lastKey])) {
      current[lastKey].push(condition);
    } else {
      current[lastKey] = [current[lastKey], condition];
    }
  });

  // Apply range conditions
  Object.keys(rangeConditions).forEach((fullKey) => {
    const keys = fullKey.split('.');
    const lastKey = keys.pop();
    const { min, max } = rangeConditions[fullKey];

    if (!lastKey) {
      throw new BadRequestException(`Invalid property path: ${fullKey}`);
    }

    let current = where;
    for (const key of keys) {
      if (!current[key]) current[key] = {};
      current = current[key];
    }

    if (min !== undefined && max !== undefined) {
      current[lastKey] = Between(min, max);
    } else if (min !== undefined) {
      current[lastKey] = MoreThanOrEqual(min);
    } else if (max !== undefined) {
      current[lastKey] = LessThanOrEqual(max);
    }
  });

  return where;
};

/**
 * Transforms the given relation information into a relation object
 * suitable for TypeORM's find options.
 *
 * @param relation - The relation information.
 * @returns The relation object suitable for TypeORM's find options.
 */
export const getRelation = (relation: Including): any => {
  if (!relation || !relation.include) return [];

  const buildNestedRelations = (paths: string[]) => {
    const result: any = {};
    for (const path of paths) {
      const parts = path.split('.');
      let current = result;
      for (const part of parts) {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
    return result;
  };

  return buildNestedRelations(relation.include);
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  /**
   *
   * @param exception
   * @param host
   */
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const message = exception.getResponse();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
