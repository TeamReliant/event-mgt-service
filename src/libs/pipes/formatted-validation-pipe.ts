import {
  Injectable,
  ValidationPipe,
  ValidationError,
  UnprocessableEntityException,
} from '@nestjs/common';

@Injectable()
export class FormattedValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) =>
        this.formatErrors(errors),
    });
  }

  private formatErrors(errors: ValidationError[]) {
    const formattedErrors = {};

    errors.forEach((error) => {
      // Handle nested validation errors recursively
      this.addErrors(formattedErrors, error);
    });

    return new UnprocessableEntityException({
      status: 'UNPROCESSABLE_DATA_ERROR',
      errors: formattedErrors,
    });
  }

  private addErrors(
    formattedErrors: any,
    error: ValidationError,
    parentPath = '',
  ) {
    const propertyPath = this.buildPropertyPath(error, parentPath);

    // Handle constraints if they exist
    if (error.constraints) {
      formattedErrors[propertyPath] = Object.values(error.constraints);
    }

    // Recursively handle child errors
    if (error.children && error.children.length > 0) {
      error.children.forEach((child) => {
        this.addErrors(formattedErrors, child, propertyPath);
      });
    }
  }

  private buildPropertyPath(error: ValidationError, parentPath = ''): string {
    if (error.property.match(/^[0-9]+$/)) {
      return `${parentPath}[${error.property}]`;
    }
    return parentPath ? `${parentPath}.${error.property}` : error.property;
  }
}
