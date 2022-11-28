import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoyaltyService } from './services/loyalty/loyalty.service';
import { PaymentService } from './services/payment/payment.service';
import { ReservationsService } from './services/reservations/reservations.service';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { MessageConsumer } from './services/queue/queue.service';

@Module({
  imports: [
    HttpModule,
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 8000,
        tls: {
          rejectUnauthorized: false,
        },
      },
    }),
    BullModule.registerQueue({
      name: 'queue',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LoyaltyService,
    PaymentService,
    ReservationsService,
    MessageConsumer,
  ],
})
export class AppModule {}
