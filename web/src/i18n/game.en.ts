import type { Dict } from './index.ts';

export default {
  'seo.title': 'Play Sholo Guti on one device | Guti Arena',
  'seo.description':
    'Play the four-colour Sholo Guti board game free in your browser: 2 to 4 seats, pass the phone between friends or play against easy, medium and hard AI.',

  you: 'You',
  'colour.blue': 'Blue',
  'colour.yellow': 'Yellow',
  'colour.white': 'White',
  'colour.red': 'Red',
  'kind.human': 'Human',
  'level.easy': 'Easy',
  'level.medium': 'Medium',
  'level.hard': 'Hard',

  'setup.title': 'Play on this device',
  'setup.lead':
    'Pick how many seats play, then make each seat a person or an AI. People take turns on this screen.',
  'setup.players': 'Players',
  'setup.count': '{n} players',
  'setup.seats': 'Seats',
  'setup.seatKind': '{colour} seat',
  'setup.start': 'Start game',

  'board.label': 'Guti board',
  'point.grid': 'Row {row}, column {col}',
  'point.triangle': '{side} triangle, {row}, point {n}',
  'side.n': 'North',
  'side.e': 'East',
  'side.s': 'South',
  'side.w': 'West',
  'row.m': 'middle row',
  'row.b': 'outer row',
  'point.empty': 'empty',
  'piece.blue': 'blue piece',
  'piece.yellow': 'yellow piece',
  'piece.white': 'white piece',
  'piece.red': 'red piece',
  'point.target': 'you can move here',
  'point.selected': 'selected',

  'status.yourTurn': 'Your turn: pick a piece',
  'status.chain': 'Jump again, or end your turn',
  'status.turn': "{name}'s turn",
  'status.thinking': '{name} is thinking…',
  'action.endTurn': 'End turn',

  'badge.pieces': '{n} pieces',
  'badge.onePiece': '{n} piece',
  'badge.out': 'Out',
  'badge.away': 'Away',

  'sound.off': 'Mute sound',
  'sound.on': 'Turn sound on',

  'end.youWin': 'You win!',
  'end.youLose': '{name} wins this one',
  'end.wins': '{name} wins!',
  'end.draw': "It's a draw",
  'end.rematch': 'Play again',
  'end.setup': 'Change players',
  'end.home': 'Go home',
} satisfies Dict;
