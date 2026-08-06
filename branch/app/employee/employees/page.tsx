"use client";

import React from "react";
import EmployeeManagementView from "@/modules/employee-pos/components/EmployeeManagementView";
import EmployeePermissionGuard from "@/modules/employee-pos/components/EmployeePermissionGuard";

export default function EmployeesPage() {
  return (
    <EmployeePermissionGuard permissionKey="employees">
      <EmployeeManagementView />
    </EmployeePermissionGuard>
  );
}
