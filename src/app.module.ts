import { Module } from '@nestjs/common';
import { SaberMonitoringService } from './monitor/saber-monitoring-service';
import { ScheduleModule } from '@nestjs/schedule';
import { DialectConnection } from './monitor/dialect-connection';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [],
  providers: [
    {
      provide: DialectConnection,
      useValue: DialectConnection.initialize(),
    },
    SaberMonitoringService,
  ],
})
export class AppModule {}
