import { isSlotExpired, parseSlotDateTime } from '../../features/consultation/utils/dateUtils';

describe('dateUtils', () => {
  describe('parseSlotDateTime', () => {
    it('should parse an AM slot correctly', () => {
      const date = parseSlotDateTime('2026-08-30', '09:00 AM');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(7); // August is 7 (0-indexed)
      expect(date.getDate()).toBe(30);
      expect(date.getHours()).toBe(9);
      expect(date.getMinutes()).toBe(0);
    });

    it('should parse a PM slot correctly', () => {
      const date = parseSlotDateTime('2026-08-30', '02:30 PM');
      expect(date.getHours()).toBe(14);
      expect(date.getMinutes()).toBe(30);
    });

    it('should handle 12 AM and 12 PM limits', () => {
      const midnight = parseSlotDateTime('2026-08-30', '12:00 AM');
      expect(midnight.getHours()).toBe(0);

      const noon = parseSlotDateTime('2026-08-30', '12:00 PM');
      expect(noon.getHours()).toBe(12);
    });
  });

  describe('isSlotExpired', () => {
    const virtualNow = new Date(2026, 7, 30, 11, 0); // August 30, 2026, 11:00 AM

    it('should return true for a past slot', () => {
      expect(isSlotExpired('2026-08-30', '10:00 AM', virtualNow)).toBe(true);
    });

    it('should return false for a future slot on the same day', () => {
      expect(isSlotExpired('2026-08-30', '02:00 PM', virtualNow)).toBe(false);
    });

    it('should return false for slots on subsequent days', () => {
      expect(isSlotExpired('2026-08-31', '09:00 AM', virtualNow)).toBe(false);
    });
  });
});
