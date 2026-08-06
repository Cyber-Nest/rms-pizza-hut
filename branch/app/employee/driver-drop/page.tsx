'use client';

import React from 'react';
import DriverDropDashboard from '@/modules/delivery/components/DriverDropDashboard';
import EmployeePermissionGuard from '@/modules/employee-pos/components/EmployeePermissionGuard';

export default function DriverDropPage() {
  return (
    <EmployeePermissionGuard permissionKey="driver_drop">
      <DriverDropDashboard />
    </EmployeePermissionGuard>
  );
}
