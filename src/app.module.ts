import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DialectConnection } from './monitor/dialect-connection';
import { WhaleMonitoringService } from './monitor/whale-monitoring-service';
import { FarmMonitoringService } from './monitor/farm-monitoring-service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [],
  providers: [
    {
      provide: DialectConnection,
      useValue: DialectConnection.initialize(),
    },
    WhaleMonitoringService,
    FarmMonitoringService,
  ],
})
export class AppModule {}
