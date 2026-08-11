export interface LocationItem {
  name: string;
  category: 'Hyderabad & Nearby' | 'Other Common Locations';
}

export const PREDEFINED_LOCATIONS: LocationItem[] = [
  // HYDERABAD / NEARBY
  { name: 'Ameenpur', category: 'Hyderabad & Nearby' },
  { name: 'Beeramguda', category: 'Hyderabad & Nearby' },
  { name: 'BHEL', category: 'Hyderabad & Nearby' },
  { name: 'Bachupally', category: 'Hyderabad & Nearby' },
  { name: 'Bollaram', category: 'Hyderabad & Nearby' },
  { name: 'Chandanagar', category: 'Hyderabad & Nearby' },
  { name: 'Gajularamaram', category: 'Hyderabad & Nearby' },
  { name: 'Hafeezpet', category: 'Hyderabad & Nearby' },
  { name: 'Hyder Nagar', category: 'Hyderabad & Nearby' },
  { name: 'JNTU', category: 'Hyderabad & Nearby' },
  { name: 'Kukatpally', category: 'Hyderabad & Nearby' },
  { name: 'Lingampally', category: 'Hyderabad & Nearby' },
  { name: 'Miyapur', category: 'Hyderabad & Nearby' },
  { name: 'Madeenaguda', category: 'Hyderabad & Nearby' },
  { name: 'Nizampet', category: 'Hyderabad & Nearby' },
  { name: 'Patancheru', category: 'Hyderabad & Nearby' },
  { name: 'Pragathi Nagar', category: 'Hyderabad & Nearby' },
  { name: 'Ramachandrapuram', category: 'Hyderabad & Nearby' },
  { name: 'Tellapur', category: 'Hyderabad & Nearby' },
  { name: 'Serilingampally', category: 'Hyderabad & Nearby' },
  { name: 'Madhapur', category: 'Hyderabad & Nearby' },
  { name: 'Gachibowli', category: 'Hyderabad & Nearby' },
  { name: 'ECIL', category: 'Hyderabad & Nearby' },
  { name: 'Uppal', category: 'Hyderabad & Nearby' },

  // OTHER COMMON LOCATIONS
  { name: 'Guntur', category: 'Other Common Locations' },
  { name: 'Vijayawada', category: 'Other Common Locations' },
  { name: 'Chilakaluripeta', category: 'Other Common Locations' },
  { name: 'Bangalore', category: 'Other Common Locations' },
  { name: 'Chennai', category: 'Other Common Locations' },
];

export const LOCATION_NAMES: string[] = PREDEFINED_LOCATIONS.map((loc) => loc.name);
