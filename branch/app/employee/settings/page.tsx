'use client';

import SettingsDashboard from '@/modules/employee-pos/components/SettingsDashboard';
import React from 'react';
import EmployeePermissionGuard from '@/modules/employee-pos/components/EmployeePermissionGuard';

export default function SettingsPage() {
  return (
    <EmployeePermissionGuard permissionKey="setting">
      <SettingsDashboard />
    </EmployeePermissionGuard>
  );
}
