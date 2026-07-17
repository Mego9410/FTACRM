/**
 * Named UK region → counties/areas mapping, used when a buyer's search area is
 * a whole region rather than a point+radius. Matched case-insensitively
 * against a practice's county (fallback: town). Admin-extendable later if
 * needed; kept as data so tests pin the behaviour.
 */
export const REGION_COUNTIES: Record<string, string[]> = {
  "North East": ["Tyne and Wear", "Durham", "County Durham", "Northumberland", "Teesside", "Cleveland"],
  "North West": ["Greater Manchester", "Lancashire", "Merseyside", "Cheshire", "Cumbria"],
  "Yorkshire and the Humber": [
    "West Yorkshire",
    "South Yorkshire",
    "North Yorkshire",
    "East Riding of Yorkshire",
    "Yorkshire",
    "Lincolnshire",
  ],
  "East Midlands": ["Derbyshire", "Nottinghamshire", "Leicestershire", "Northamptonshire", "Rutland", "Lincolnshire"],
  "West Midlands": ["West Midlands", "Warwickshire", "Staffordshire", "Shropshire", "Worcestershire", "Herefordshire"],
  "East of England": ["Essex", "Hertfordshire", "Bedfordshire", "Cambridgeshire", "Norfolk", "Suffolk"],
  London: ["London", "Greater London"],
  "South East": [
    "Kent",
    "Surrey",
    "East Sussex",
    "West Sussex",
    "Hampshire",
    "Berkshire",
    "Buckinghamshire",
    "Oxfordshire",
    "Isle of Wight",
  ],
  "South West": [
    "Gloucestershire",
    "Wiltshire",
    "Somerset",
    "Dorset",
    "Devon",
    "Cornwall",
    "Bristol",
    "Bath and North East Somerset",
  ],
  Wales: [
    "Cardiff",
    "Swansea",
    "Gwynedd",
    "Powys",
    "Clwyd",
    "Dyfed",
    "Gwent",
    "Glamorgan",
    "South Glamorgan",
    "West Glamorgan",
    "Mid Glamorgan",
    "Wales",
  ],
};

export function regionMatchesCounty(region: string, county: string | null, town: string | null): boolean {
  const counties = REGION_COUNTIES[region];
  if (!counties) return false;
  const target = (county ?? town ?? "").trim().toLowerCase();
  if (!target) return false;
  return counties.some((c) => target.includes(c.toLowerCase()) || c.toLowerCase().includes(target));
}
