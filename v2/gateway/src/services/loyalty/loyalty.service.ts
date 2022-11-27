import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, from, map, Observable, of } from 'rxjs';
import { Loyalty } from 'src/models/loyalty';
import { CircuitBreaker } from 'src/circuit-breaker';

@Injectable()
export class LoyaltyService {
  constructor(private readonly http: HttpService) {}

  private host = 'http://loyalty:8050';
  private getLoyaltyBrecker = new CircuitBreaker(([url, username]) =>
    this.http
      .get<Loyalty>(url, {
        headers: {
          'X-User-Name': username,
        },
      })
      .pipe(map((res) => res.data))
      .toPromise(),
  );

  public getLoyalty(username): Observable<Loyalty> {
    const url = this.host + '/loyalty';
    return from(this.getLoyaltyBrecker.fire(url, username)).pipe(
      map((el) => (el instanceof Error ? null : el)),
      catchError((e) => of(null)),
    );
  }

  public createLoyalty(username) {
    const url = this.host + '/loyalty';
    return this.http
      .post<Loyalty>(
        url,
        {},
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

  public updateLoyaltyCount(username: string, type: 'inc' | 'dec') {
    const url = this.host + '/loyalty';
    return this.http
      .patch<Loyalty>(
        url,
        {
          type,
        },
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
