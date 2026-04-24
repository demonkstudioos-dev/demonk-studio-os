import { format, formatDistanceToNow } from 'date-fns';

export const formatCurrency = (amount: number, currency: string = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: string | Date) => {
  return format(new Date(date), 'MMM d, yyyy');
};

export const formatRelativeDate = (date: string | Date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};
