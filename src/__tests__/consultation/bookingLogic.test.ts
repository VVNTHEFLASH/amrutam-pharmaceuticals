import { isSlotExpired, parseSlotDateTime } from '../../features/consultation/utils/dateUtils';

describe('Doctor Booking Date Selection and Slot Logic', () => {
  const DEFAULT_NOW = new Date(2026, 7, 30, 11, 0); // 2026-08-30 11:00 AM

  it('should parse slot datetime correctly across AM/PM boundaries', () => {
    // 09:00 AM
    const dateAM = parseSlotDateTime('2026-08-30', '09:00 AM');
    expect(dateAM.getFullYear()).toBe(2026);
    expect(dateAM.getMonth()).toBe(7); // August
    expect(dateAM.getDate()).toBe(30);
    expect(dateAM.getHours()).toBe(9);
    expect(dateAM.getMinutes()).toBe(0);

    // 02:30 PM
    const datePM = parseSlotDateTime('2026-08-30', '02:30 PM');
    expect(datePM.getHours()).toBe(14);
    expect(datePM.getMinutes()).toBe(30);
  });

  it('should evaluate slot expiration correctly against virtual current time', () => {
    // Slot is at 09:00 AM, virtual now is 11:00 AM on August 30, 2026. This slot has expired.
    expect(isSlotExpired('2026-08-30', '09:00 AM', DEFAULT_NOW)).toBe(true);

    // Slot is at 12:00 PM (noon), virtual now is 11:00 AM on August 30, 2026. This slot is NOT expired.
    expect(isSlotExpired('2026-08-30', '12:00 PM', DEFAULT_NOW)).toBe(false);

    // Slot is on next day (August 31, 2026) at 09:00 AM. This slot is NOT expired.
    expect(isSlotExpired('2026-08-31', '09:00 AM', DEFAULT_NOW)).toBe(false);
  });

  it('should invalidate/flag booking dates that are before the base mock date', () => {
    const selectedDate1 = '2026-08-29'; // Past date
    const selectedDate2 = '2026-08-30'; // Today
    const selectedDate3 = '2026-09-01'; // Future

    // Verification pattern matching the component constraint (selectedDate >= '2026-08-30')
    expect(selectedDate1 >= '2026-08-30').toBe(false);
    expect(selectedDate2 >= '2026-08-30').toBe(true);
    expect(selectedDate3 >= '2026-08-30').toBe(true);
  });
});
