import type { Dict } from './index.ts';

export default {
  'meta.title': 'প্রাইভেট রুম | Guti Arena',

  'colour.blue': 'নীল',
  'colour.yellow': 'হলুদ',
  'colour.white': 'সাদা',
  'colour.red': 'লাল',
  'level.off': 'এআই নয়',
  'level.easy': 'সহজ',
  'level.medium': 'মাঝারি',
  'level.hard': 'কঠিন',

  'action.home': 'হোমে যান',
  'action.solo': 'এআই-এর সঙ্গে খেলুন',
  'action.newRoom': 'নতুন রুম বানান',
  'action.retry': 'আবার চেষ্টা করুন',

  'create.title': 'আপনার রুম তৈরি হচ্ছে',
  'create.body': 'আপনি মানুষ কি না, একটু যাচাই করে নিচ্ছি। তারপরই রুম খুলবে।',

  'conn.connecting': 'রুমে যুক্ত হচ্ছে…',
  'conn.reconnecting': 'সংযোগ কেটে গেছে। আবার যুক্ত হচ্ছে…',

  'join.title': '{code} রুমে যোগ দিন',
  'join.body': 'অন্যরা যে নাম দেখবে, সেটি লিখুন। এরপর একটি আসনে বসতে পারবেন।',
  'join.button': 'রুমে যোগ দিন',
  'name.label': 'আপনার নাম',
  'name.placeholder': 'যেমন, রাকিব',
  'name.save': 'নাম রাখুন',

  'invite.button': 'বন্ধুদের ডাকুন',
  'invite.copied': 'লিংক কপি হয়েছে',
  'invite.code': 'রুম কোড {code}',

  'lobby.title': 'রুমের লবি',
  'lobby.lead': 'একটি ফাঁকা আসনে বসুন। হোস্ট এআই যোগ করবেন এবং খেলা শুরু করবেন।',
  'lobby.leadHost': 'আপনি হোস্ট। বন্ধুদের লিংক পাঠান, চাইলে ফাঁকা আসনে এআই বসান, তারপর খেলা শুরু করুন।',
  'lobby.seats': 'আসন',
  'lobby.start': 'খেলা শুরু করুন',
  'lobby.needTwo': 'অন্তত দুটি আসন ভরা থাকতে হবে।',
  'lobby.waitHost': 'হোস্ট খেলা শুরু করার অপেক্ষায়…',

  'seat.you': 'আপনি',
  'seat.ai': 'এআই · {level}',
  'seat.empty': 'ফাঁকা আসন',
  'seat.away': 'অনুপস্থিত',
  'seat.sit': 'এখানে বসুন',
  'seat.stand': 'আসন ছাড়ুন',
  'seat.aiFor': '{colour} আসনের এআই',

  'game.away': '{name} এখন নেই। ২০ সেকেন্ড পর ফিরে না আসা পর্যন্ত এআই তার হয়ে খেলবে।',

  'end.youWin': 'আপনি জিতেছেন!',
  'end.wins': '{name} জিতেছে!',
  'end.draw': 'খেলা ড্র হয়েছে',
  'end.rematch': 'আবার খেলুন',
  'end.waitHost': 'হোস্ট আবার খেলা শুরু করার অপেক্ষায়…',
  'end.leave': 'রুম ছাড়ুন',

  'problem.room-not-found.title': 'রুম পাওয়া যায়নি',
  'problem.room-not-found.body':
    'এই কোডে কোনো রুম নেই, অথবা সবাই চলে যাওয়ায় রুমটি বন্ধ হয়ে গেছে। কোডটি দেখে নিন বা নতুন রুম বানান।',
  'problem.room-full.title': 'রুমটি ভরে গেছে',
  'problem.room-full.body': 'এই মুহূর্তে রুমে অনেক মানুষ। নিজের একটি রুম বানিয়ে নিন।',
  'problem.daily-limit.title': 'আজ অনলাইন রুম ব্যস্ত',
  'problem.daily-limit.body':
    'বিনা খরচের সার্ভার আজকের সীমায় পৌঁছে গেছে। কাল আবার অনলাইন রুম চলবে; এখন এআই-এর সঙ্গে খেলতে পারেন।',
  'problem.create-failed.title': 'রুম বানানো গেল না',
  'problem.create-failed.body': 'যাচাই বা সার্ভার সাড়া দেয়নি। আবার চেষ্টা করুন।',

  'error.not-joined': 'আগে আপনার নাম লিখুন।',
  'error.already-joined': 'এই ট্যাবে অন্য নামে যোগ দেওয়া আছে। পেজটি রিলোড করুন।',
  'error.not-host': 'এটি শুধু হোস্ট করতে পারেন।',
  'error.not-lobby': 'এটি শুধু খেলা শুরুর আগে করা যায়।',
  'error.not-playing': 'খেলা এখন চলছে না।',
  'error.not-ended': 'খেলা এখনো শেষ হয়নি।',
  'error.seat-taken': 'আসনটি এইমাত্র কেউ নিয়ে নিয়েছে।',
  'error.seat-off-board': 'এই বোর্ডে ওই আসন নেই।',
  'error.need-two-seats': 'অন্তত দুটি আসন ভরা থাকতে হবে।',
  'error.not-your-turn': 'এখন আপনার চাল নয়।',
  'error.illegal-move': 'এই চাল দেওয়া যায় না।',
  'error.bad-message': 'কিছু একটা ভুল হয়েছে। পেজটি রিলোড করুন।',
  'error.too-big': 'বার্তাটি খুব বড় ছিল।',
  'error.rate-limit': 'একটু ধীরে চাল দিন।',
} satisfies Dict;
