import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Processor('queue')
export class MessageConsumer {
  constructor(
    private readonly loyalty: LoyaltyService,
    @InjectQueue('queue') private queue: Queue,
  ) {}

  @Process('job')
  async readOperationJob(
    job: Job<{
      try: number;
      creationTime: number;
      request: 'updateLoyalty';
      requestData: {
        username: string;
        type: 'dec' | 'inc';
      };
    }>,
  ) {
    if (job.data.creationTime + 10 * 1000 < new Date().getMilliseconds())
      return;
    const res = await this.loyalty
      .updateLoyaltyCount(
        job.data.requestData.username,
        job.data.requestData.type,
      )
      .toPromise();
    Logger.log(JSON.stringify(res), 'res');
    if (!res) {
      this.queue.add('job', {
        try: job.data.try + 1,
        creationTime: job.data.creationTime,
        request: job.data.request,
        requestData: job.data.requestData,
      });
    }
  }
}
