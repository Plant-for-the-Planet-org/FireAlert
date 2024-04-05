const slices = {
  '10': {
    name: 'Slice 10',
    bbox: '-180,-90,180,-30',
    coordinates: [
      [-180, -90],
      [180, -90],
      [180, -30],
      [-180, -30],
      [-180, -90]
    ],
    description: 'Covers the Southernmost regions of the world including the majority of Antarctica and parts of Southern South America.',
  },
  '21': {
    name: 'Slice 21',
    bbox: '-180,-30,-60,-15',
    coordinates: [
      [-180, -30],
      [-60, -30],
      [-60, -15],
      [-180, -15],
      [-180, -30]
    ],
    description: 'Covers left part of mid-lower South America.',
  },
  '22': {
    name: 'Slice 22',
    bbox: '-60,-30,30,-15',
    coordinates: [
      [-60, -30],
      [30, -30],
      [30, -15],
      [-60, -15],
      [-60, -30]
    ],
    description: 'Covers right part of mid-lower South America, and left part of Lower Africa.',
  },
  '23': {
    name: 'Slice 23',
    bbox: '30,-30,180,-15',
    coordinates: [
      [30, -30],
      [180, -30],
      [180, -15],
      [30, -15],
      [30, -30]
    ],
    description: 'Covers right part of Lower Africa, and upper part of Australia.',
  },
  '31': {
    name: 'Slice 31',
    bbox: '-180,-15,-60,0',
    coordinates: [
      [-180, -15],
      [-60, -15],
      [-60, 0],
      [-180, 0],
      [-180, -15]
    ],
    description: 'Covers left part of Mid-upper South America.',
  },
  '32': {
    name: 'Slice 32',
    bbox: '-60,-15,30,0',
    coordinates: [
      [-60, -15],
      [30, -15],
      [30, 0],
      [-60, 0],
      [-60, -15]
    ],
    description: 'Covers right part of Mid-upper South America, and left part of lower-mid Africa.',
  },
  '33': {
    name: 'Slice 33',
    bbox: '30,-15,180,0',
    coordinates: [
      [30, -15],
      [180, -15],
      [180, 0],
      [30, 0],
      [30, -15]
    ],
    description: 'Covers right part of lower-mid Africa, and Papua New Guinea and parts of Indonesia.',
  },
  '41': {
    name: 'Slice 41',
    bbox: '-180,0,-60,15',
    coordinates: [
      [-180, 0],
      [-60, 0],
      [-60, 15],
      [-180, 15],
      [-180, 0]
    ],
    description: 'Covers left part of Upper South America.',
  },
  '42': {
    name: 'Slice 42',
    bbox: '-60,0,30,15',
    coordinates: [
      [-60, 0],
      [30, 0],
      [30, 15],
      [-60, 15],
      [-60, 0]
    ],
    description: 'Covers right part of Upper South America and left part of Upper-mid Africa.',
  },
  '43': {
    name: 'Slice 43',
    bbox: '30,0,180,15',
    coordinates: [
      [30, 0],
      [180, 0],
      [180, 15],
      [30, 15],
      [30, 0]
    ],
    description: 'Covers right part of Upper-mid Africa, and Lower South Asia.',
  },
  '51': {
    name: 'Slice 51',
    bbox: '-180,15,-60,30',
    coordinates: [
      [-180, 15],
      [-60, 15],
      [-60, 30],
      [-180, 30],
      [-180, 15]
    ],
    description: 'Covers Lower North America, containing Mexico and Cuba.',
  },
  '52': {
    name: 'Slice 52',
    bbox: '-60,15,30,30',
    coordinates: [
      [-60, 15],
      [30, 15],
      [30, 30],
      [-60, 30],
      [-60, 15]
    ],
    description: 'Covers left part of Upper Africa.',
  },
  '53': {
    name: 'Slice 53',
    bbox: '30,15,180,30',
    coordinates: [
      [30, 15],
      [180, 15],
      [180, 30],
      [30, 30],
      [30, 15]
    ],
    description: 'Covers right part of Upper Africa, lower part of Middle East, and Upper South Asia.',
  },
  '61': {
    name: 'Slice 61',
    bbox: '-180,30,-60,45',
    coordinates: [
      [-180, 30],
      [-60, 30],
      [-60, 45],
      [-180, 45],
      [-180, 30]
    ],
    description: 'Covers Mid North America, covering most of the United States.',
  },
  '62': {
    name: 'Slice 62',
    bbox: '-60,30,30,45',
    coordinates: [
      [-60, 30],
      [30, 30],
      [30, 45],
      [-60, 45],
      [-60, 30]
    ],
    description: 'Covers lower western Europe.',
  },
  '63': {
    name: 'Slice 63',
    bbox: '30,30,180,45',
    coordinates: [
      [30, 30],
      [180, 30],
      [180, 45],
      [30, 45],
      [30, 30]
    ],
    description: 'Covers upper part of Middle East, and Middle Asia.',
  },
  '70': {
    name: 'Slice 70',
    bbox: '-180,45,180,60',
    coordinates: [
      [-180, 45],
      [180, 45],
      [180, 60],
      [-180, 60],
      [-180, 45]
    ],
    description: 'Covers Northern parts of United States, Europe, Asia, and the majority of Russia.',
  },
  '80': {
    name: 'Slice 80',
    bbox: '-180,60,180,90',
    coordinates: [
      [-180, 60],
      [180, 60],
      [180, 90],
      [-180, 90],
      [-180, 60]
    ],
    description: 'Covers the Northernmost regions of the world including Greenland, Arctic Ocean, and Northern Russia.',
  },
};

export default slices;
