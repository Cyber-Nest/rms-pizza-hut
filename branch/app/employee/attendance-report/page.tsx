'use client';

import React from 'react';
import AttendanceReportView from '@/modules/employee-pos/components/AttendanceReportView';
import EmployeePermissionGuard from '@/modules/employee-pos/components/EmployeePermissionGuard';

export default function AttendanceReportPage() {
  return (
    <EmployeePermissionGuard permissionKey="attendance_report">
      <AttendanceReportView />
    </EmployeePermissionGuard>
  );
}
