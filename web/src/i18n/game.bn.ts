import type { Dict } from './index.ts';

export default {
  'seo.title': 'এক ডিভাইসে ষোলো গুটি খেলুন | Guti Arena',
  'seo.description':
    'ব্রাউজারেই বিনা খরচে চার রঙের ষোলো গুটি খেলুন: ২ থেকে ৪ জন, বন্ধুদের হাতে হাতে ফোন ঘুরিয়ে অথবা সহজ, মাঝারি ও কঠিন এআই-এর সঙ্গে।',

  you: 'আপনি',
  'colour.blue': 'নীল',
  'colour.yellow': 'হলুদ',
  'colour.white': 'সাদা',
  'colour.red': 'লাল',
  'kind.human': 'মানুষ',
  'level.easy': 'সহজ',
  'level.medium': 'মাঝারি',
  'level.hard': 'কঠিন',

  'setup.title': 'এই ডিভাইসে খেলুন',
  'setup.lead':
    'বোর্ড আর কজন খেলবেন বেছে নিন, তারপর প্রতিটি আসনে মানুষ না এআই খেলবে ঠিক করুন। মানুষেরা এই স্ক্রিনেই পালা করে চাল দেবেন।',
  'setup.board': 'বোর্ড',
  'boards.four': 'চার রঙ',
  'boards.four.hint': '৭ × ৭ ঘর, চার দিকে ত্রিভুজ। ২ থেকে ৪ জন, প্রত্যেকের ১৮টি গুটি।',
  'boards.classic': 'ক্লাসিক',
  'boards.classic.hint':
    'চেনা ষোলো গুটির বোর্ড: কোনাকুনি দাগসহ ৫ × ৫ ঘর আর দুই দিকে ত্রিভুজ। ২ জন, প্রত্যেকের ১৬টি গুটি।',
  'boards.quick': 'ঝটপট',
  'boards.quick.hint': 'কোনাকুনি দাগসহ ৫ × ৫ ঘর, ত্রিভুজ নেই। ২ জন, প্রত্যেকের ১২টি গুটি।',
  'setup.players': 'খেলোয়াড়',
  'setup.count': '{n} জন',
  'setup.seats': 'আসন',
  'setup.seatKind': '{colour} আসন',
  'setup.start': 'খেলা শুরু করুন',

  'board.label': 'গুটির বোর্ড',
  'point.grid': 'সারি {row}, কলাম {col}',
  'point.triangle': '{side} ত্রিভুজ, {row}, {n} নম্বর ঘর',
  'side.n': 'উত্তর',
  'side.e': 'পূর্ব',
  'side.s': 'দক্ষিণ',
  'side.w': 'পশ্চিম',
  'row.m': 'মাঝের সারি',
  'row.b': 'শেষ সারি',
  'point.empty': 'ফাঁকা',
  'piece.blue': 'নীল গুটি',
  'piece.yellow': 'হলুদ গুটি',
  'piece.white': 'সাদা গুটি',
  'piece.red': 'লাল গুটি',
  'point.target': 'এখানে চাল দেওয়া যায়',
  'point.selected': 'বাছাই করা',

  'status.yourTurn': 'আপনার চাল: একটি গুটি বাছুন',
  'status.chain': 'আবার টপকান, অথবা চাল শেষ করুন',
  'status.turn': '{name}-এর চাল',
  'status.thinking': '{name} ভাবছে…',
  'action.endTurn': 'চাল শেষ করুন',

  'badge.pieces': '{n}টি গুটি',
  'badge.onePiece': '{n}টি গুটি',
  'badge.out': 'বাদ',
  'badge.away': 'অনুপস্থিত',

  'sound.off': 'শব্দ বন্ধ করুন',
  'sound.on': 'শব্দ চালু করুন',

  'end.youWin': 'আপনি জিতেছেন!',
  'end.youLose': 'এবার {name} জিতেছে',
  'end.wins': '{name} জিতেছে!',
  'end.draw': 'খেলা ড্র হয়েছে',
  'end.rematch': 'আবার খেলুন',
  'end.setup': 'খেলোয়াড় বদলান',
  'end.home': 'হোমে যান',
} satisfies Dict;
