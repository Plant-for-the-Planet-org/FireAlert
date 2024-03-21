const slices = {
  '10': {
    name: 'Slice 10',
    bbox: '-180,-90,180,-30',
    coordinates: [
      [
        [-180, -90],
        [180, -90],
        [180, -30],
        [-180, -30],
        [-180, -90],
      ],
    ],
    description: 'Covers the Southernmost regions of the world including the majority of Antarctica and parts of Southern South America.',
  },
  '21': {
    name: 'Slice 21',
    bbox: '-180,-30,-30,-15',
    coordinates: [
      [
        [-180, -30],
        [-30, -30],
        [-30, -15],
        [-180, -15],
        [-180, -30],
      ],
    ],
    description: 'Covers Mid-lower South America, containing upper Chile, Paraguay, lower Brazil, upper Argentina, lower Bolivia.',
  },
  '22': {
    name: 'Slice 22',
    bbox: '-30,-30,60,-15',
    coordinates: [
      [
        [-30, -30],
        [60, -30],
        [60, -15],
        [-30, -15],
        [-30, -30],
      ],
    ],
    description: 'Covers Lower Africa, including upper South Africa, Namibia, Botswana, Zimbabwe, parts of Madagascar.',
  },
  '23': {
    name: 'Slice 23',
    bbox: '60,-30,180,-15',
    coordinates: [
      [
        [60, -30],
        [180, -30],
        [180, -15],
        [60, -15],
        [60, -30],
      ],
    ],
    description: 'Covers the Upper part of Australia.',
  },
  '31': {
    name: 'Slice 31',
    bbox: '-180,-15,-30,0',
    coordinates: [
      [
        [-180, -15],
        [-30, -15],
        [-30, 0],
        [-180, 0],
        [-180, -15],
      ],
    ],
    description: 'Covers Mid-upper South America, covering upper Brazil, Peru, upper Bolivia.',
  },
  '32': {
    name: 'Slice 32',
    bbox: '-30,-15,60,0',
    coordinates: [
      [
        [-30, -15],
        [60, -15],
        [60, 0],
        [-30, 0],
        [-30, -15],
      ],
    ],
    description: 'Covers Lower-mid Africa, with parts of Angola, Zambia, Malawi, Tanzania, Kenya, Democratic Republic of the Congo, Gabon, Republic of the Congo.',
  },
  '33': {
    name: 'Slice 33',
    bbox: '60,-15,180,0',
    coordinates: [
      [
        [60, -15],
        [180, -15],
        [180, 0],
        [60, 0],
        [60, -15],
      ],
    ],
    description: 'Covers Papua New Guinea and parts of Indonesia.',
  },
  '41': {
    name: 'Slice 41',
    bbox: '-180,0,-30,15',
    coordinates: [
      [
        [-180, 0],
        [-30, 0],
        [-30, 15],
        [-180, 15],
        [-180, 0],
      ],
    ],
    description: 'Covers Upper South America, containing upper Colombia, Venezuela, Guyana, Suriname, Panama, Costa Rica, Nicaragua.',
  },
  '42': {
    name: 'Slice 42',
    bbox: '-30,0,60,15',
    coordinates: [
      [
        [-30, 0],
        [60, 0],
        [60, 15],
        [-30, 15],
        [-30, 0],
      ],
    ],
    description: 'Covers Upper-mid Africa, covering Nigeria, Cameroon, parts of Sudan, Ethiopia, Somalia.',
  },
  '43': {
    name: 'Slice 43',
    bbox: '60,0,180,15',
    coordinates: [
      [
        [60, 0],
        [180, 0],
        [180, 15],
        [60, 15],
        [60, 0],
      ],
    ],
    description: 'Covers Lower South Asia, containing Maldives, Sri Lanka, parts of Malaysia, Cambodia, Philippines, Indonesia.',
  },
  '51': {
    name: 'Slice 51',
    bbox: '-180,15,-30,30',
    coordinates: [
      [
        [-180, 15],
        [-30, 15],
        [-30, 30],
        [-180, 30],
        [-180, 15],
      ],
    ],
    description: 'Covers Lower North America, containing Mexico and Cuba.',
  },
  '52': {
    name: 'Slice 52',
    bbox: '-30,15,60,30',
    coordinates: [
      [
        [-30, 15],
        [60, 15],
        [60, 30],
        [-30, 30],
        [-30, 15],
      ],
    ],
    description: 'Covers Upper Africa, with parts of Egypt, Libya, Niger, Mauritania, Saudi Arabia, Oman, and Yemen.',
  },
  '53': {
    name: 'Slice 53',
    bbox: '60,15,180,30',
    coordinates: [
      [
        [60, 15],
        [180, 15],
        [180, 30],
        [60, 30],
        [60, 15],
      ],
    ],
    description: 'Covers Upper South Asia, covering Nepal, Bangladesh, parts of Pakistan, China, and India.',
  },
  '61': {
    name: 'Slice 61',
    bbox: '-180,30,-30,45',
    coordinates: [
      [
        [-180, 30],
        [-30, 30],
        [-30, 45],
        [-180, 45],
        [-180, 30],
      ],
    ],
    description: 'Covers Mid North America, covering most of the United States.',
  },
  '62': {
    name: 'Slice 62',
    bbox: '-30,30,60,45',
    coordinates: [
      [
        [-30, 30],
        [60, 30],
        [60, 45],
        [-30, 45],
        [-30, 30],
      ],
    ],
    description: 'Covers Lower western Europe, containing Spain, Italy, Turkey, parts of Italy, Iran, and Iraq.',
  },
  '63': {
    name: 'Slice 63',
    bbox: '60,30,180,45',
    coordinates: [
      [
        [60, 30],
        [180, 30],
        [180, 45],
        [60, 45],
        [60, 30],
      ],
    ],
    description: 'Covers Mid Asia, covering most of China, Japan, and parts of Afghanistan.',
  },
  '70': {
    name: 'Slice 70',
    bbox: '-180,45,180,60',
    coordinates: [
      [
        [-180, 45],
        [180, 45],
        [180, 60],
        [-180, 60],
        [-180, 45],
      ],
    ],
    description: 'Covers Northern parts of United States, Europe, Asia, and the majority of Russia.',
  },
  '80': {
    name: 'Slice 80',
    bbox: '-180,60,180,90',
    coordinates: [
      [
        [-180, 60],
        [180, 60],
        [180, 90],
        [-180, 90],
        [-180, 60],
      ],
    ],
    description: 'Covers the Northernmost regions of the world including Greenland, Arctic Ocean, and Northern Russia.',
  },
};

export default slices;

