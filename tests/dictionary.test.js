const { slimify } = require('../controllers/dictionaryController');

// A trimmed-down sample of a real Free Dictionary API response for "clever"
const sample = [
  {
    word: 'clever',
    phonetic: '/ˈklɛvə/',
    phonetics: [
      { text: '', audio: '' },
      { text: '/ˈklɛvə/', audio: 'https://example.com/clever.mp3' },
    ],
    meanings: [
      {
        partOfSpeech: 'adjective',
        definitions: [
          {
            definition: 'Quick to understand, learn, and devise or apply ideas.',
            example: 'She is very clever at solving puzzles.',
          },
          {
            definition: 'Showing inventiveness or originality.',
          },
        ],
      },
    ],
  },
];

describe('slimify', () => {
  test('extracts word, phonetic, and definitions from a normal response', () => {
    const result = slimify(sample);

    expect(result.word).toBe('clever');
    expect(result.phonetic).toBe('/ˈklɛvə/');
    expect(result.definitions).toHaveLength(2);
    expect(result.definitions[0]).toEqual({
      partOfSpeech: 'adjective',
      definition: 'Quick to understand, learn, and devise or apply ideas.',
      example: 'She is very clever at solving puzzles.',
    });
  });

  test('sets example to null when a definition has no example', () => {
    const result = slimify(sample);
    expect(result.definitions[1].example).toBeNull();
  });

  test('falls back to the first phonetics entry that has text', () => {
    const noTopLevelPhonetic = [
      {
        word: 'test',
        phonetics: [
          { text: '', audio: '' },
          { text: '/tɛst/', audio: '' },
        ],
        meanings: [
          {
            partOfSpeech: 'noun',
            definitions: [{ definition: 'A procedure to establish quality.' }],
          },
        ],
      },
    ];

    const result = slimify(noTopLevelPhonetic);
    expect(result.phonetic).toBe('/tɛst/');
  });

  test('returns an empty result for malformed or empty input', () => {
    expect(slimify([])).toEqual({ word: '', phonetic: null, definitions: [] });
    expect(slimify(undefined)).toEqual({ word: '', phonetic: null, definitions: [] });
  });

  test('returns empty definitions when meanings are missing', () => {
    const noMeanings = [{ word: 'ghost', phonetic: '/ɡoʊst/' }];
    const result = slimify(noMeanings);
    expect(result.word).toBe('ghost');
    expect(result.definitions).toEqual([]);
  });
});