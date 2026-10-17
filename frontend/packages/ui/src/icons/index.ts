/**
 * The design system's icon set (lucide). Import icons from `@frontend/ui`, not `lucide-react`,
 * so the whole repo shares one icon source and one naming scheme.
 */
export type { LucideIcon as Icon, LucideProps as IconProps } from 'lucide-react';
export {
  ChartColumn as ChartColumnIcon,
  Check as CheckIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CircleAlert as CircleAlertIcon,
  Download as DownloadIcon,
  LoaderCircle as SpinnerIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  X as CloseIcon,
} from 'lucide-react';
