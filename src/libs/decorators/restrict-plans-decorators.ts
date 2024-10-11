import { SetMetadata } from '@nestjs/common';

export const RestrictedPlans = (plans: string[] | string) =>
  SetMetadata('restrictedPlans', Array.isArray(plans) ? plans : [plans]);
