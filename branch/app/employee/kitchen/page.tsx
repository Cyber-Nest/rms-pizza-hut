'use client';

import React from 'react';
import KitchenDashboard from '@/modules/employee-pos/components/KitchenDashboard';
import EmployeePermissionGuard from '@/modules/employee-pos/components/EmployeePermissionGuard';

export default function KitchenPage() {
  return (
    <EmployeePermissionGuard permissionKey="kitchen">
      <KitchenDashboard />
    </EmployeePermissionGuard>
  );
}
