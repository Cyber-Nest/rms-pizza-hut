'use client';

import React from 'react';
import OrdersDashboard from '@/modules/employee-pos/components/OrdersDashboard';
import EmployeePermissionGuard from '@/modules/employee-pos/components/EmployeePermissionGuard';

export default function OrdersPage() {
  return (
    <EmployeePermissionGuard permissionKey="orders">
      <OrdersDashboard />
    </EmployeePermissionGuard>
  );
}
