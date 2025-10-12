import {
  ArgumentMetadata,
  HttpException,
  HttpStatus,
  Injectable,
  PipeTransform,
  ValidationError,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class BackendValidationPipe implements PipeTransform {
  /**
   * Transform the given value and metadata into a validated object of type T.
   *
   * @param value - The value to validate.
   * @param metadata - The metadata of the value.
   * @returns The validated value if it passes, otherwise throws an HttpException.
   * @throws HttpException
   * @internal
   */
  async transform<T>(value: T, metadata: ArgumentMetadata): Promise<T> {
    if (!metadata.metatype || !this.shouldValidate(metadata.metatype)) {
      return value;
    }

    const object = plainToInstance(metadata.metatype, value) as object;
    const errors = await validate(object);

    if (errors.length === 0) {
      return value;
    }

    throw new HttpException({ errors: this.formatErrors(errors) }, HttpStatus.UNPROCESSABLE_ENTITY);
  }

  /**
   * Formats validation errors into a structured object.
   *
   * @param errors - An array of ValidationError objects to format.
   * @returns A record where each key is a property name with validation errors
   * and the value is an array of error messages related to that property.
   */
  private formatErrors(errors: ValidationError[]): Record<string, string[]> {
    return errors.reduce<Record<string, string[]>>((acc, error) => {
      if (error.constraints) {
        acc[error.property] = Object.values(error.constraints);
      }
      return acc;
    }, {});
  }

  /**
   * Determines if the given metatype should be validated or not.
   *
   * We do not validate built-in types such as strings, booleans, numbers, arrays,
   * and objects, since they are not decorated with validation decorators.
   *
   * @param metatype - The metatype to check.
   * @returns true if the metatype should be validated, false otherwise.
   */
  private shouldValidate(metatype: unknown): boolean {
    const types: unknown[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
