import { plainToInstance } from 'class-transformer';
import {
  ValidationArguments,
  ValidationError,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
  validateSync,
} from 'class-validator';

type ClassType<T = object> = new () => T;

/**
 * Flatten class-validator errors into readable "path: message" lines.
 * Arrays are rendered as `items[0].name`.
 */
export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): { field: string; messages: string[] }[] {
  const result: { field: string; messages: string[] }[] = [];

  for (const error of errors) {
    const isIndex = /^\d+$/.test(error.property);

    const field = parentPath
      ? isIndex
        ? `${parentPath}[${error.property}]`
        : `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      result.push({
        field,
        messages: Object.values(error.constraints),
      });
    }

    if (error.children?.length) {
      result.push(...flattenValidationErrors(error.children, field));
    }
  }

  return result;
}

const failureMessages = new WeakMap<object, string>();

/**
 * Validates `Record<string, SomeDto>` (an object whose KEYS are dynamic and
 * whose VALUES are DTOs).
 *
 * `@ValidateNested({ each: true }) @Type(() => Dto)` does NOT work for this
 * shape: class-transformer turns the WHOLE map into one Dto instance, so every
 * key (PRIMARY_INCOME, HOUSING_EXPENSE ...) is reported as "should not exist".
 */
@ValidatorConstraint({ name: 'isRecordOf', async: false })
class IsRecordOfConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [typeFn] = args.constraints as [() => ClassType];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const cls = typeFn();
    const problems: string[] = [];

    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        problems.push(`${key} must be an object`);
        continue;
      }

      const instance = plainToInstance(cls, entry);

      const errors = validateSync(instance as object, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      // class-validator messages already start with the property name,
      // e.g. "amount must be a number ..." -> "PRIMARY_INCOME.amount must be ..."
      for (const { messages } of flattenValidationErrors(errors)) {
        for (const message of messages) {
          problems.push(`${key}.${message}`);
        }
      }
    }

    if (problems.length > 0) {
      failureMessages.set(value, problems.join('; '));
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const detail =
      typeof args.value === 'object' && args.value !== null
        ? failureMessages.get(args.value)
        : undefined;

    return (
      detail ??
      `${args.property} must be an object whose values are valid entries`
    );
  }
}

export function IsRecordOf<T extends object>(
  typeFn: () => ClassType<T>,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isRecordOf',
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [typeFn],
      options: validationOptions,
      validator: IsRecordOfConstraint,
    });
  };
}
