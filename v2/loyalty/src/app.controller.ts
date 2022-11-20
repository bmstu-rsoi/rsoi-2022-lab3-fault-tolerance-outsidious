import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Request } from 'express';
import { Loyalty } from './loyalty';

@Controller()
export class AppController {
  constructor(private readonly service: AppService) {}

  @Get('manage/health')
  async getHealth() {
    return '';
  }

  public loyaltyToDTO(l: Loyalty) {
    return {
      ...l,
      reservationCount: l.reservation_count,
      id: undefined,
      reservation_count: undefined,
    };
  }

  @Get('loyalty')
  async getUserLoyalty(@Req() request: Request) {
    const username: string = request.headers['x-user-name']?.toString();
    if (!username) throw new BadRequestException('Username!');
    const l = await this.service.getLoyaltyByUser(username);
    return this.loyaltyToDTO(l);
  }

  @Post('loyalty')
  async createUserLoyalty(@Req() request: Request) {
    const username: string = request.headers['x-user-name']?.toString();
    if (!username) throw new BadRequestException('Username!');
    const l = await this.service.createLoyalty(username);
    return this.loyaltyToDTO(l);
  }

  @Patch('loyalty')
  async updateUserLoyalty(
    @Body('type') type: 'inc' | 'dec',
    @Req() request: Request,
  ) {
    const username: string = request.headers['x-user-name']?.toString();
    if (!username) throw new BadRequestException('Username!');
    const l = await this.service.updateLoyaltyCounter(username, type);
    return this.loyaltyToDTO(l);
  }
}
