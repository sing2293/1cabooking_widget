export interface AvailableSlot {
  date: string;   // YYYY-MM-DD
  times: string[];
}

export function generateAvailableSlots(): AvailableSlot[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(today);
  end.setDate(end.getDate() + 42); // 6 weeks ahead

  const slots: AvailableSlot[] = [];
  const current = new Date(today);
  current.setDate(current.getDate() + 2); // minimum 2-day lead time

  while (current <= end) {
    const day = current.getDay(); // 0=Sun … 6=Sat
    // Available days: Wed(3), Thu(4), Fri(5), Sat(6)
    if (day >= 3 && day <= 6) {
      const daysOut = Math.floor((current.getTime() - today.getTime()) / 86_400_000);
      // Slots within the first week are limited (partly booked)
      const times = daysOut < 7
        ? ['11:00 AM', '2:00 PM']
        : ['8:00 AM', '11:00 AM', '2:00 PM'];

      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      slots.push({ date: `${yyyy}-${mm}-${dd}`, times });
    }
    current.setDate(current.getDate() + 1);
  }

  return slots;
}
