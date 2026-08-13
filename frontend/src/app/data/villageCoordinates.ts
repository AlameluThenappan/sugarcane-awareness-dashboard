export interface VillageCoord {
  name: string;
  lat: number;
  lng: number;
  count: number;
  block: string;
}

// Erode Center: 11.3410, 77.7172
// Approximate coordinates for the villages in the Erode region.
export const villageCoordinates: VillageCoord[] = [
  { name: "Keelvani", lat: 11.551, lng: 77.621, count: 23, block: "Sakthinagar" },
  { name: "Chennimalai goundan pudhur", lat: 11.168, lng: 77.581, count: 9, block: "Erode" },
  { name: "Vembathy", lat: 11.472, lng: 77.530, count: 34, block: "Sakthinagar" },
  { name: "Punnam", lat: 11.332, lng: 77.683, count: 13, block: "Vellalapalayam" },
  { name: "Oricheri", lat: 11.521, lng: 77.632, count: 50, block: "Sakthinagar" },
  { name: "Appakudal", lat: 11.503, lng: 77.653, count: 23, block: "Sakthinagar" },
  { name: "Kallangattu pudhur", lat: 11.231, lng: 77.694, count: 1, block: "Erode" },
  { name: "Koothampoondi", lat: 11.545, lng: 77.562, count: 20, block: "Sakthinagar" },
  { name: "Prakash Nagar", lat: 11.362, lng: 77.721, count: 2, block: "Erode" },
  { name: "Nalligoundan pudhur", lat: 11.421, lng: 77.682, count: 2, block: "Vellalapalayam" },
  { name: "Moongilpatti", lat: 11.291, lng: 77.741, count: 30, block: "Erode" },
  { name: "Nallampatti", lat: 11.282, lng: 77.611, count: 47, block: "Kanjikovil" },
  { name: "Kanjikovil", lat: 11.383, lng: 77.616, count: 88, block: "Kanjikovil" },
  { name: "Pallapalayam", lat: 11.365, lng: 77.633, count: 24, block: "Kanjikovil" },
  { name: "Koilpalayam", lat: 11.354, lng: 77.641, count: 3, block: "Kanjikovil" },
  { name: "Pethampalayam", lat: 11.391, lng: 77.581, count: 15, block: "Kanjikovil" },
  { name: "Nichampalayam", lat: 11.411, lng: 77.601, count: 2, block: "Kanjikovil" },
  { name: "Kolipalayam", lat: 11.361, lng: 77.671, count: 1, block: "Erode" },
  { name: "Periyavilamalai", lat: 11.422, lng: 77.611, count: 5, block: "Kanjikovil" },
  { name: "Olapalayam", lat: 11.343, lng: 77.591, count: 2, block: "Kanjikovil" },
  { name: "Singanallur", lat: 11.251, lng: 77.622, count: 6, block: "Erode" },
  { name: "Unja Palayam", lat: 11.352, lng: 77.692, count: 1, block: "Erode" },
  { name: "Mullampatti", lat: 11.371, lng: 77.601, count: 10, block: "Kanjikovil" },
  { name: "Kandhampalayam", lat: 11.341, lng: 77.661, count: 1, block: "Vellalapalayam" },
  { name: "Periaveerasangi", lat: 11.451, lng: 77.621, count: 1, block: "Sakthinagar" },
  { name: "Kanthampalayam", lat: 11.342, lng: 77.663, count: 1, block: "Vellalapalayam" }
];
