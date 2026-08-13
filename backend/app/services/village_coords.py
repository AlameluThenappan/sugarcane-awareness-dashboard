"""
No real GPS columns exist in the DB (survey.farmers / survey.surveys).
This is an approximate village-center lookup, ported from the old
frontend's villageCoordinates.ts, used only to place farmers on the map.
A small deterministic offset is added per survey so points don't
all stack exactly on top of each other.
"""

import hashlib

VILLAGE_COORDS = {
    "Keelvani": (11.551, 77.621),
    "Chennimalai goundan pudhur": (11.168, 77.581),
    "Vembathy": (11.472, 77.530),
    "Punnam": (11.332, 77.683),
    "Oricheri": (11.521, 77.632),
    "Appakudal": (11.503, 77.653),
    "Kallangattu pudhur": (11.231, 77.694),
    "Koothampoondi": (11.545, 77.562),
    "Prakash Nagar": (11.362, 77.721),
    "Nalligoundan pudhur": (11.421, 77.682),
    "Moongilpatti": (11.291, 77.741),
    "Nallampatti": (11.282, 77.611),
    "Kanjikovil": (11.383, 77.616),
    "Pallapalayam": (11.365, 77.633),
    "Koilpalayam": (11.354, 77.641),
    "Pethampalayam": (11.391, 77.581),
    "Nichampalayam": (11.411, 77.601),
    "Kolipalayam": (11.361, 77.671),
    "Periyavilamalai": (11.422, 77.611),
    "Olapalayam": (11.343, 77.591),
    "Singanallur": (11.251, 77.622),
    "Unja Palayam": (11.352, 77.692),
    "Mullampatti": (11.371, 77.601),
    "Kandhampalayam": (11.341, 77.661),
    "Periaveerasangi": (11.451, 77.621),
    "Kanthampalayam": (11.342, 77.663),
}

# Center of the region, used as a fallback when a village isn't in the lookup
_FALLBACK_CENTER = (11.341, 77.717)  # Erode center


def get_coords(village_name: str, seed: int) -> tuple[float, float]:
    """Return an approximate (lat, lng) for a village, jittered slightly
    per-survey (using `seed`, e.g. survey_id) so overlapping farmers in the
    same village don't render as a single dot on the map."""

    base_lat, base_lng = VILLAGE_COORDS.get(
        (village_name or "").strip(), _FALLBACK_CENTER
    )

    # Deterministic small jitter (~0-400m) derived from the seed
    h = hashlib.md5(str(seed).encode()).hexdigest()
    jitter_lat = ((int(h[0:8], 16) % 1000) / 1000 - 0.5) * 0.006
    jitter_lng = ((int(h[8:16], 16) % 1000) / 1000 - 0.5) * 0.006

    return round(base_lat + jitter_lat, 6), round(base_lng + jitter_lng, 6)