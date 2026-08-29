const Attendance = require("../models/attendance.model");
const Employee = require("../models/employee.model");
const Driver = require("../../delivery/models/Driver.model");
const Vehicle = require("../../delivery/models/Vehicle.model");

const { triggerDriverStatusChange } = require("../../../config/pusher");
const { getLocalDateStr } = require("../../../shared/utils/timezone");

const getTodayDateStr = () => getLocalDateStr();

// Helper: Calculate minutes between two dates
const diffInMinutes = (start, end) => {
  if (!start || !end) return 0;
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60)));
};

exports.checkIn = async (branchId, employeeId) => {
  if (!branchId || !employeeId) {
    throw new Error("Branch ID and Employee ID are required");
  }

  const employee = await Employee.findOne({ _id: employeeId, branchId, isActive: true });
  if (!employee) {
    throw new Error("Employee not found or inactive");
  }

  const dateStr = getTodayDateStr();
  let attendance = await Attendance.findOne({ branchId, employeeId, date: dateStr });

  if (!attendance) {
    attendance = new Attendance({
      branchId,
      employeeId,
      date: dateStr,
      status: "checked-out",
      shifts: [],
    });
  }

  if (attendance.status === "checked-in" || attendance.status === "on-break") {
    throw new Error("Employee is already checked in");
  }

  // Create new shift
  attendance.shifts.push({
    checkIn: new Date(),
    checkOut: null,
    breaks: [],
    totalWorkMinutes: 0,
    totalBreakMinutes: 0,
  });

  attendance.status = "checked-in";
  await attendance.save();

  return exports.getAttendanceWithEmployee(attendance._id);
};

exports.breakIn = async (branchId, employeeId) => {
  if (!branchId || !employeeId) {
    throw new Error("Branch ID and Employee ID are required");
  }

  const dateStr = getTodayDateStr();
  const attendance = await Attendance.findOne({ branchId, employeeId, date: dateStr });

  if (!attendance || attendance.status !== "checked-in") {
    throw new Error("Employee must be checked-in to start a break");
  }

  const activeShift = attendance.shifts[attendance.shifts.length - 1];
  if (!activeShift || activeShift.checkOut) {
    throw new Error("No active shift found to start break");
  }

  // Check if already on open break
  const hasOpenBreak = activeShift.breaks.some((b) => !b.breakOut);
  if (hasOpenBreak) {
    throw new Error("Employee is already on a break");
  }

  activeShift.breaks.push({
    breakIn: new Date(),
    breakOut: null,
  });

  attendance.status = "on-break";
  await attendance.save();

  return exports.getAttendanceWithEmployee(attendance._id);
};

exports.breakOut = async (branchId, employeeId) => {
  if (!branchId || !employeeId) {
    throw new Error("Branch ID and Employee ID are required");
  }

  const dateStr = getTodayDateStr();
  const attendance = await Attendance.findOne({ branchId, employeeId, date: dateStr });

  if (!attendance || attendance.status !== "on-break") {
    throw new Error("Employee is not currently on break");
  }

  const activeShift = attendance.shifts[attendance.shifts.length - 1];
  if (!activeShift || activeShift.checkOut) {
    throw new Error("No active shift found to end break");
  }

  const openBreak = activeShift.breaks.find((b) => !b.breakOut);
  if (!openBreak) {
    throw new Error("No active break found to end");
  }

  openBreak.breakOut = new Date();

  // Recalculate total break minutes for this shift
  let totalBreakMins = 0;
  activeShift.breaks.forEach((b) => {
    if (b.breakIn && b.breakOut) {
      totalBreakMins += diffInMinutes(b.breakIn, b.breakOut);
    }
  });
  activeShift.totalBreakMinutes = totalBreakMins;

  attendance.status = "checked-in";
  await attendance.save();

  return exports.getAttendanceWithEmployee(attendance._id);
};

exports.checkOut = async (branchId, employeeId) => {
  if (!branchId || !employeeId) {
    throw new Error("Branch ID and Employee ID are required");
  }

  const dateStr = getTodayDateStr();
  const attendance = await Attendance.findOne({ branchId, employeeId, date: dateStr });

  if (!attendance || attendance.status === "checked-out") {
    throw new Error("Employee is not currently checked in");
  }

  const activeShift = attendance.shifts[attendance.shifts.length - 1];
  if (!activeShift || activeShift.checkOut) {
    throw new Error("No active shift found to check out");
  }

  // If on break, auto close break first
  if (attendance.status === "on-break") {
    const openBreak = activeShift.breaks.find((b) => !b.breakOut);
    if (openBreak) {
      openBreak.breakOut = new Date();
    }
  }

  const now = new Date();
  activeShift.checkOut = now;

  // Calculate total break minutes
  let totalBreakMins = 0;
  activeShift.breaks.forEach((b) => {
    if (b.breakIn && b.breakOut) {
      totalBreakMins += diffInMinutes(b.breakIn, b.breakOut);
    }
  });
  activeShift.totalBreakMinutes = totalBreakMins;

  // Calculate total gross shift minutes and net work minutes
  const totalShiftMins = diffInMinutes(activeShift.checkIn, now);
  activeShift.totalWorkMinutes = Math.max(0, totalShiftMins - totalBreakMins);

  attendance.status = "checked-out";
  await attendance.save();

  // If employee is a driver, automatically update Driver model status to offline and unassign vehicle
  try {
    const employee = await Employee.findOne({ _id: employeeId, branchId }).select("role driverRef employeeId").lean();

    if (employee && (employee.role === "driver" || employee.driverRef)) {

      const driverFilter = employee.driverRef
        ? { _id: employee.driverRef }
        : { driverId: employee.employeeId };

      const driverDoc = await Driver.findOne(driverFilter);
      if (driverDoc) {
        // Auto-unassign vehicle if assigned
        if (driverDoc.assignedVehicleId) {
          await Vehicle.findByIdAndUpdate(driverDoc.assignedVehicleId, {
            isAssigned: false,
            assignedDriverId: null,
          });
        }

        // Set driver offline, unassign vehicle, clear active orders
        driverDoc.status = "offline";
        driverDoc.isDutyOnline = false;
        driverDoc.assignedVehicleId = null;
        driverDoc.activeOrderIds = [];
        await driverDoc.save();

        try {
          await triggerDriverStatusChange(String(branchId), {
            driverId: driverDoc._id.toString(),
            status: "offline",
            posCheckedIn: false,
            checkedOut: true,
          });
        } catch (pe) {}
      }
    }
  } catch (err) {
    console.warn("Could not set driver status offline on checkout:", err.message);
  }

  return exports.getAttendanceWithEmployee(attendance._id);
};

exports.getAttendanceWithEmployee = async (attendanceId) => {
  const doc = await Attendance.findById(attendanceId)
    .populate("employeeId", "name employeeId role phone email address isActive")
    .lean();
  return doc;
};

exports.getTodayAttendanceList = async (branchId, dateStr = null) => {
  if (!branchId) {
    throw new Error("Branch ID is required");
  }

  const targetDate = dateStr || getTodayDateStr();

  // Get all active employees for this branch
  const employees = await Employee.find({ branchId, isActive: true })
    .select("name employeeId role phone email address isActive")
    .sort({ name: 1 })
    .lean();

  // Get today's attendance records
  const attendances = await Attendance.find({ branchId, date: targetDate }).lean();

  const attendanceMap = new Map();
  attendances.forEach((att) => {
    attendanceMap.set(String(att.employeeId), att);
  });

  // Combine employees with their attendance status
  const result = employees.map((emp) => {
    const att = attendanceMap.get(String(emp._id));
    return {
      employee: emp,
      attendance: att || null,
      status: att ? att.status : "checked-out",
      shifts: att ? att.shifts : [],
    };
  });

  return {
    date: targetDate,
    records: result,
  };
};

exports.getEmployeeAttendanceHistory = async (branchId, employeeId, startDate, endDate) => {
  if (!branchId || !employeeId) {
    throw new Error("Branch ID and Employee ID are required");
  }

  const filter = { branchId, employeeId };

  if (startDate && endDate) {
    filter.date = { $gte: startDate, $lte: endDate };
  }

  const history = await Attendance.find(filter)
    .sort({ date: -1 })
    .lean();

  return history;
};

exports.getAttendanceReport = async (branchId, options = {}) => {
  if (!branchId) {
    throw new Error("Branch ID is required");
  }

  const { startDate, endDate, employeeId, role } = options;

  const query = { branchId };

  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  } else if (startDate) {
    query.date = { $gte: startDate };
  } else if (endDate) {
    query.date = { $lte: endDate };
  }

  if (employeeId) {
    query.employeeId = employeeId;
  }

  const attendanceDocs = await Attendance.find(query)
    .populate("employeeId", "name employeeId role phone email address isActive")
    .sort({ date: -1 })
    .lean();

  const filteredDocs = attendanceDocs.filter((doc) => {
    if (!doc.employeeId) return false;
    if (role && role !== "all") {
      return doc.employeeId.role === role;
    }
    return true;
  });

  const rows = [];
  let grandTotalWorkMins = 0;
  let grandTotalBreakMins = 0;
  let totalShiftsCount = 0;
  const uniqueEmployeeIds = new Set();

  filteredDocs.forEach((doc) => {
    const emp = doc.employeeId;
    if (!emp) return;
    uniqueEmployeeIds.add(String(emp._id));

    const dateStr = doc.date;
    let formattedDateDay = dateStr;
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const dayName = dt.toLocaleDateString("en-US", { weekday: "short" });
      formattedDateDay = `${dateStr} (${dayName})`;
    } catch (e) {}

    const shifts = doc.shifts || [];

    if (shifts.length === 0) {
      rows.push({
        attendanceId: String(doc._id),
        employeeId: emp.employeeId,
        employeeName: emp.name,
        role: emp.role,
        date: dateStr,
        dateDayStr: formattedDateDay,
        startTime: "--",
        endTime: "--",
        totalShiftHours: 0,
        breaks: [],
        break1In: "--",
        break1Out: "--",
        break2In: "--",
        break2Out: "--",
        break3In: "--",
        break3Out: "--",
        totalBreakHours: 0,
        totalPayableHours: 0,
        status: doc.status,
      });
    } else {
      shifts.forEach((shift, sIdx) => {
        totalShiftsCount++;

        const checkInIso = shift.checkIn;
        const checkOutIso = shift.checkOut;

        const startTimeStr = checkInIso
          ? new Date(checkInIso).toLocaleTimeString("en-US", {
              timeZone: "America/Edmonton",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : "--";

        const endTimeStr = checkOutIso
          ? new Date(checkOutIso).toLocaleTimeString("en-US", {
              timeZone: "America/Edmonton",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : shift.checkIn
            ? "Working..."
            : "--";

        const endTime = checkOutIso ? new Date(checkOutIso) : new Date();
        const startTime = checkInIso ? new Date(checkInIso) : new Date();
        const grossDiffMs = endTime.getTime() - startTime.getTime();
        const grossMins = Math.max(0, Math.round(grossDiffMs / (1000 * 60)));
        const grossHrs = parseFloat((grossMins / 60).toFixed(2));

        const breaks = shift.breaks || [];
        let totalBreakMins = 0;

        const formattedBreaks = breaks.map((b) => {
          const bInStr = b.breakIn
            ? new Date(b.breakIn).toLocaleTimeString("en-US", {
                timeZone: "America/Edmonton",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
            : "--";
          const bOutStr = b.breakOut
            ? new Date(b.breakOut).toLocaleTimeString("en-US", {
                timeZone: "America/Edmonton",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
            : b.breakIn
              ? "On Break"
              : "--";

          const bDuration = diffInMinutes(b.breakIn, b.breakOut || new Date());
          totalBreakMins += bDuration;

          return {
            breakIn: bInStr,
            breakOut: bOutStr,
            durationMins: bDuration,
          };
        });

        const totalBreakHrs = parseFloat((totalBreakMins / 60).toFixed(2));
        const netWorkMins = Math.max(0, grossMins - totalBreakMins);
        const payableHrs = parseFloat((netWorkMins / 60).toFixed(2));

        grandTotalWorkMins += netWorkMins;
        grandTotalBreakMins += totalBreakMins;

        rows.push({
          attendanceId: String(doc._id),
          shiftId: String(shift._id || sIdx),
          employeeId: emp.employeeId,
          employeeName: emp.name,
          role: emp.role,
          date: dateStr,
          dateDayStr: formattedDateDay,
          startTime: startTimeStr,
          endTime: endTimeStr,
          rawCheckIn: shift.checkIn,
          rawCheckOut: shift.checkOut,
          rawBreaks: (shift.breaks || []).map((b) => ({
            breakIn: b.breakIn,
            breakOut: b.breakOut,
            _id: b._id,
          })),
          totalShiftHours: grossHrs,
          breaks: formattedBreaks,
          break1In: formattedBreaks[0]?.breakIn || "--",
          break1Out: formattedBreaks[0]?.breakOut || "--",
          break2In: formattedBreaks[1]?.breakIn || "--",
          break2Out: formattedBreaks[1]?.breakOut || "--",
          break3In: formattedBreaks[2]?.breakIn || "--",
          break3Out: formattedBreaks[2]?.breakOut || "--",
          totalBreakHours: totalBreakHrs,
          totalPayableHours: payableHrs,
          status: !checkOutIso ? doc.status : "completed",
        });
      });
    }
  });

  return {
    summary: {
      totalPayableHours: parseFloat((grandTotalWorkMins / 60).toFixed(2)),
      totalBreakHours: parseFloat((grandTotalBreakMins / 60).toFixed(2)),
      totalShifts: totalShiftsCount,
      totalEmployees: uniqueEmployeeIds.size,
    },
    rows,
  };
};

exports.editAttendanceShift = async (branchId, payload) => {
  const { attendanceId, shiftId, checkIn, checkOut, breaks } = payload;

  if (!attendanceId) {
    throw new Error("Attendance Record ID is required");
  }

  const query = { _id: attendanceId };
  if (branchId) {
    query.branchId = branchId;
  }

  const doc = await Attendance.findOne(query);
  if (!doc) {
    throw new Error("Attendance record not found");
  }

  let shift = doc.shifts.id(shiftId);
  if (!shift && typeof shiftId === "number") {
    shift = doc.shifts[shiftId];
  }
  if (!shift) {
    shift = doc.shifts[0];
  }
  if (!shift) {
    throw new Error("Shift record not found");
  }

  if (checkIn) {
    shift.checkIn = new Date(checkIn);
  }

  if (checkOut !== undefined) {
    shift.checkOut = checkOut ? new Date(checkOut) : null;
  }

  if (Array.isArray(breaks)) {
    shift.breaks = breaks.map((b) => ({
      breakIn: new Date(b.breakIn),
      breakOut: b.breakOut ? new Date(b.breakOut) : null,
    }));
  }

  let totalBreakMins = 0;
  (shift.breaks || []).forEach((b) => {
    if (b.breakIn) {
      const duration = diffInMinutes(b.breakIn, b.breakOut || new Date());
      totalBreakMins += duration;
    }
  });

  const startTime = shift.checkIn ? new Date(shift.checkIn) : new Date();
  const endTime = shift.checkOut ? new Date(shift.checkOut) : new Date();
  const grossDiffMs = endTime.getTime() - startTime.getTime();
  const grossMins = Math.max(0, Math.round(grossDiffMs / (1000 * 60)));

  shift.totalBreakMinutes = totalBreakMins;
  shift.totalWorkMinutes = Math.max(0, grossMins - totalBreakMins);

  if (shift.checkOut) {
    doc.status = "checked-out";
  } else {
    const lastBreak = shift.breaks && shift.breaks[shift.breaks.length - 1];
    if (lastBreak && lastBreak.breakIn && !lastBreak.breakOut) {
      doc.status = "on-break";
    } else {
      doc.status = "checked-in";
    }
  }

  await doc.save();
  return doc;
};
