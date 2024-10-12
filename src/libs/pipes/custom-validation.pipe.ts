import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  UnprocessableEntityException,
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

    // Manually transform the plain object into an instance of the metatype
    const object = plainToInstance(metatype, value, {
      enableImplicitConversion: true, // Handle implicit type conversion here
    });

    const validatorOptions: ValidatorOptions = {
      whitelist: true, // Strip properties that are not in the DTO
      forbidNonWhitelisted: true, // Throw an error when an unknown property is provided
      validationError: {
        target: false, // Exclude the object from the error message
      },
    };

    const errors = await validate(object, validatorOptions);

    // If there are validation errors, handle them
    if (errors.length > 0) {
      throw new UnprocessableEntityException({
        status: 'VALIDATION_ERROR',
        errors: this.formatErrors(errors),
      });
    }

    return object; // Ensure transformed object is returned
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
