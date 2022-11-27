import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { LoyaltyService } from './services/loyalty/loyalty.service';
import { PaymentService } from './services/payment/payment.service';
import { ReservationsService } from './services/reservations/reservations.service';
import * as moment from 'moment';
import { v4 as uuid4 } from 'uuid';
import { Payment } from './models/payment';
import { Reservation } from './models/reservation';
import { Request } from 'express';
import { map } from 'rxjs';

@Controller()
export class AppController {
  constructor(
    private loaltyService: LoyaltyService,
    private paymentService: PaymentService,
    private reservationService: ReservationsService,
  ) {}

  @Get('manage/health')
  async getHealth() {
    return '';
  }

  @Get('api/v1/hotels')
  async getHotels(@Query('page') page: number, @Query('size') size: number) {
    return this.reservationService
      .getHotels(page, size)
      .pipe(
        map((data: any) => {
          return { ...data, totalElements: data.items.length };
        }),
      )
      .toPromise();
  }

  private async getAllReservations(username) {
    const reservations = await this.reservationService
      .getUserReservations(username)
      .toPromise();
    const items = [];
    for (const r of reservations) {
      const p = await this.paymentService
        .getPayment(username, r.paymentUid)
        .toPromise();
      items.push({
        ...r,
        startDate: moment(new Date(r.startDate)).format('YYYY-MM-DD'),
        endDate: moment(new Date(r.endDate)).format('YYYY-MM-DD'),
        paymentUid: undefined,
        payment: {
          status: p.status,
          price: p.price,
        },
      });
    }
    return items;
  }

  @Get('api/v1/reservations')
  async getReservations(@Req() request: Request) {
    const username: string = request.headers['x-user-name']?.toString();
    if (!username) throw new BadRequestException('x-user-name');
    return this.getAllReservations(username);
  }

  @Post('api/v1/reservations')
  @HttpCode(200)
  async createReservation(
    @Req() request: Request,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Body('hotelUid') hotelUid: string,
  ) {
    const username: string = request.headers['x-user-name']?.toString();
    if (!username) throw new BadRequestException('x-user-name');
    const hotel = await this.reservationService.getHotel(hotelUid).toPromise();
    if (!hotel) {
      throw new ServiceUnavailableException('Reservation Service unavailable');
    }
    const date1 = moment(startDate);
    const date2 = moment(endDate);
    const days = date2.diff(date1, 'days');
    const pay = hotel.price * days;
    let loyalty = await this.loaltyService.getLoyalty(username).toPromise();
    if (!loyalty) {
      loyalty = await this.loaltyService.createLoyalty(username).toPromise();
    }
    if (!loyalty) {
      throw new ServiceUnavailableException('Loyalty Service unavailable');
    }
    let sale = 0;
    if (loyalty.status === 'BRONZE') {
      sale = 5;
    } else if (loyalty.status === 'SILVER') {
      sale = 7;
    } else if (loyalty.status === 'GOLD') {
      sale = 10;
    }
    const resultPay = (pay * (100 - sale)) / 100;

    const payment = {
      payment_uid: uuid4(),
      status: 'PAID',
      price: resultPay,
    } as Payment;
    const p = await this.paymentService
      .createPayment(username, payment)
      .toPromise();
    if (!p) {
      throw new ServiceUnavailableException('Payment Service unavailable');
    }
    const l2 = await this.loaltyService
      .updateLoyaltyCount(username, 'inc')
      .toPromise();

    const reservation = {
      reservation_uid: uuid4(),
      hotel_id: hotelUid,
      payment_uid: payment.payment_uid,
      status: 'PAID',
      start_date: startDate,
      end_data: endDate,
      username,
    } as Reservation;
    const r = await this.reservationService
      .createReservation(username, reservation)
      .toPromise();
    return {
      ...r,
      startDate: moment(new Date(r.startDate)).format('YYYY-MM-DD'),
      endDate: moment(new Date(r.endDate)).format('YYYY-MM-DD'),
      discount: loyalty.discount,
      payment: {
        status: payment.status,
        price: payment.price,
      },
    };
  }

  @Get('api/v1/reservations/:reservationId')
  async getReservationById(
    @Param('reservationId') uid: string,
    @Req() request: Request,
  ) {
    const username: string = request.headers['x-user-name']?.toString();
    if (!username) throw new BadRequestException('x-user-name');

    const r = await this.reservationService
      .getReservation(username, uid)
      .toPromise();
    const p = await this.paymentService
      .getPayment(username, r.paymentUid)
      .toPromise();

    return {
      ...r,
      startDate: moment(new Date(r.startDate)).format('YYYY-MM-DD'),
      endDate: moment(new Date(r.endDate)).format('YYYY-MM-DD'),
      paymentUid: undefined,
      payment: {
        status: p.status,
        price: p.price,
      },
    };
  }

  @Delete('api/v1/reservations/:reservationId')
  @HttpCode(204)
  async deleteReservation(
    @Param('reservationId') uid: string,
    @Req() request: Request,
  ) {
    const username: string = request.headers['x-user-name']?.toString();
    if (!username) throw new BadRequestException('x-user-name');

    const r = await this.reservationService
      .setReservationStatus(username, uid, 'CANCELED')
      .toPromise();
    if (!r) {
      throw new ServiceUnavailableException('Reservation Service unavailable');
    }
    const p = await this.paymentService
      .changePaymentState(username, r.paymentUid, 'CANCELED')
      .toPromise();
    if (!p) {
      throw new ServiceUnavailableException('Payment Service unavailable');
    }
    const l = await this.loaltyService
      .updateLoyaltyCount(username, 'dec')
      .toPromise();
  }

  @Get('api/v1/loyalty')
  async getLoyalty(@Req() request: Request) {
    const username: string = request.headers['x-user-name']?.toString();
    if (!username) throw new BadRequestException('x-user-name');

    const l = await this.loaltyService.getLoyalty(username).toPromise();
    if (l === null) {
      throw new ServiceUnavailableException('Loyalty Service unavailable');
    }
    return {
      ...l,
      username: undefined,
    };
  }

  @Get('api/v1/me')
  async getMe(@Req() request: Request) {
    const username: string = request.headers['x-user-name']?.toString();
    if (!username) throw new BadRequestException('x-user-name');
    const reservations = await this.getAllReservations(username);
    let loyalty = await this.loaltyService.getLoyalty(username).toPromise();
    if (!loyalty) {
      loyalty = await this.loaltyService.createLoyalty(username).toPromise();
    }
    if (!loyalty) {
      return {
        reservations,
        loyalty: {},
      };
    }
    return {
      reservations,
      loyalty: {
        status: loyalty.status,
        discount: loyalty.discount,
      },
    };
  }
}
