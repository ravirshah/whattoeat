'use client';

import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Switch } from '@/components/ui/switch';
import * as React from 'react';

export function DarkModeToggle() {
  const [dark, setDark] = React.useState(false);

  const toggle = (checked: boolean) => {
    setDark(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Switch id="dark-toggle" checked={dark} onCheckedChange={toggle} />
      <Label htmlFor="dark-toggle">Dark mode</Label>
    </div>
  );
}

export function SegmentedControlDemo() {
  type Goal = 'cut' | 'maintain' | 'bulk';
  const [goal, setGoal] = React.useState<Goal>('maintain');
  return (
    <div className="flex flex-col gap-2">
      <Label>Goal (SegmentedControl)</Label>
      <SegmentedControl
        options={[
          { label: 'Cut', value: 'cut' as Goal },
          { label: 'Maintain', value: 'maintain' as Goal },
          { label: 'Bulk', value: 'bulk' as Goal },
        ]}
        value={goal}
        onChange={setGoal}
      />
      <p className="text-xs text-text-muted">Selected: {goal}</p>
    </div>
  );
}
