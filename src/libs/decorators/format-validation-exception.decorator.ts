import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function FormatValidationException(
  validationOptions?: ValidationOptions,
) {
  return function (object: NonNullable<unknown>, propertyName: string) {
    registerDecorator({
      name: 'customValidation',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Add your custom validation logic here for the specific field
          // Return true if the value is valid, otherwise return false
          return /* Your validation logic */ true;
        },
        defaultMessage(args: ValidationArguments) {
          // Customize the error message for the specific field
          return `${args.property} is not valid.`;
        },
      },
    });
  };
}
