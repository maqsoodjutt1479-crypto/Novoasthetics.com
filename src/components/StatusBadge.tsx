import React from 'react';
import clsx from 'clsx';

type Status =
  | 'Pending'
  | 'Coming Soon'
  | 'Arrived'
  | 'Delayed'
  | 'Confirmed'
  | 'Cancelled'
  | 'Paid'
  | 'Partial'
  | 'Unpaid'
  | 'Active'
  | 'Inactive';

type StatusBadgeProps = {
  status: Status;
};

const tone: Record<Status, string> = {
  Pending: 'muted',
  'Coming Soon': 'info',
  Arrived: 'success',
  Delayed: 'warning',
  Confirmed: 'primary',
  Cancelled: 'danger',
  Paid: 'success',
  Partial: 'warning',
  Unpaid: 'danger',
  Active: 'primary',
  Inactive: 'muted',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => (
  <span className={clsx('badge', `badge--${tone[status]}`)}>{status}</span>
);
