'use client';

import React from 'react';
import CustomersDashboard from '@/modules/employee-pos/components/CustomersDashboard';
import EmployeePermissionGuard from '@/modules/employee-pos/components/EmployeePermissionGuard';

export default function CustomersPage() {
  return (
    <EmployeePermissionGuard permissionKey="customers">
      <CustomersDashboard />
    </EmployeePermissionGuard>
  );
}
