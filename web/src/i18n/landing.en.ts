import type { Dict } from './index.ts';

export default {
  // Shared chrome
  'nav.howToPlay': 'How to play',
  'nav.home': 'Guti Arena home',
  'nav.rooms': 'Live rooms',
  'cta.play': 'Play now',
  'cta.friends': 'Play with friends',
  'footer.madeBy': 'Made by',
  'footer.author': 'Rakib Hasan Sohag',
  'footer.source': 'Source code on GitHub',
  'footer.licence':
    'Code under the MIT licence. Sounds and ground texture CC0, reaction emoji Noto (Apache 2.0).',

  // Landing: SEO
  'seo.title': 'Play four-colour Sholo Guti online, free | Guti Arena',
  'seo.description':
    'Play the four-colour Sholo Guti board game in your browser: 2 to 4 players on one phone, against the computer, or with friends by link. Free, no sign-up.',
  'seo.board': 'The Guti Arena board with all four colours in their starting places',

  // Hero
  'hero.title': 'Play Sholo Guti with friends',
  'hero.sub':
    'The four-colour village board game. Play on one phone, against the computer, or online with a link.',
  'hero.fact': 'Free, with no sign-up, for 2 to 4 players.',
  'join.label': 'Have a room code?',
  'join.placeholder': '5 letters',
  'join.submit': 'Join room',
  'join.error': 'Room codes are 5 letters with no vowels.',

  // How it works
  'how.title': 'Three steps to a game',
  'how.1.title': 'Pick a game for 2, 3 or 4',
  'how.1.body':
    'Sholo Guti for two, a hexagon for three, four colours for four. Give each seat to a friend or to the computer.',
  'how.2.title': 'Step or jump',
  'how.2.body': 'Move one point along a line, or jump over a rival piece to take it off the board.',
  'how.3.title': 'Keep the last colour',
  'how.3.body': 'A colour with no pieces left is out. The last colour on the board wins.',
  'how.diagram1': 'Four seats around the board: blue, yellow, white and red',
  'how.diagram2': 'A blue piece jumps over a red piece',
  'how.diagram3': 'Only blue pieces are left on the board',

  // Story
  'story.title': 'A game from the courtyard',
  'story.body':
    'Sholo Guti is played across Bangladesh and eastern India, often on lines scratched into packed earth with pebbles or seeds for pieces. This is the four-colour version: a triangle for each player and 18 pieces a side.',
  'story.points': '73 points',
  'story.pieces': '18 pieces a side',
  'story.seats': '4 colours',
  'story.diagram': 'One triangle of the board with its six starting pieces',

  // Features
  'features.title': 'Seats, computer players and open code',
  'features.seats.title': 'Games for 2, 3 and 4 players',
  'features.seats.body':
    'Six games on one site: Sholo Guti, Quick, Lau kata kati and Bagh-chal for two, Three corners for three, Four colours for four.',
  'features.ai.title': 'Computer players at three levels',
  'features.ai.body':
    'Easy, medium and hard. Online, the computer also takes over a seat when someone leaves.',
  'features.free.title': 'Free and open source',
  'features.free.body':
    'No ads, no accounts, no betting. The code is on GitHub under the MIT licence.',

  // FAQ
  'faq.title': 'Questions',
  'faq.account.q': 'Do I need an account?',
  'faq.account.a':
    'No. Open the site and play. Online rooms remember your seat on this device only.',
  'faq.free.q': 'Is it free?',
  'faq.free.a': 'Yes. There are no ads, no purchases and no betting of any kind.',
  'faq.phone.q': 'Can we play on one phone?',
  'faq.phone.a': 'Yes. Choose local play and pass the phone round the table after each turn.',
  'faq.online.q': 'How do online rooms work?',
  'faq.online.a':
    'Create a room and send the link or the 5-letter code. Empty seats can be the computer, and each turn has 30 seconds.',
  'faq.capture.q': 'Do I have to capture?',
  'faq.capture.a':
    'No. Capturing is optional. After a capture you may keep jumping with the same piece or stop.',
  'faq.offline.q': 'Does it work without internet?',
  'faq.offline.a':
    'Local and computer games run in the browser once the page has loaded. Online rooms need a connection.',

  // Close
  'close.title': 'Set up a board',
  'close.body': 'Choose your seats and start. A game against the computer takes about ten minutes.',

  // How to play page
  'rules.seo.title': 'Sholo Guti rules for four players | Guti Arena',
  'rules.seo.description':
    'Rules of four-colour Sholo Guti: the board, moving, capturing, chained jumps, turn order and how to win, with diagrams.',
  'rules.title': 'How to play Guti Arena',
  'rules.intro':
    'Each player has 18 pieces of one colour. Take turns moving one piece. Capture by jumping, and be the last colour left.',
  'rules.board.title': 'The board',
  'rules.board.body':
    'A 7 by 7 grid of points joined by straight lines, with a triangle on each side: 73 points in all. Every point starts with a piece except the centre.',
  'rules.board.seats':
    'Blue sits north, yellow east, white south and red west. Each colour also carries a mark: dot, ring, cross or diamond.',
  'rules.board.diagram': 'The full board in its starting position',
  'rules.move.title': 'Moving',
  'rules.move.body':
    'On your turn, move one of your pieces one step along a line to an empty point next to it. There are no diagonal lines on the grid.',
  'rules.move.diagram': 'A blue piece can step to any of the four empty points around it',
  'rules.capture.title': 'Capturing',
  'rules.capture.body':
    'If a rival piece is next to yours on a line and the point straight beyond it is empty, jump over it to that point. The piece you jumped is removed. Capturing is optional.',
  'rules.capture.diagram': 'A blue piece jumps over a red piece and removes it',
  'rules.chain.title': 'Jumping again',
  'rules.chain.body':
    'After a capture, the same piece may jump again if another capture is open, as many times as you like. You can also stop and end your turn.',
  'rules.chain.diagram': 'A blue piece captures two yellow pieces in one turn',
  'rules.triangle.title': 'Triangles',
  'rules.triangle.body':
    'The triangle lines count like any other line. A jump must stay on one straight line, so you can never jump round a corner.',
  'rules.triangle.diagram': 'A blue piece jumps down a triangle side over a red piece',
  'rules.turns.title': 'Turn order',
  'rules.turns.body':
    'Turns go clockwise: blue, yellow, white, red. A colour that has no pieces, or no legal move, is skipped. Online, each turn has 30 seconds; when time runs out the computer moves for that seat.',
  'rules.win.title': 'Winning',
  'rules.win.body':
    'A colour with no pieces is out. The last colour with pieces wins. If 40 full rounds pass with no capture, the colour with the most pieces wins, and a tie is a draw.',
  'rules.win.diagram': 'Only blue pieces remain, so blue wins',

  // Share card
  'share.wins': '{name} wins',
  'share.draw': 'The game is a draw',
  'share.piecesLeft': 'Pieces left',
  'share.promo': 'Play Sholo Guti with friends: free, no download',
  'share.search': 'Search “Guti Arena” to play',
  'share.save': 'Save image',
  'share.share': 'Share image',
  'rules.games.title': 'The games',
  'rules.games.body':
    'Every game uses the same two moves: step to the next point, or jump a rival piece to take it. Only the board and the number of players change. The diagrams below show the four-colour board.',
  'rules.games.read': 'Read the {name} guide',
} satisfies Dict;
