import type { Dict } from './index.ts';

export default {
  'meta.title': 'Private room | Guti Arena',

  'colour.blue': 'Blue',
  'colour.yellow': 'Yellow',
  'colour.white': 'White',
  'colour.red': 'Red',
  'level.off': 'No AI',
  'level.easy': 'Easy',
  'level.medium': 'Medium',
  'level.hard': 'Hard',

  'action.home': 'Go home',
  'action.solo': 'Play against the AI',
  'action.newRoom': 'Make a new room',
  'action.retry': 'Try again',

  'create.title': 'Making your room',
  'create.body': 'A quick check that you are a person, then your room opens.',

  'conn.connecting': 'Connecting to the room…',
  'conn.reconnecting': 'Connection lost. Reconnecting…',

  'join.title': 'Join room {code}',
  'join.body': 'Pick the name other players will see. You can sit at a seat next.',
  'join.button': 'Join room',
  'name.label': 'Your name',
  'name.placeholder': 'For example, Rakib',
  'name.save': 'Save name',

  'invite.button': 'Invite friends',
  'invite.copied': 'Link copied',
  'invite.code': 'Room code {code}',

  'lobby.title': 'Room lobby',
  'lobby.lead': 'Take a free seat. The host adds AI players and starts the game.',
  'lobby.leadHost':
    'You are the host. Send the link to friends, fill empty seats with AI if you like, then start.',
  'lobby.seats': 'Seats',
  'lobby.start': 'Start game',
  'lobby.waitHost': 'Waiting for the host to start…',

  'seat.you': 'you',
  'seat.ai': 'AI · {level}',
  'seat.empty': 'Empty seat',
  'seat.away': 'away',
  'seat.sit': 'Sit here',
  'seat.stand': 'Leave seat',
  'seat.aiFor': 'AI for the {colour} seat',

  'game.away': '{name} is away. After 20 seconds the AI plays for them until they come back.',

  'end.youWin': 'You win!',
  'end.wins': '{name} wins!',
  'end.draw': "It's a draw",
  'end.rematch': 'Play again',
  'end.waitHost': 'Waiting for the host to start a rematch…',
  'end.leave': 'Leave room',

  'problem.room-not-found.title': 'Room not found',
  'problem.room-not-found.body':
    'This room code does not exist, or the room closed after everyone left. Check the code or make a new room.',
  'problem.room-full.title': 'This room is full',
  'problem.room-full.body':
    'Too many people are in this room right now. Make your own room instead.',
  'problem.daily-limit.title': 'Online rooms are busy today',
  'problem.daily-limit.body':
    'The free server has reached its daily limit. Online rooms work again tomorrow; you can still play against the AI now.',
  'problem.create-failed.title': 'Could not make the room',
  'problem.create-failed.body': 'The check or the server did not answer. Please try again.',

  'error.not-joined': 'Enter your name first.',
  'error.already-joined': 'This tab already joined as someone else. Reload the page.',
  'error.not-host': 'Only the host can do that.',
  'error.not-lobby': 'That only works before the game starts.',
  'error.not-playing': 'The game is not running.',
  'error.not-ended': 'The game has not ended yet.',
  'error.seat-taken': 'That seat was just taken.',
  'error.seat-off-board': 'That seat is not on this board.',
  'error.need-two-seats': 'At least two seats must be filled.',
  'error.not-your-turn': "It's not your turn.",
  'error.illegal-move': 'That move is not allowed.',
  'error.bad-message': 'Something went wrong. Reload the page.',
  'error.too-big': 'That message was too long.',
  'error.rate-limit': 'Slow down a little.',
  'lobby.needAll': 'Fill every seat with a player or an AI.',
  'error.need-all-seats': 'Fill every seat with a player or an AI first.',
} satisfies Dict;
