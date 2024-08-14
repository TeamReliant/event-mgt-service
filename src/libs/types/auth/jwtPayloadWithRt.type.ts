import { TJwtPayload } from './index';

export type TJwtPayloadWithRt = TJwtPayload & { refreshToken: string };
