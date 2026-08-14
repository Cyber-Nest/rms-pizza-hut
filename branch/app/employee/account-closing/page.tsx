'use client';

import React from 'react';
import AccountClosingView from '@/modules/employee-pos/components/AccountClosingView';
import EmployeePermissionGuard from '@/modules/employee-pos/components/EmployeePermissionGuard';

export default function AccountClosingPage() {
  return (
    <EmployeePermissionGuard permissionKey="account_closing">
      <AccountClosingView />
    </EmployeePermissionGuard>
  );
}
