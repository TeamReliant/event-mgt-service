import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return new Date(value) > new Date();
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a future date`;
        },
      },
    });
  };
}

export function IsDateAfter(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isGreaterThan',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];

          return new Date(value) >= new Date(relatedValue);
          //  return typeof value === 'number' && typeof relatedValue === 'number' && value > relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be greater than ${args.constraints[0]}`;
        },
      },
    });
  };
}
