'use client';

import React from 'react';
import DeliveryDispatchDashboard from '@/modules/delivery/components/DeliveryDispatchDashboard';
import EmployeePermissionGuard from '@/modules/employee-pos/components/EmployeePermissionGuard';

export default function DeliveryPage() {
  return (
    <EmployeePermissionGuard permissionKey="delivery">
      <DeliveryDispatchDashboard />
    </EmployeePermissionGuard>
  );
}
