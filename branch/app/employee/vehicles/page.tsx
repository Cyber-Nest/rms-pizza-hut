'use client';

import React from 'react';
import VehiclesDashboard from '../../../modules/employee-pos/components/VehiclesDashboard';
import EmployeePermissionGuard from '@/modules/employee-pos/components/EmployeePermissionGuard';

export default function VehiclesPage() {
  return (
    <EmployeePermissionGuard permissionKey="vehicles">
      <VehiclesDashboard />
    </EmployeePermissionGuard>
  );
}
