import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, map, Observable, of } from 'rxjs';
import { Hotel } from 'src/models/hotel';
import { Reservation } from 'src/models/reservation';

@Injectable()
export class ReservationsService {
  constructor(private readonly http: HttpService) {}

  private host = 'http://reservation:8070';

  public getHotels(page, pageSize): Observable<Hotel[]> {
    const url = this.host + '/hotels';
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('size', pageSize);
    return this.http.get(url, { params }).pipe(
      map((res: any) => res.data),
      catchError((e) => of(null)),
    );
  }

  public getHotel(uid: string) {
    const url = this.host + `/hotels/${uid}`;
    return this.http.get<Hotel>(url).pipe(
      map((res: any) => res.data),
      catchError((e) => of(null)),
    );
  }

  public createReservation(username, r: Reservation) {
    const url = this.host + `/reservations`;
    return this.http
      .post<Reservation>(url, r, {
        headers: {
          'X-User-Name': username,
        },
      })
      .pipe(
        map((res: any) => res.data),
        catchError((e) => of(null)),
      );
  }

  public getReservation(username, uid) {
    const url = this.host + `/reservations/${uid}`;
    return this.http
      .get<Reservation>(url, {
        headers: {
          'X-User-Name': username,
        },
      })
      .pipe(
        map((res: any) => res.data),
        catchError((e) => of(null)),
      );
  }

  public getUserReservations(username) {
    const url = this.host + `/reservations`;
    return this.http
      .get<Reservation[]>(url, {
        headers: {
          'X-User-Name': username,
        },
      })
      .pipe(
        map((res: any) => res.data),
        catchError((e) => of(null)),
      );
  }

  public setReservationStatus(username, uid, status) {
    const url = this.host + `/reservations/${uid}`;
    return this.http
      .patch<Reservation>(
        url,
        { status },
        {
          headers: {
            'X-User-Name': username,
          },
        },
      )
      .pipe(
        map((res: any) => res.data),
        catchError((e) => of(null)),
      );
  }
}
