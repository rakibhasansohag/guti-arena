import type { GuideContent } from './content.ts';

const JUMP =
  'If a rival piece is next to yours on a line and the point straight beyond it is empty, jump over it and land there. The jumped piece leaves the board. You never have to capture.';
const CHAIN =
  'After a capture, the same piece may jump again if another capture is open, as many times as you like. You may also stop and end your turn.';

export default {
  ui: {
    hubTitle: 'How to play: pick a game',
    steps: 'Step by step',
    tips: 'Tips to win',
    faq: 'Questions',
    play: 'Play {name} now',
    friends: 'Play with friends',
    others: 'Guides to the other games',
    all: 'All games',
    read: 'Read the guide',
    lessonTitle: 'Try it yourself',
    lessonDone: 'Well done!',
    lessonMissed: 'Not quite. The capture was still open.',
    lessonAgain: 'Try again',
    you: 'You',
  },
  games: {
    four: {
      name: 'Four colours',
      seoTitle: 'Four-colour Sholo Guti rules: how to play with 4 players | Guti Arena',
      seoDescription:
        'Learn four-colour Sholo Guti step by step: the 73-point board, moving, capturing by jumping, chained jumps, the triangles and how to win. With diagrams.',
      title: 'How to play Four colours',
      intro:
        'Four players, one board. Each has 18 pieces of one colour. Move one piece a turn, capture by jumping, and be the last colour left. This board is Guti Arena’s own, modelled on the four-triangle guti boards of South Asia.',
      steps: {
        setup: {
          title: 'The board and the start',
          body: 'A 7 by 7 grid of points with a triangle on every side: 73 points. Blue sits north, yellow east, white south, red west. Every point starts with a piece except the centre.',
          alt: 'The four-colour board at the start, with only the centre empty',
        },
        move: {
          title: 'Move one step',
          body: 'On your turn, move one piece along a line to the empty point next to it. The grid has no diagonal lines.',
          alt: 'A blue piece with arrows to the four empty points around it',
        },
        capture: { title: 'Capture by jumping', body: JUMP, alt: 'A blue piece jumps a red piece' },
        chain: {
          title: 'Jump again',
          body: CHAIN,
          alt: 'A blue piece takes two yellow pieces in one turn',
        },
        triangle: {
          title: 'The triangles',
          body: 'Triangle lines work like any other line. A jump must stay on one straight line, so you can never jump round a corner.',
          alt: 'A blue piece jumps down the side of a triangle over a red piece',
        },
        win: {
          title: 'How to win',
          body: 'A colour with no pieces is out. The last colour with pieces wins. Turns go clockwise and a colour that cannot move is skipped. If 40 full rounds pass with no capture, the colour with the most pieces wins; a tie is a draw.',
          alt: 'Only blue pieces remain on the board',
        },
      },
      lesson:
        'You are blue. Take both yellow pieces in one turn: tap your piece, then the point to jump to, and jump again.',
      tips: [
        'Do not rush into the centre: the first piece there is often the first one taken.',
        'Keep pieces side by side on a line. A piece with a friend behind it cannot be jumped.',
        'Watch both neighbours. A capture that leaves your piece open to the next player is usually a bad trade.',
      ],
      faq: [
        {
          q: 'Can I play with two or three people?',
          a: 'All four colours always play. Give the spare colours to the computer, or pick Sholo Guti for two and Three corners for three.',
        },
        {
          q: 'Do I have to capture?',
          a: 'No. Capturing is optional, and you may stop a chain of jumps whenever you like.',
        },
        {
          q: 'What happens when my time runs out online?',
          a: 'Each turn has 30 seconds. After that the computer makes a move for your seat and the game goes on.',
        },
      ],
    },
    three: {
      name: 'Three corners',
      seoTitle: 'Three corners: a three-player guti game, rules and tips | Guti Arena',
      seoDescription:
        'Rules of Three corners, a guti game for exactly three players on a hexagon board: setup, moving in six directions, capturing, chained jumps and how to win.',
      title: 'How to play Three corners',
      intro:
        'A guti game for exactly three. No traditional three-player guti board is on record, so Guti Arena made one: a hexagon where every point has up to six neighbours. The moves are the same as in Sholo Guti.',
      steps: {
        setup: {
          title: 'The board and the start',
          body: 'The hexagon has 37 points. Each player starts with 12 pieces on one third of the board. Only the centre is empty.',
          alt: 'The hexagon board at the start: blue at the top, yellow lower right, white lower left',
        },
        move: {
          title: 'Move one step, six ways',
          body: 'Move one piece along a line to the empty point next to it. Lines run in three directions, so a piece in the open can go six ways.',
          alt: 'A blue piece in the centre with arrows to the six points around it',
        },
        capture: {
          title: 'Capture by jumping',
          body: JUMP,
          alt: 'A blue piece jumps a yellow piece into the centre',
        },
        chain: {
          title: 'Jump again',
          body: CHAIN,
          alt: 'A blue piece takes a yellow piece, then a white piece',
        },
        win: {
          title: 'How to win',
          body: 'A player with no pieces is out; the last one with pieces wins. Turns go clockwise: blue, yellow, white. If 40 full rounds pass with no capture, the player with the most pieces wins.',
          alt: 'Only blue pieces remain',
        },
      },
      lesson: 'You are blue. Take the yellow piece and then the white piece in one turn.',
      tips: [
        'Two players often gang up on the leader. Staying a close second can be safer than leading early.',
        'With six directions, a lone piece is exposed from many sides. Move in pairs.',
        'Let the other two trade pieces with each other, then pick off what is left.',
      ],
      faq: [
        {
          q: 'Is this a traditional game?',
          a: 'No. It is a Guti Arena original that uses the traditional guti moves on a new board for three.',
        },
        { q: 'Who moves first?', a: 'Blue, at the top. Then yellow and white, clockwise.' },
        {
          q: 'Can I play it alone?',
          a: 'Yes. Give the other two seats to the computer at easy, medium or hard.',
        },
      ],
    },
    classic: {
      name: 'Sholo Guti',
      seoTitle: 'Sholo Guti rules: how to play 16 guti, step by step | Guti Arena',
      seoDescription:
        'Sholo Guti (16 guti, sixteen soldiers) rules with diagrams: the board, starting position, moving, capturing by jumping, double jumps and how to win.',
      title: 'How to play Sholo Guti',
      intro:
        'Sholo Guti means sixteen pieces. Two players face each other with 16 pieces each. It has long been played across Bangladesh and India, often on a board scratched in the ground with stones for pieces.',
      steps: {
        setup: {
          title: 'The board and the start',
          body: 'A 5 by 5 grid with diagonal lines and a triangle at each end: 37 points. Each player fills the triangle and two rows on their side. The middle row starts empty.',
          alt: 'The Sholo Guti board at the start, with the middle row empty',
        },
        move: {
          title: 'Move one step',
          body: 'Move one piece along a line to the empty point next to it, in any direction, forwards or backwards. Only some points have diagonal lines, so look at the lines before you move.',
          alt: 'A blue piece in the centre with arrows to the eight points around it',
        },
        capture: {
          title: 'Capture by jumping',
          body: JUMP,
          alt: 'A blue piece jumps a white piece along the middle row',
        },
        chain: {
          title: 'Jump again',
          body: CHAIN,
          alt: 'A blue piece jumps one white piece, then another along a diagonal',
        },
        win: {
          title: 'How to win',
          body: 'Take all of your rival’s pieces. A player who cannot move is skipped. If 40 full rounds pass with no capture, the player with more pieces wins; equal counts are a draw.',
          alt: 'Only blue pieces remain',
        },
      },
      lesson:
        'You are blue. Take both white pieces in one turn: one along the row, then one along the diagonal.',
      tips: [
        'The centre point touches eight lines. Holding it gives your pieces the most room.',
        'Before you step forward, check the point behind your piece. If it is empty, you can be jumped.',
        'Offer one piece to open a double jump. Giving one to take two wins games.',
      ],
      faq: [
        {
          q: 'Is capturing compulsory in Sholo Guti?',
          a: 'No. In the recorded rules and on Guti Arena, capturing is optional.',
        },
        {
          q: 'Can pieces move backwards?',
          a: 'Yes. Every piece moves in any direction along a line from the first turn.',
        },
        {
          q: 'How is it different from draughts?',
          a: 'Pieces sit on points, not squares, move along drawn lines in every direction, and there are no kings.',
        },
      ],
    },
    quick: {
      name: 'Quick',
      seoTitle: 'Quick guti: a short 12-piece game, rules | Guti Arena',
      seoDescription:
        'Rules of Quick, a short two-player guti game on a 5 by 5 board with 12 pieces each: setup, moving, capturing and how to win.',
      title: 'How to play Quick',
      intro:
        'Sholo Guti without the triangles: 12 pieces each on a 5 by 5 grid. A game takes a few minutes, which makes it a good place to learn the moves.',
      steps: {
        setup: {
          title: 'The board and the start',
          body: 'A 5 by 5 grid with diagonal lines: 25 points. Each player has 12 pieces: two rows, plus two points of the middle row. Only the centre is empty.',
          alt: 'The quick board at the start, with only the centre empty',
        },
        move: {
          title: 'Move one step',
          body: 'Move one piece along a line to the empty point next to it, in any direction. Only some points have diagonal lines.',
          alt: 'A blue piece in the centre with arrows to the eight points around it',
        },
        capture: {
          title: 'Capture by jumping',
          body: JUMP,
          alt: 'A blue piece jumps a white piece',
        },
        chain: {
          title: 'Jump again',
          body: CHAIN,
          alt: 'A blue piece takes two white pieces in one turn',
        },
        win: {
          title: 'How to win',
          body: 'Take all of your rival’s pieces. If 40 full rounds pass with no capture, the player with more pieces wins; equal counts are a draw.',
          alt: 'Only blue pieces remain',
        },
      },
      lesson:
        'You are blue. Take both white pieces in one turn: one along the row, then one along the diagonal.',
      tips: [
        'The first move must go into the centre, and that piece can be taken at once. Make sure you can take back.',
        'Corners and edges are safer: fewer lines pass through them.',
        'When you are ahead, trade piece for piece. A smaller board makes a lead count sooner.',
      ],
      faq: [
        {
          q: 'Is Quick a traditional game?',
          a: 'It is a short form of Sholo Guti made for Guti Arena. The moves are the traditional ones.',
        },
        { q: 'Who moves first?', a: 'Blue, at the top.' },
        { q: 'How long does a game take?', a: 'Usually three to five minutes.' },
      ],
    },
    lau: {
      name: 'Lau kata kati',
      seoTitle: 'Lau kata kati rules: the butterfly board game of Bengal | Guti Arena',
      seoDescription:
        'How to play Lau kata kati, a small two-player guti game from Bengal on a butterfly-shaped board with 9 pieces each. Rules, diagrams and tips.',
      title: 'How to play Lau kata kati',
      intro:
        'A small, fast game recorded in Lower Bengal. Two triangles meet at one point, like a butterfly, and each player has 9 pieces. It is the quickest way into the guti family.',
      steps: {
        setup: {
          title: 'The board and the start',
          body: 'Two triangles joined at the centre: 19 points. Each player fills one triangle with 9 pieces. Only the centre point is empty.',
          alt: 'The butterfly board at the start, with only the centre empty',
        },
        first: {
          title: 'The first move',
          body: 'Move one piece along a line to the empty point next to it. At the start the only empty point is the centre, so the first move always goes there.',
          alt: 'A white piece steps into the centre',
        },
        capture: {
          title: 'Capture by jumping',
          body: 'Jump over a rival piece next to yours to the empty point straight beyond it, and it leaves the board. Here blue jumps the piece in the centre. In this game capturing is compulsory: if you can jump you must, and the same piece keeps jumping until no capture is left.',
          alt: 'A blue piece jumps the white piece in the centre',
        },
        win: {
          title: 'How to win',
          body: 'Take all of your rival’s pieces. A player who cannot move is skipped. If 40 full rounds pass with no capture, the player with more pieces wins.',
          alt: 'Only blue pieces remain',
        },
      },
      lesson:
        'You are blue. Jump the white piece in the centre, then keep jumping. Captures are compulsory here.',
      tips: [
        'Everything passes through the centre. Whoever controls it controls the crossing.',
        'Captures are forced, so you can pull a rival piece where you want it: offer one piece to set up a double jump.',
        'Keep your back row full as long as you can: pieces there cannot be jumped.',
      ],
      faq: [
        {
          q: 'Is capturing compulsory?',
          a: 'Yes. Unlike Sholo Guti, a player who can capture must, and a chain of jumps is played to its end.',
        },
        {
          q: 'What does the name mean?',
          a: 'Lau is a bottle gourd and kata kati means cutting, so roughly “cutting the gourd”.',
        },
        { q: 'How many pieces does each player have?', a: 'Nine each, on a board of 19 points.' },
      ],
    },
    bagh: {
      name: 'Bagh-chal',
      seoTitle: 'Bagh-chal rules: how to play tigers and goats | Guti Arena',
      seoDescription:
        'Learn Bagh-chal (tigers and goats) step by step: placing goats, how tigers capture, how goats trap tigers, and how each side wins. With diagrams and tips.',
      title: 'How to play Bagh-chal',
      intro:
        'Bagh-chal, the tiger game from Nepal, is a hunt. The two sides are different: one player has 4 tigers, the other has 20 goats. Tigers try to eat goats. Goats try to crowd the tigers until none can move.',
      steps: {
        setup: {
          title: 'The board and the start',
          body: 'A 5 by 5 grid with diagonal lines: 25 points. The four tigers start on the corners. The goats start off the board, in the goat player’s hand. Goats go first.',
          alt: 'The board at the start with a tiger on each corner',
        },
        place: {
          title: 'Goats: place one goat a turn',
          body: 'On each goat turn, put one goat on any empty point. Goats on the board cannot move until all 20 have been placed. After that, a goat turn is one step along a line to an empty point.',
          alt: 'A goat placed in the centre, with other empty points circled',
        },
        hunt: {
          title: 'Tigers: step or eat',
          body: 'A tiger moves one step along a line. If a goat is next to it and the point straight beyond is empty, the tiger may jump the goat and eat it. One goat per turn; tigers never jump twice. Goats can never capture.',
          alt: 'A tiger jumps a goat along a diagonal',
        },
        safe: {
          title: 'Goats: stand in rows',
          body: 'A tiger can only jump onto an empty point. A goat with another goat, or the edge of the board, straight behind it is safe. Here the tiger in the corner cannot eat anyone.',
          alt: 'A tiger in the corner facing goats that stand two deep',
        },
        trap: {
          title: 'How each side wins',
          body: 'Tigers win when they have eaten 5 goats. Goats win when no tiger can move: every step is blocked and every jump lands on a goat. If neither happens and 40 rounds pass with no goat eaten after all are placed, the game is a draw.',
          alt: 'A tiger shut in the corner by goats, unable to move',
        },
      },
      lesson:
        'You are the tiger, and four goats are already eaten. Eat the fifth: tap the tiger, then the point beyond the goat.',
      tips: [
        'Goats: build from the edges. A goat on the edge with a friend beside it is hard to eat.',
        'Goats: never leave an empty point straight behind a goat that a tiger is touching.',
        'Tigers: stay apart and near the middle. A tiger in a corner has only three ways out.',
      ],
      faq: [
        {
          q: 'Who goes first in Bagh-chal?',
          a: 'The goats. The goat player places the first goat.',
        },
        {
          q: 'Can goats capture tigers?',
          a: 'No. Goats win only by blocking every tiger so none can move.',
        },
        {
          q: 'Which side is easier?',
          a: 'Most beginners find tigers easier. Goats need patience, but careful goat play is very strong.',
        },
      ],
    },
  },
} satisfies GuideContent;
