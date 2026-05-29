import { Badge } from '@/components/ui/badge';
import { TripStatus } from '@/types/trip';

const statusVariant: Record<TripStatus, 'default' | 'success' | 'warning' | 'secondary' | 'danger'> = {
  planned: 'secondary',
  ongoing: 'default',
  completed: 'success',
  cancelled: 'danger',
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  return (
    <Badge variant={statusVariant[status]} className="capitalize">
      {status}
    </Badge>
  );
}
