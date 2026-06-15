// Curated dog-breed facts (TheDogAPI now needs a key). We infer the breed Group
// by keyword and provide an Origin country for well-known breeds. These power the
// progressive hints in the Dog Breeds game. Group varies a little by kennel club;
// it's a "fun hint", not gospel.

const GROUP_RULES = [
  [/terrier|airedale|cairn|bedlington|sealyham|dandie|wheaten|kerryblue|patterdale/, 'Terrier'],
  [/retriever|spaniel|setter|pointer|vizsla|weimaraner|brittany|cocker|clumber|sussex|springer|waterdog/, 'Sporting'],
  [/hound|beagle|basenji|dachshund|borzoi|saluki|whippet|greyhound|ridgeback|elkhound|coonhound|otterhound|deerhound|wolfhound|redbone|bluetick|plott|walker|segugio|ibizan|afghan|basset|dhole/, 'Hound'],
  [/shepherd|collie|sheepdog|cattledog|corgi|cardigan|pembroke|kelpie|malinois|groenendael|tervuren|briard|bouvier|buhund|shetland|appenzeller|entlebucher|lapphund/, 'Herding'],
  [/mastiff|boxer|rottweiler|doberman|husky|malamute|samoyed|akita|bernese|leonberg|newfoundland|pyrenees|bernard|swiss|great dane|caucasian|ovcharka|komondor|kuvasz|schnauzer|eskimo/, 'Working'],
  [/chihuahua|\bpug\b|pomeranian|maltese|papillon|pekinese|shihtzu|havanese|affenpinscher|brabancon|pinscher|silky|yorkshire|italian greyhound|\btoy\b|cavapoo|cavalier|blenheim/, 'Toy'],
  [/poodle|dalmatian|\bchow\b|lhasa|shiba|keeshond|bichon|bulldog|schipperke|coton|shar|spitz/, 'Non-Sporting'],
];

const ORIGINS = [
  [/afghan/, 'Afghanistan'], [/akita|shiba|japanese|tosa/, 'Japan'], [/basenji/, 'Central Africa'],
  [/bernese|appenzeller|entlebucher|swiss|bouvier|saint ?bernard|stbernard/, 'Switzerland'],
  [/bulldog|beagle|bull ?mastiff|english|airedale|jack russell|russell|fox terrier|staffordshire|yorkshire|welsh|border|bedlington|otterhound|pointer|collie/, 'United Kingdom'],
  [/chihuahua|mexicanhairless/, 'Mexico'], [/chow|shar|pekinese|shihtzu|lhasa|tibetan/, 'China / Tibet'],
  [/dachshund|doberman|schnauzer|rottweiler|weimaraner|german|leonberg|pomeranian|boxer|affenpinscher/, 'Germany'],
  [/dalmatian/, 'Croatia'], [/papillon|brittany|briard|pyrenees|malinois|groenendael|tervuren/, 'France / Belgium'],
  [/husky|malamute|eskimo|samoyed/, 'Arctic / Siberia'], [/borzoi|caucasian|ovcharka|russian/, 'Russia'],
  [/labrador|newfoundland/, 'Canada'], [/maltese|segugio|italian|cane|spinone|bolognese/, 'Italy'],
  [/komondor|kuvasz|vizsla/, 'Hungary'], [/poodle/, 'Germany / France'],
  [/ridgeback|boerboel/, 'South Africa'], [/saluki/, 'Middle East'],
  [/buhund|elkhound|norwegian/, 'Norway'], [/lapphund|spitz|finnish/, 'Finland'],
  [/australian|kelpie|cattledog/, 'Australia'], [/havanese/, 'Cuba'], [/cotondetulear|coton/, 'Madagascar'],
  [/portuguese|spanish waterdog|ibizan|andalusian/, 'Iberia'], [/keeshond|schipperke|dutch/, 'Netherlands / Belgium'],
];

const norm = (s) => s.toLowerCase();

export function dogGroup(name) {
  const n = norm(name);
  for (const [re, g] of GROUP_RULES) if (re.test(n)) return g;
  return null;
}
export function dogOrigin(name) {
  const n = norm(name);
  for (const [re, o] of ORIGINS) if (re.test(n)) return o;
  return null;
}

/** Build the facts + hintOrder object for a breed (used by build-media & enrich). */
export function dogFacts(name) {
  const facts = {};
  const g = dogGroup(name);
  const o = dogOrigin(name);
  if (g) facts.Group = g;
  if (o) facts.Origin = o;
  const hintOrder = [];
  if (g) hintOrder.push('Group');
  if (o) hintOrder.push('Origin');
  return { facts, hintOrder };
}
