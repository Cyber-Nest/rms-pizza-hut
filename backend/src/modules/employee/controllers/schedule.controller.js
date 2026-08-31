const scheduleService = require("../services/schedule.service");

const handleError = (res, error, statusCode = 400) => {
  res.status(statusCode).json({
    success: false,
    message: error.message || "An unexpected error occurred",
  });
};

exports.getWeeklySchedule = async (req, res) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    if (!branchId) {
      return res.status(400).json({ success: false, message: "branchId parameter is required" });
    }
    const data = await scheduleService.getWeeklySchedule(branchId, startDate, endDate);
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
};

exports.saveShiftSchedule = async (req, res) => {
  try {
    const { branchId } = req.body;
    if (!branchId) {
      return res.status(400).json({ success: false, message: "branchId is required" });
    }
    const data = await scheduleService.saveShiftSchedule(branchId, req.body);
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
};

exports.copyPreviousWeekSchedule = async (req, res) => {
  try {
    const { branchId, targetStartDate } = req.body;
    if (!branchId || !targetStartDate) {
      return res.status(400).json({
        success: false,
        message: "branchId and targetStartDate are required",
      });
    }
    const data = await scheduleService.copyPreviousWeekSchedule(branchId, targetStartDate);
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
};

exports.deleteShiftSchedule = async (req, res) => {
  try {
    const { branchId, employeeId, date } = req.query;
    if (!branchId || !employeeId || !date) {
      return res.status(400).json({
        success: false,
        message: "branchId, employeeId, and date query parameters are required",
      });
    }
    const data = await scheduleService.deleteShiftSchedule(branchId, employeeId, date);
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
};
