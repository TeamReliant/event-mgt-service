import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfig } from '@config/index';
import { MulterModule } from '@nestjs/platform-express';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventsListenerModule } from '@libs/listeners/events-listener/events-listener.module';
import { UsersModule } from '@app/rest/users/users.module';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamMembersModule } from '@app/rest/team-resources/team-members/team-members.module';
import { TeamInvitationsModule } from '@app/rest/team-resources/team-invitations/team-invitations.module';
import { TeamsModule } from '@app/rest/team-resources/teams/teams.module';
import { PermissionsModule } from '@app/rest/team-resources/permissions/permissions.module';
import DatabaseConfig from '@libs/database/config/database.config';
import { EventsModule } from './app/rest/event-resources/events/events.module';
import { TicketsModule } from './app/rest/ticket-resources/tickets/tickets.module';
import { JwtStrategy } from '@libs/strategies/jwt.strategy';
import { Event } from '@app/rest/event-resources/events/entities/event.entity';
import { Ticket } from '@app/rest/ticket-resources/tickets/entities/ticket.entity';
import { User } from '@app/rest/users/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [AppConfig, DatabaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
        entities: [Event, Ticket, User],
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        isGlobal: true,
        store: 'redisStore',
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        ttl: configService.get('CACHE_TTL'),
      }),
      inject: [ConfigService],
    }),
    MulterModule.register(),
    EventEmitterModule.forRoot(),
    EventsListenerModule,
    UsersModule,
    EventsModule,
    TicketsModule,
    TeamMembersModule,
    TeamInvitationsModule,
    TeamsModule,
    PermissionsModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
