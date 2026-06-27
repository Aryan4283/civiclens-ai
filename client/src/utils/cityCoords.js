// Top Indian cities with their map coordinates
export const CITY_COORDS = {
  'Indore':             { lat: 22.7196, lng: 75.8577 },
  'Mumbai':             { lat: 19.0760, lng: 72.8777 },
  'Delhi':              { lat: 28.6139, lng: 77.2090 },
  'New Delhi':          { lat: 28.6139, lng: 77.2090 },
  'Bangalore':          { lat: 12.9716, lng: 77.5946 },
  'Bengaluru':          { lat: 12.9716, lng: 77.5946 },
  'Hyderabad':          { lat: 17.3850, lng: 78.4867 },
  'Chennai':            { lat: 13.0827, lng: 80.2707 },
  'Kolkata':            { lat: 22.5726, lng: 88.3639 },
  'Pune':               { lat: 18.5204, lng: 73.8567 },
  'Ahmedabad':          { lat: 23.0225, lng: 72.5714 },
  'Jaipur':             { lat: 26.9124, lng: 75.7873 },
  'Surat':              { lat: 21.1702, lng: 72.8311 },
  'Lucknow':            { lat: 26.8467, lng: 80.9462 },
  'Nagpur':             { lat: 21.1458, lng: 79.0882 },
  'Bhopal':             { lat: 23.2599, lng: 77.4126 },
  'Patna':              { lat: 25.5941, lng: 85.1376 },
  'Vadodara':           { lat: 22.3072, lng: 73.1812 },
  'Coimbatore':         { lat: 11.0168, lng: 76.9558 },
  'Chandigarh':         { lat: 30.7333, lng: 76.7794 },
  'Guwahati':           { lat: 26.1445, lng: 91.7362 },
  'Jodhpur':            { lat: 26.2389, lng: 73.0243 },
  'Amritsar':           { lat: 31.6340, lng: 74.8723 },
  'Nashik':             { lat: 19.9975, lng: 73.7898 },
  'Kochi':              { lat: 9.9312,  lng: 76.2673 },
  'Varanasi':           { lat: 25.3176, lng: 82.9739 },
  'Gurgaon':            { lat: 28.4595, lng: 77.0266 },
  'Noida':              { lat: 28.5355, lng: 77.3910 },
};

export const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand',
  'Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal',
  'Chandigarh','Delhi','Jammu & Kashmir','Ladakh',
  'Puducherry','Lakshadweep','Dadra & Nagar Haveli','Andaman & Nicobar Islands',
];

export function getCityCoords(cityName) {
  if (!cityName) return null;
  const key = Object.keys(CITY_COORDS).find(
    k => k.toLowerCase() === cityName.toLowerCase().trim()
  );
  return key ? CITY_COORDS[key] : null;
}

export const DEFAULT_CENTER = { lat: 22.7196, lng: 75.8577 };
