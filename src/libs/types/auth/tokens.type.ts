import { User } from '@app/rest/users/entities/user.entity';

export type TTokens = {
  user?: User;
  access_token: string;
  refresh_token: string;
};
