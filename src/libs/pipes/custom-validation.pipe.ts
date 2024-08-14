import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidatorOptions } from 'class-validator';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata): Promise<any> {
    // Check if the type requires validation
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);

    // Proceed if the transformation produced a valid object
    if (object) {
      const validatorOptions: ValidatorOptions = {
        validationError: {
          target: false, // Exclude the object from the error message
        },
      };

      const errors = await validate(object, validatorOptions);

      // If there are validation errors, handle them
      if (errors.length > 0) {
        throw new BadRequestException({
          status: 'VALIDATION_ERROR',
          errors: this.formatErrors(errors),
        });
      }
    }

    return value;
  }

  // Determine if the type requires validation
  private toValidate(metatype: any): boolean {
    const types: any[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  // Format the validation errors
  private formatErrors(errors: any[]): any {
    const formattedErrors: any = {};

    errors.forEach((error) => {
      const { property, constraints } = error;

      if (constraints) {
        if (formattedErrors[property]) {
          formattedErrors[property].push(...Object.values(constraints));
        } else {
          formattedErrors[property] = Object.values(constraints);
        }
      } else {
        formattedErrors[property] = [`Validation error for ${property}`];
      }
    });

    return formattedErrors;
  }
}
