// Curated common flowers for the Flowers game. Resolved on iNaturalist (Plantae
// only). Many common names map to a genus; that's fine for a "name the flower" game.
export const FLOWERS = [
  'Rose', 'Tulip', 'Sunflower', 'Common Daisy', 'Daffodil', 'Lavender', 'Marigold',
  'Common Poppy', 'Sacred Lotus', 'Dandelion', 'Hibiscus', 'Bearded Iris', 'Peony',
  'Carnation', 'Chrysanthemum', 'Southern Magnolia', 'Lilac', 'Jasmine', 'Bluebell',
  'Foxglove', 'Snapdragon', 'Petunia', 'Begonia', 'Geranium', 'Hydrangea', 'Camellia',
  'Azalea', 'Buttercup', 'Forget-me-not', 'Pansy', 'Sweet Violet', 'Crocus', 'Hyacinth',
  'Anemone', 'Zinnia', 'Cosmos', 'Dahlia', 'Gardenia', 'Wisteria', 'Bougainvillea',
  'Bird-of-paradise', 'King Protea', 'Edelweiss', 'Water Lily', 'Columbine', 'Lupine',
  'Delphinium', 'Gladiolus', 'Freesia', 'Persian Buttercup', 'Calla Lily', 'Tiger Lily',
  'Morning Glory', 'Sweet Pea', 'Nasturtium', 'Primrose', 'Cyclamen', 'Common Heather',
  'Red Clover', 'Snowdrop', 'Daylily', 'Black-eyed Susan', 'Purple Coneflower',
  'Lily of the Valley', 'Pasqueflower', "Baby's Breath", 'Yarrow', 'Goldenrod',
  'Marsh Marigold', 'Amaryllis', 'Fuchsia', 'Hollyhock', 'Phlox', 'Verbena',
  'Coreopsis', 'Anthurium', 'Frangipani', 'Passionflower', 'Honeysuckle', 'Oleander',
  'Rhododendron', 'Apple Blossom', 'Lotus', 'Aster', 'Crape Myrtle', 'Tickseed',
  'Bleeding Heart', 'Cherry Blossom', 'Lantana', 'Periwinkle',
];

// Common name → scientific (genus is ideal for a "name the flower" game), for the
// many that resolve to a too-broad order/class or the wrong genus on a bare query.
export const FLOWER_OVERRIDES = {
  Rose: 'Rosa', Tulip: 'Tulipa', Sunflower: 'Helianthus', Peony: 'Paeonia',
  Hibiscus: 'Hibiscus', Aster: 'Aster', Buttercup: 'Ranunculus', Carnation: 'Dianthus',
  Begonia: 'Begonia', Camellia: 'Camellia', Azalea: 'Rhododendron', Gardenia: 'Gardenia',
  Geranium: 'Pelargonium', Hydrangea: 'Hydrangea', Petunia: 'Petunia', Phlox: 'Phlox',
  Verbena: 'Verbena', 'Forget-me-not': 'Myosotis', 'Morning Glory': 'Ipomoea',
  Passionflower: 'Passiflora', Honeysuckle: 'Lonicera', Primrose: 'Primula',
  'Water Lily': 'Nymphaea', Marigold: 'Tagetes', Zinnia: 'Zinnia', Dahlia: 'Dahlia',
  Cosmos: 'Cosmos', Snapdragon: 'Antirrhinum', Pansy: 'Viola', Foxglove: 'Digitalis',
  Lavender: 'Lavandula', Jasmine: 'Jasminum', Lilac: 'Syringa', Wisteria: 'Wisteria',
  Anemone: 'Anemone', Crocus: 'Crocus', Hyacinth: 'Hyacinthus', Daffodil: 'Narcissus',
  Iris: 'Iris', 'Bearded Iris': 'Iris', Poppy: 'Papaver', 'Common Poppy': 'Papaver',
  Lupine: 'Lupinus', Columbine: 'Aquilegia', Delphinium: 'Delphinium', Gladiolus: 'Gladiolus',
  Freesia: 'Freesia', 'Calla Lily': 'Zantedeschia', 'Tiger Lily': 'Lilium',
  Daylily: 'Hemerocallis', Amaryllis: 'Hippeastrum', Fuchsia: 'Fuchsia', Hollyhock: 'Alcea',
  Coreopsis: 'Coreopsis', Anthurium: 'Anthurium', Frangipani: 'Plumeria', Oleander: 'Nerium',
  Rhododendron: 'Rhododendron', 'Sweet Pea': 'Lathyrus', Nasturtium: 'Tropaeolum',
  Cyclamen: 'Cyclamen', Goldenrod: 'Solidago', Yarrow: 'Achillea', Lantana: 'Lantana',
  Periwinkle: 'Vinca', 'Crape Myrtle': 'Lagerstroemia', 'Bleeding Heart': 'Lamprocapnos',
  'Cherry Blossom': 'Prunus serrulata', 'Bird-of-paradise': 'Strelitzia reginae',
  'Lotus': 'Nelumbo nucifera', 'Apple Blossom': 'Malus domestica',
  'Black-eyed Susan': 'Rudbeckia', 'Purple Coneflower': 'Echinacea',
  'Lily of the Valley': 'Convallaria majalis', 'Marsh Marigold': 'Caltha palustris',
  Bougainvillea: 'Bougainvillea', Begonia2: 'Begonia',
};
