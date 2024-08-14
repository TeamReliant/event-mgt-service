import { SetMetadata } from '@nestjs/common';

export const Guest = () => SetMetadata('isGuest', true);
