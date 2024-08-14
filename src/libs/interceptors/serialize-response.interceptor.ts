import {
  UseInterceptors,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { plainToInstance } from 'class-transformer';
import ResponseSerializer from '@libs/helpers/ResponseSerializer';

export function SerializeResponse(dto: any, type = 'data') {
  // it can be a message, data, collection
  return UseInterceptors(new SerializeResponseInterceptor(dto, type));
}

export class SerializeResponseInterceptor implements NestInterceptor {
  constructor(
    private dto: any,
    private type: string,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    // Run something before request is handled

    return next.handle().pipe(
      map((data: any) => {
        // Run something before response is sent out.
        const serializedData = plainToInstance(this.dto, data, {
          excludeExtraneousValues: true,
        });
        switch (this.type) {
          case 'data':
            return ResponseSerializer.data(serializedData);
          case 'collection':
            return ResponseSerializer.collection(
              serializedData,
              serializedData.length,
            );
          case 'message':
            return ResponseSerializer.message(serializedData.toString());
          default:
            return {
              status: 'SUCCESS',
              data: serializedData,
            };
        }
      }),
    );
  }
}
