import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Processor('my-queue')
export class MessageConsumer {
  constructor(
    private readonly loyalty: LoyaltyService,
    @InjectQueue('my-queue') private queue: Queue,
  ) {
    console.log('constructor');
    Logger.log('constructor');
  }

  @Process('my-job')
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
    Logger.log('\n\njob\n\n');
    if (job.data.creationTime + 5 * 1000 < Date.now()) return;
    const res = await this.loyalty
      .updateLoyaltyCount(
        job.data.requestData.username,
        job.data.requestData.type,
      )
      .toPromise();
    Logger.log(res);
    if (!res) {
      this.queue.add('my-job', {
        try: job.data.try + 1,
        creationTime: job.data.creationTime,
        request: job.data.request,
        requestData: job.data.requestData,
      });
    }
  }
}
