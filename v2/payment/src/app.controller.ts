import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Payment } from './payment';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly service: AppService) {}

  @Post('payment')
  async createPayment(@Body() body: Payment) {
    return await this.service.createPayment(body);
  }

  @Patch('payment/:paymentId')
  async updatePayment(@Body() body: Payment, @Param('paymentId') uid: string) {
    return await this.service.updatePaymentStatus(uid, body.status);
  }

  @Get('payment/:paymentId')
  async getPayment(@Param('paymentId') uid: string) {
    return await this.service.getPaymentByUid(uid);
  }

  @Get('manage/health')
  async getHealth() {
    return '';
  }
}
