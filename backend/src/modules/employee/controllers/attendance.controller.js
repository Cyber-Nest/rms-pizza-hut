const attendanceService = require("../services/attendance.service");
const logger = require("../../../shared/utils/logger");

const getBranchIdFromReq = (req) => {
  return (
    req.query.branchId ||
    req.body.branchId ||
    req.activeBranchId ||
    req.branch?.branchId ||
    req.branch?._id
  );
};

exports.checkIn = async (req, res) => {
  try {
    const branchId = getBranchIdFromReq(req);
    const { employeeId, managerPin } = req.body;
    const data = await attendanceService.checkIn(branchId, employeeId, managerPin);
    res.status(200).json({
      success: true,
      message: "Checked in successfully",
      data,
    });
  } catch (error) {
    logger.error(`Error in checkIn: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.breakIn = async (req, res) => {
  try {
    const branchId = getBranchIdFromReq(req);
    const { employeeId } = req.body;
    const data = await attendanceService.breakIn(branchId, employeeId);
    res.status(200).json({
      success: true,
      message: "Break started successfully",
      data,
    });
  } catch (error) {
    logger.error(`Error in breakIn: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.breakOut = async (req, res) => {
  try {
    const branchId = getBranchIdFromReq(req);
    const { employeeId } = req.body;
    const data = await attendanceService.breakOut(branchId, employeeId);
    res.status(200).json({
      success: true,
      message: "Break ended successfully",
      data,
    });
  } catch (error) {
    logger.error(`Error in breakOut: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const branchId = getBranchIdFromReq(req);
    const { employeeId } = req.body;
    const data = await attendanceService.checkOut(branchId, employeeId);
    res.status(200).json({
      success: true,
      message: "Checked out successfully",
      data,
    });
  } catch (error) {
    logger.error(`Error in checkOut: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTodayAttendanceList = async (req, res) => {
  try {
    const branchId = getBranchIdFromReq(req);
    const dateStr = req.query.date || null;
    const data = await attendanceService.getTodayAttendanceList(branchId, dateStr);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error(`Error fetching today attendance list: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getEmployeeAttendanceHistory = async (req, res) => {
  try {
    const branchId = getBranchIdFromReq(req);
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;
    const data = await attendanceService.getEmployeeAttendanceHistory(branchId, employeeId, startDate, endDate);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error(`Error fetching employee attendance history: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAttendanceReport = async (req, res) => {
  try {
    const branchId = getBranchIdFromReq(req);
    const { startDate, endDate, employeeId, role } = req.query;
    const data = await attendanceService.getAttendanceReport(branchId, {
      startDate,
      endDate,
      employeeId,
      role,
    });
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error(`Error fetching attendance report: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.editAttendanceShift = async (req, res) => {
  try {
    const branchId = getBranchIdFromReq(req);
    const updated = await attendanceService.editAttendanceShift(branchId, req.body);
    res.status(200).json({
      success: true,
      message: "Shift log updated successfully",
      data: updated,
    });
  } catch (error) {
    logger.error(`Error updating shift log: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Lightweight sweep endpoint — called silently on POS page load/refresh
// Runs the auto-checkout sweeper without returning any sensitive data
exports.runSweeper = async (req, res) => {
  try {
    const branchId = getBranchIdFromReq(req);
    if (!branchId) {
      return res.status(400).json({ success: false, message: "branchId required" });
    }
    await attendanceService.checkAndAutoCheckoutOverdueShifts(branchId);
    res.status(200).json({ success: true });
  } catch (error) {
    // Silent fail — don't block POS from loading
    res.status(200).json({ success: true });
  }
};
