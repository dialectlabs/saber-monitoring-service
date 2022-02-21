import { Module } from '@nestjs/common';
import { SaberMonitoringService } from './monitor/saber-monitoring-service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [],
  providers: [SaberMonitoringService],
})
export class AppModule {}
