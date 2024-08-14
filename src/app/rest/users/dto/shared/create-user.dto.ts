import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { FormatValidationException } from '@libs/decorators/format-validation-exception.decorator';
import { ApiProperty } from '@nestjs/swagger';

export function Match(property: string, validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: MatchConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'Match' })
export class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return value === relatedValue;
  }
}

export class CreateUserDto {
  @ApiProperty({
    example: 'email@example.com',
    description: 'This is the email of the user',
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  @MaxLength(255)
  @FormatValidationException()
  email: string;

  @ApiProperty({
    example: '**********',
    description: 'This is the password of the user',
  })
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(100)
  @FormatValidationException()
  password: string;
}
