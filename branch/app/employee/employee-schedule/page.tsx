"use client";

import React from "react";
import EmployeeScheduleView from "@/modules/employee-pos/components/EmployeeScheduleView";
import EmployeePermissionGuard from "@/modules/employee-pos/components/EmployeePermissionGuard";

export default function EmployeeSchedulePage() {
  return (
    <EmployeePermissionGuard permissionKey="employee_schedule">
      <EmployeeScheduleView />
    </EmployeePermissionGuard>
  );
}
