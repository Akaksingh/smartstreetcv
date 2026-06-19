from __future__ import annotations

from typing import Optional

import requests

from config import settings

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"


def lookup_ward_name(latitude: Optional[float], longitude: Optional[float]) -> Optional[str]:
    if latitude is None or longitude is None:
        return None

    headers = {
        "User-Agent": "NagarAI/1.0 (local civic issue backend)",
        "Accept-Language": "en",
    }
    params = {
        "lat": latitude,
        "lon": longitude,
        "format": "jsonv2",
        "addressdetails": 1,
    }

    try:
        response = requests.get(
            NOMINATIM_URL,
            params=params,
            headers=headers,
            timeout=settings.nominatim_timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException:
        return None
    except ValueError:
        return None

    address = payload.get("address", {}) if isinstance(payload, dict) else {}
    for key in ("suburb", "neighbourhood", "neighborhood", "city_district", "borough", "district", "county", "municipality", "town", "village"):
        value = address.get(key)
        if value:
            return str(value)

    return payload.get("name") if isinstance(payload, dict) else None
