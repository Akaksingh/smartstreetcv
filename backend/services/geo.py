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


def extract_gps_coordinates(image_bytes: bytes) -> tuple[Optional[float], Optional[float]]:
    import io
    from PIL import Image
    from PIL.ExifTags import TAGS, GPSTAGS

    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            exif = img.getexif()
            if not exif:
                return None, None

            gps_info = None
            for tag_id, value in exif.items():
                tag_name = TAGS.get(tag_id, tag_id)
                if tag_name == "GPSInfo":
                    gps_info = exif.get_ifd(tag_id)
                    break

            if not gps_info:
                return None, None

            readable_gps = {GPSTAGS.get(k, k): v for k, v in gps_info.items()}

            def _to_degrees(value):
                if not value or len(value) < 3:
                    return 0.0
                d = float(value[0])
                m = float(value[1])
                s = float(value[2])
                return d + (m / 60.0) + (s / 3600.0)

            lat_ref = readable_gps.get("GPSLatitudeRef")
            lat = readable_gps.get("GPSLatitude")
            lon_ref = readable_gps.get("GPSLongitudeRef")
            lon = readable_gps.get("GPSLongitude")

            if lat and lat_ref and lon and lon_ref:
                latitude = _to_degrees(lat)
                if lat_ref != "N":
                    latitude = -latitude

                longitude = _to_degrees(lon)
                if lon_ref != "E":
                    longitude = -longitude

                return latitude, longitude
    except Exception:
        pass
    return None, None
