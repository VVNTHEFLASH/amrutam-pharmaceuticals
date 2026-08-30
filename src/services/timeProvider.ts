let customNowFn: (() => Date) | null = null;

export const timeProvider = {
  getCurrentTime(): Date {
    if (customNowFn) {
      return customNowFn();
    }
    return new Date();
  },
  setCustomNowFn(fn: (() => Date) | null) {
    customNowFn = fn;
  }
};
