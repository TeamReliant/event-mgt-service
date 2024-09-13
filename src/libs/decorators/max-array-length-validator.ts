import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'MaxArrayLength', async: false })
export class MaxArrayLengthConstraint implements ValidatorConstraintInterface {
    
    validate(value: any, args: ValidationArguments): boolean {
        const [maxLength] = args.constraints;
        return Array.isArray(value) && value.length <= maxLength;
    }

    defaultMessage(args: ValidationArguments): string {
        const [maxLength] = args.constraints;
        return `${args.property} must contain at most ${maxLength} elements`;
    }
}

export function MaxArrayLength(maxLength: number, validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'MaxArrayLength',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [maxLength],
            options: validationOptions,
            validator: MaxArrayLengthConstraint,
        });
    };
}
