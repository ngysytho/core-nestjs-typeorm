import { ObjectLiteral } from 'typeorm';
import { ErrorMessages } from '../types';
import { HttpException } from '@nestjs/common';

export class SuccessResponse<T = ObjectLiteral> {
  success: true;
  data?: T;

  /**
   * Constructs a new instance of SuccessResponse.
   *
   * @param data - The data to be included in the success response.
   * @param statusCode
   */
  constructor(
    data?: T,
    public statusCode: number = 200,
  ) {
    this.success = true;
    this.data = data;
  }
}

export class ErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[] | { errors: ErrorMessages };

  /**
   * Constructs a new instance of ErrorResponse.
   *
   * @param statusCode - The HTTP status code representing the error.
   * @param message - A message or array of messages describing the error.
   */
  constructor(message: string | string[] | { errors: ErrorMessages }, statusCode: number = 500) {
    throw new HttpException(message, statusCode);
  }
}
