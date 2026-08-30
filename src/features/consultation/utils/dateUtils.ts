export function parseSlotDateTime(dateStr: string, slotTimeStr: string): Date {
  const [time, modifier] = slotTimeStr.split(' ');
  const [hoursStr, minutesStr] = time.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (modifier === 'PM' && hours < 12) {
    hours += 12;
  }
  if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

export function isSlotExpired(
  dateStr: string,
  slotTimeStr: string,
  now: Date = new Date(2026, 7, 30, 11, 0)
): boolean {
  const slotDate = parseSlotDateTime(dateStr, slotTimeStr);
  return slotDate.getTime() < now.getTime();
}
