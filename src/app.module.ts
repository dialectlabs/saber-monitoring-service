import { Module } from '@nestjs/common';
import { SaberMonitoringService } from './monitor/saber-monitoring-service';

@Module({
  imports: [],
  controllers: [],
  providers: [SaberMonitoringService],
})
export class AppModule {}
