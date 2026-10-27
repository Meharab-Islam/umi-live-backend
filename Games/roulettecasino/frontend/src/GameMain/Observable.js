class SafeObserver {
  constructor(destination) {
    this.destination = destination;
  }

  next(value) {
    // only try to next if you're subscribed have a handler
    if (!this.isUnsubscribed && this.destination.next) {
      try {
        this.destination.next(value);
      } catch (err) {
        // if the provided handler errors, teardown resources, then throw
        this.unsubscribe();
        throw err;
      }
    }
  }

  error(err) {
    // only try to emit error if you're subscribed and have a handler
    if (!this.isUnsubscribed && this.destination.error) {
      try {
        this.destination.error(err);
      } catch (e2) {
        // if the provided handler errors, teardown resources, then throw
        this.unsubscribe();
        throw e2;
      }
      this.unsubscribe();
    }
  }

  complete() {
    // only try to emit completion if you're subscribed and have a handler
    if (!this.isUnsubscribed && this.destination.complete) {
      try {
        this.destination.complete();
      } catch (err) {
        // if the provided handler errors, teardown resources, then throw
        this.unsubscribe();
        throw err;
      }
      this.unsubscribe();
    }
  }

  unsubscribe() {
    this.isUnsubscribed = true;
    if (this.unsub) {
      this.unsub();
    }
  }
}

export class Observable {
  constructor(_subscribe) {
    this._subscribe = _subscribe;
  }

  subscribe(observer) {
    const safeObserver = new SafeObserver(observer);
    safeObserver.unsub = this._subscribe(safeObserver);
    return safeObserver.unsubscribe.bind(safeObserver);
  }
}

export const map = project => source =>
  new Observable(observer =>
    source.subscribe({
      next: x => observer.next(project(x)),
      error: err => observer.error(err),
      complete: () => observer.complete()
    })
  );

export const filter = f => source =>
  new Observable(observer =>
    source.subscribe({
      next: x => (f(x) ? observer.next(x) : void 8),
      error: err => observer.error(err),
      complete: () => observer.complete()
    })
  );

export const take = limit => source =>
  new Observable(observer => {
    var i = 0;
    return source.subscribe({
      next: x => {
        i++;
        observer.next(x);
        if (i == limit) {
          observer.complete();
        }
      },
      error: err => observer.error(err),
      complete: () => observer.complete()
    });
  });

export const act = f =>
  map(x => {
    f(x);
    return x;
  });

export const startWith = init => source =>
  new Observable(observer => {
    observer.next(init);
    return source.subscribe(observer);
  });

export const scan = f => source =>
  new Observable(observer => {
    var last = null;
    var has_last = false;
    const mapObserver = {
      next: x => {
        last = has_last ? f(last, x) : x;
        has_last = true;
        return observer.next(last);
      },
      error: err => observer.error(err),
      complete: () => observer.complete()
    };
    return source.subscribe(mapObserver);
  });

export const withLatestFrom = right => source =>
  new Observable(observer => {
    var right_val = null;
    const sourceObserver = {
      next: x => observer.next([x, right_val]),
      error: err => observer.error(err),
      complete: () => observer.complete()
    };
    const rightObserver = {
      next: x => {
        right_val = x;
      },
      error: err => observer.error(err),
      complete: () => observer.complete()
    };
    const source_unsub = source.subscribe(sourceObserver);
    const right_unsub = right.subscribe(rightObserver);
    const unsub = () => {
      source_unsub();
      right_unsub();
    };
    return unsub;
  });

export const timer = (interval, limit = Infinity) =>
  new Observable(observer => {
    var i = 0;
    const t = setInterval(() => {
      observer.next(i++);
      if (i == limit) {
        observer.complete();
        clearInterval(t);
      }
    }, interval);
    return () => clearInterval(t);
  });

export const fromEvent = (element, eventname) =>
  new Observable(observer => {
    const callback = e => observer.next(e);
    element.addEventListener(eventname, callback);
    return () => element.removeEventListener(eventname, callback);
  });

export function pipe(initialValue, ...fns) {
  return fns.reduce((state, fn) => fn(state), initialValue);
}

export const takeUntil = notifier => source =>
  new Observable(observer => {
    const source_unsub = source.subscribe({
      next: x => observer.next(x),
      error: err => observer.error(err),
      complete: () => observer.complete()
    });
    const notifier_unsub = notifier.subscribe({
      next: _x => {
        observer.complete();
      },
      error: err => observer.error(err),
      complete: () => observer.complete()
    });
    const unsub = () => {
      source_unsub();
      notifier_unsub();
    };
    return unsub;
  });

export const zip = left => right =>
  new Observable(observer => {
    var left_queue = [];
    var right_queue = [];
    const leftObserver = {
      next: x => {
        left_queue.push(x);
        const r = right_queue.shift();
        if (typeof r != "undefined") {
          const l = left_queue.shift();
          observer.next([l, r]);
        }
      },
      error: err => observer.error(err),
      complete: () => observer.complete()
    };
    const rightObserver = {
      next: x => {
        right_queue.push(x);
        const l = left_queue.shift();
        if (typeof l != "undefined") {
          const r = right_queue.shift();
          observer.next([l, r]);
        }
      },
      error: err => observer.error(err),
      complete: () => observer.complete()
    };
    const left_unsub = left.subscribe(leftObserver);
    const right_unsub = right.subscribe(rightObserver);
    const unsub = () => {
      left_unsub();
      right_unsub();
    };
    return unsub;
  });
