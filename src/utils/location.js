export function getLocationLabel(entry) {
  if (entry?.placeName) {
    return entry.placeName;
  }

  return 'Barrio o localidad no disponible';
}

export function buildPlaceName(address) {
  const neighborhood = address.district || address.subregion || address.name;
  const locality = address.city || address.region;
  const country = address.country;

  return [neighborhood, locality, country].filter(Boolean).join(', ');
}
