import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

const withDefaults = (props: IconProps) => ({
  viewBox: '0 0 24 24',
  width: 16,
  height: 16,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export const BellIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
    <path d="M10 17a2 2 0 0 0 4 0" />
  </svg>
);

export const MoonIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
  </svg>
);

export const SunIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
  </svg>
);

export const SendIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="m22 2-7 20-4-9-9-4 20-7Z" />
    <path d="M22 2 11 13" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="m5 12 4 4L19 6" />
  </svg>
);

export const PrintIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="M7 8V3h10v5" />
    <path d="M6 17H4a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-2" />
    <path d="M7 14h10v7H7z" />
  </svg>
);

export const EditIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const FilterXIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />
    <path d="m16 7 4 4M20 7l-4 4" />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);

export const XIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const PowerIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="M12 2v10" />
    <path d="M8.5 4.5A8 8 0 1 0 15.5 4.5" />
  </svg>
);

export const RefreshIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="M21 12a9 9 0 0 0-15.5-6.4L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 15.5 6.4L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

export const MenuIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const PlusIcon: React.FC<IconProps> = (props) => (
  <svg {...withDefaults(props)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
