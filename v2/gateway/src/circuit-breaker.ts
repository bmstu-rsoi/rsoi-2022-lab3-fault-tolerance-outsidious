export class CircuitBreaker<PAYLOAD> {
  state = 'OPENED';
  halfFinishMoment?: number;
  closeMoment?: number;
  failsQua = 0;
  successQua = 0;
  options: {
    openTimeout: 10000;
    closedTimeout: 5000;
    failedRequests: 15;
    percentFailedRequest: 50;
  };

  constructor(private request: (...args: any[]) => Promise<PAYLOAD>) {}

  async fire(...args: any[]) {
    if (this.state === 'CLOSED' && Date.now() < this.closeMoment!) {
      throw new Error('Breaker closed');
    }
    try {
      const response = await this.request(args);
      return this.success(response);
    } catch (e) {
      return this.fail(new Error(e));
    }
  }

  private resetStatistic() {
    this.successQua = 0;
    this.failsQua = 0;
    this.halfFinishMoment = undefined;
  }

  private success(response: PAYLOAD) {
    if (this.state === 'HALF') {
      this.successQua++;
      if (Date.now() >= this.halfFinishMoment!) {
        this.state = 'OPENED';
        this.resetStatistic();
      }
    }
    if (this.state === 'CLOSED') {
      this.state = 'OPENED';
      this.resetStatistic();
    }
    return response;
  }

  private fail(e: any) {
    if (this.state === 'CLOSED') {
      this.closeMoment = Date.now() + this.options.closedTimeout;
      return e;
    }
    if (this.state === 'OPENED') {
      this.failsQua = 1;
      this.state = 'HALF';
      this.halfFinishMoment = Date.now() + this.options.openTimeout;
      return e;
    }
    if (this.state === 'HALF') {
      this.failsQua++;
      if (Date.now() > this.halfFinishMoment!) {
        this.resetStatistic();
        this.failsQua = 1;
        this.halfFinishMoment = Date.now() + this.options.openTimeout;
        return e;
      }
      if (this.failsQua >= this.options.failedRequests) {
        const failRate =
          (this.failsQua * 100) / (this.failsQua + this.successQua);
        if (failRate >= this.options.percentFailedRequest) {
          this.state = 'CLOSED';
          this.resetStatistic();
          this.closeMoment = Date.now() + this.options.closedTimeout;
          return e;
        }
        this.resetStatistic();
        this.failsQua = 1;
        this.halfFinishMoment = Date.now() + this.options.openTimeout;
        return e;
      }
    }
    return e;
  }
}
