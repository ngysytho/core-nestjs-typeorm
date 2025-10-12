import { ObjectLiteral } from 'typeorm';
import { SuccessResponse, ErrorResponse } from '../responses/base.responses';

export interface PaginationResponseInterface<T> {
  rows: T[];
  count: number;
}

export type CommonResponse<T = ObjectLiteral> = SuccessResponse<T> | ErrorResponse;
