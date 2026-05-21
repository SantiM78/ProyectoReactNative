export function getLocationLabel(entry) {
  // Si tenemos barrio/localidad, mostramos eso; si no, dejamos un mensaje claro.
  if (entry?.placeName) {
    return entry.placeName;
  }

  return 'Barrio o localidad no disponible';
}

export function buildPlaceName(address) {
  // Armamos un nombre entendible con lo que nos entregue el celular.
  const neighborhood = address.district || address.subregion || address.name;
  const locality = address.city || address.region;
  const country = address.country;

  return [neighborhood, locality, country].filter(Boolean).join(', ');
}
