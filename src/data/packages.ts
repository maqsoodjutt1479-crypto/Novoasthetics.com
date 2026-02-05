export type PackageDefinition = {
  name: string;
  services: string[];
  price: string;
  duration: string;
  active: boolean;
};

export const packages: PackageDefinition[] = [
  {
    name: 'Glow-up',
    services: ['Laser Face x4', 'PRP x2', 'Serum kit'],
    price: 'PKR 42,000',
    duration: '6 weeks',
    active: true,
  },
  {
    name: 'Hair Strength Bundle',
    services: ['PRP x6', 'Hair care kit', 'Doctor follow-ups'],
    price: 'PKR 68,000',
    duration: '12 weeks',
    active: true,
  },
  {
    name: 'Post-Transplant Care',
    services: ['Laser booster x4', 'Medications', 'Follow-up consults'],
    price: 'PKR 85,000',
    duration: '10 weeks',
    active: false,
  },
];
