from typing import Optional
REGIONS = [
    "Adamawa",
    "Centre",
    "East",
    "Far North",
    "Littoral",
    "North",
    "North West",
    "South",
    "South West",
    "West",
]

CITY_TO_REGION: dict[str, str] = {
    # Adamawa
    "ngaoundere": "Adamawa", "ngaoundéré": "Adamawa",
    "meiganga": "Adamawa", "tibati": "Adamawa",
    "banyo": "Adamawa", "tignere": "Adamawa", "tignère": "Adamawa",

    # Centre
    "yaounde": "Centre", "yaoundé": "Centre", "yaounde i": "Centre",
    "obala": "Centre", "monatele": "Centre", "monatelé": "Centre",
    "mbalmayo": "Centre", "eseka": "Centre", "eséka": "Centre",
    "ngoumou": "Centre", "akonolinga": "Centre", "bafia": "Centre",
    "nanga eboko": "Centre", "mfou": "Centre",

    # East
    "bertoua": "East", "batouri": "East", "abong mbang": "East",
    "yokadouma": "East", "belabo": "East", "djoum": "East",
    "lomie": "East", "lomié": "East",

    # Far North
    "maroua": "Far North", "kousseri": "Far North", "kousséri": "Far North",
    "mora": "Far North", "mokolo": "Far North", "yagoua": "Far North",
    "kaele": "Far North", "kaélé": "Far North", "waza": "Far North",
    "kolofata": "Far North",

    # Littoral
    "douala": "Littoral", "nkongsamba": "Littoral", "edea": "Littoral",
    "edéa": "Littoral", "loum": "Littoral", "mbanga": "Littoral",
    "manjo": "Littoral", "melong": "Littoral", "yabassi": "Littoral",
    "ndom": "Littoral",

    # North
    "garoua": "North", "ngong": "North", "guider": "North",
    "pitoa": "North", "lagdo": "North", "figuil": "North",
    "poli": "North", "touboro": "North",

    # North West
    "bamenda": "North West", "kumbo": "North West", "wum": "North West",
    "nkambe": "North West", "ndop": "North West", "fundong": "North West",
    "mbengwi": "North West", "batibo": "North West", "bafut": "North West",
    "santa": "North West", "tubah": "North West", "bali": "North West",

    # South
    "ebolowa": "South", "kribi": "South", "sangmelima": "South",
    "sangmélima": "South", "ambam": "South", "lolodorf": "South",
    "mvangane": "South", "ma'an": "South", "campo": "South",

    # South West
    "buea": "South West", "limbe": "South West", "kumba": "South West",
    "mamfe": "South West", "mundemba": "South West", "tiko": "South West",
    "idenau": "South West", "muyuka": "South West", "tombel": "South West",
    "ekondo titi": "South West", "meanja": "South West",
    "molyko": "South West",    # Buea neighbourhood
    "great soppo": "South West", "mile 16": "South West",
    "mile 17": "South West", "bonaberi": "Littoral",

    # West
    "bafoussam": "West", "dschang": "West", "bafang": "West",
    "foumban": "West", "foumbot": "West", "mbouda": "West",
    "bangangte": "West", "banganté": "West", "nkongsamba": "Littoral",
    "baham": "West", "bamendjou": "West", "kekem": "West",
    "santchou": "West", "bandja": "West",
}


def normalize_to_region(location: str) -> Optional[str]:

    if not location:
        return None

    loc_lower = location.lower().strip()

    # Check if the string already contains a region name
    for region in REGIONS:
        if region.lower() in loc_lower:
            return region

    # Check each token against the city map
    tokens = loc_lower.replace(",", " ").replace("-", " ").split()
    for token in tokens:
        if token in CITY_TO_REGION:
            return CITY_TO_REGION[token]

    # Try multi-word city names (e.g. "far north", "abong mbang")
    for city, region in CITY_TO_REGION.items():
        if city in loc_lower:
            return region

    return None


def location_match_score(user_location: str, item_location: str) -> tuple[float, str]:
  
    if not user_location or not item_location:
        return 0.0, "Explore"

    user_region = normalize_to_region(user_location)
    item_region = normalize_to_region(item_location)

    if not user_region or not item_region:
        # Fallback to token matching for unrecognised locations
        user_tokens = set(user_location.lower().replace(",", " ").split())
        item_tokens = set(item_location.lower().replace(",", " ").split())
        overlap     = user_tokens & item_tokens
        if overlap:
            return 0.5, "Your Region"
        return 0.0, "Explore"

    if user_region != item_region:
        return 0.0, "Explore"

    # Same region — check if same city for bonus
    user_lower = user_location.lower()
    item_lower = item_location.lower()

    # Check city-level overlap
    for city in CITY_TO_REGION:
        if city in user_lower and city in item_lower:
            return 1.0, "Nearby"   # exact city match within same region

    return 0.7, "Your Region"   # same region, different city