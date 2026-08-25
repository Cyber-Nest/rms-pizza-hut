import { getCanadaDayName, getCanadaCurrentTime, getCanadaTodayStr } from "./timezone";

export interface StoreTiming {
  day: string;
  startTime: string;
  endTime: string;
  isHoliday: string; // 'Yes' | 'No'
}

export interface BranchStoreSettings {
  mainSettings?: {
    isEmergencyClosed?: boolean;
    timezone?: string;
  };
  taxFeesSettings?: {
    deliveryFee?: number;
    gstTaxRate?: number;
    pstTaxRate?: number;
    hstTaxRate?: number;
  };
  storeTimings?: StoreTiming[];
  storeTimingsUpdates?: any[];
  holidays?: any[];
}

export interface BranchWithSettings {
  _id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  openingHours?: string;
  isActive: boolean;
  settings?: BranchStoreSettings;
}

export function parse12HourTime(timeStr: string): {
  hours: number;
  minutes: number;
} {
  if (!timeStr) return { hours: 10, minutes: 0 };
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return { hours: 10, minutes: 0 };

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3];

  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

export function getTodayBranchSchedule(branch: BranchWithSettings | null) {
  const dayName = getCanadaDayName();

  if (
    !branch ||
    !branch.settings ||
    !Array.isArray(branch.settings.storeTimings)
  ) {
    return {
      day: dayName,
      startTime: "10:00 AM",
      endTime: "09:00 PM",
      isHoliday: "No",
      isEmergencyClosed: !!branch?.settings?.mainSettings?.isEmergencyClosed,
    };
  }

  const todaySchedule = branch.settings.storeTimings.find(
    (st) => st.day && st.day.toLowerCase() === dayName.toLowerCase(),
  );

  return {
    day: dayName,
    startTime: todaySchedule?.startTime || "10:00 AM",
    endTime: todaySchedule?.endTime || "09:00 PM",
    isHoliday: todaySchedule?.isHoliday || "No",
    isEmergencyClosed: !!branch.settings?.mainSettings?.isEmergencyClosed,
  };
}

export function isBranchCurrentlyOpen(branch: BranchWithSettings | null): {
  isOpen: boolean;
  reason: string;
  scheduleText: string;
  startTimeStr: string;
  endTimeStr: string;
  isBeforeOpening: boolean;
  isAfterClosing: boolean;
} {
  if (!branch) {
    return {
      isOpen: false,
      reason: "No branch selected",
      scheduleText: "10:00 AM - 09:00 PM",
      startTimeStr: "10:00 AM",
      endTimeStr: "09:00 PM",
      isBeforeOpening: false,
      isAfterClosing: false,
    };
  }

  const schedule = getTodayBranchSchedule(branch);
  const scheduleText = `${schedule.startTime} - ${schedule.endTime}`;

  if (!branch.isActive) {
    return {
      isOpen: false,
      reason: "Branch inactive",
      scheduleText,
      startTimeStr: schedule.startTime,
      endTimeStr: schedule.endTime,
      isBeforeOpening: false,
      isAfterClosing: false,
    };
  }

  if (schedule.isEmergencyClosed) {
    return {
      isOpen: false,
      reason: "Closed Today",
      scheduleText,
      startTimeStr: schedule.startTime,
      endTimeStr: schedule.endTime,
      isBeforeOpening: false,
      isAfterClosing: false,
    };
  }

  if (schedule.isHoliday === "Yes") {
    return {
      isOpen: false,
      reason: "Closed for Holiday",
      scheduleText,
      startTimeStr: schedule.startTime,
      endTimeStr: schedule.endTime,
      isBeforeOpening: false,
      isAfterClosing: false,
    };
  }

  const { hours, minutes } = getCanadaCurrentTime();
  const currentTotalMins = hours * 60 + minutes;

  const startParsed = parse12HourTime(schedule.startTime);
  const startTotalMins = startParsed.hours * 60 + startParsed.minutes;

  const endParsed = parse12HourTime(schedule.endTime);
  const endTotalMins = endParsed.hours * 60 + endParsed.minutes;

  if (currentTotalMins < startTotalMins) {
    return {
      isOpen: false,
      reason: `Opens at ${schedule.startTime}`,
      scheduleText,
      startTimeStr: schedule.startTime,
      endTimeStr: schedule.endTime,
      isBeforeOpening: true,
      isAfterClosing: false,
    };
  }

  if (currentTotalMins >= endTotalMins) {
    return {
      isOpen: false,
      reason: `Closed for today (Closed at ${schedule.endTime})`,
      scheduleText,
      startTimeStr: schedule.startTime,
      endTimeStr: schedule.endTime,
      isBeforeOpening: false,
      isAfterClosing: true,
    };
  }

  return {
    isOpen: true,
    reason: "Open Now",
    scheduleText,
    startTimeStr: schedule.startTime,
    endTimeStr: schedule.endTime,
    isBeforeOpening: false,
    isAfterClosing: false,
  };
}

export function generateValidTimeSlotsForBranch(
  branch: BranchWithSettings | null,
  selectedDateStr: string,
): string[] {
  const schedule = getTodayBranchSchedule(branch);
  const slots: string[] = [];

  const startParsed = parse12HourTime(schedule.startTime);
  const endParsed = parse12HourTime(schedule.endTime);

  const todayStr = getCanadaTodayStr();

  let startTime = new Date();

  if (selectedDateStr === todayStr) {
    // Current Canada time + 1 hour prep buffer (60 mins)
    const { hours, minutes } = getCanadaCurrentTime();
    let minTime = new Date();
    minTime.setHours(hours + 1, minutes, 0, 0);

    // Earliest time slot allowed is 1 hour AFTER store opening time
    const storeEarliestSlotTime = new Date();
    storeEarliestSlotTime.setHours(
      startParsed.hours + 1,
      startParsed.minutes,
      0,
      0,
    );

    if (minTime < storeEarliestSlotTime) {
      minTime = storeEarliestSlotTime;
    }

    // Round minutes up to next 15-minute interval
    const mins = minTime.getMinutes();
    const roundedMins = Math.ceil(mins / 15) * 15;
    if (roundedMins === 60) {
      minTime.setHours(minTime.getHours() + 1);
      minTime.setMinutes(0);
    } else {
      minTime.setMinutes(roundedMins);
    }
    minTime.setSeconds(0, 0);
    startTime = minTime;
  } else {
    // Future date: time slots start 1 hour after opening time
    startTime.setHours(startParsed.hours + 1, startParsed.minutes, 0, 0);
  }

  const endTime = new Date();
  endTime.setHours(endParsed.hours, endParsed.minutes, 0, 0);

  while (startTime < endTime) {
    const hours = startTime.getHours();
    const currentMins = startTime.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
    const formattedMinutes = currentMins < 10 ? `0${currentMins}` : currentMins;

    const timeStr = `${formattedHours}:${formattedMinutes} ${ampm}`;
    slots.push(timeStr);

    startTime.setMinutes(startTime.getMinutes() + 15);
  }

  return slots;
}
