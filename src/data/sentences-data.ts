import type { SentenceData } from '../types';

export const SENTENCES: SentenceData = {
  categories: ['Greetings', 'Cafe', 'Directions', 'Travel', 'Mealtime', 'Friends', 'Time', 'Weather'],
  entries: [
    { id: 'greetings-1', japanese: 'おはようございます。', reading: 'おはようございます。', korean: '안녕하세요. (아침 인사)', english: 'Good morning.', category: 'Greetings' },
    { id: 'greetings-2', japanese: 'こんにちは。', reading: 'こんにちは。', korean: '안녕하세요. (낮 인사)', english: 'Hello.', category: 'Greetings' },
    { id: 'greetings-3', japanese: 'はじめまして。', reading: 'はじめまして。', korean: '처음 뵙겠습니다.', english: 'Nice to meet you.', category: 'Greetings' },
    { id: 'greetings-4', japanese: 'お元気ですか。', reading: 'おげんきですか。', korean: '잘 지내세요?', english: 'How are you?', category: 'Greetings' },
    { id: 'greetings-5', japanese: 'さようなら。', reading: 'さようなら。', korean: '안녕히 가세요.', english: 'Goodbye.', category: 'Greetings' },

    { id: 'cafe-1', japanese: 'コーヒーをください。', reading: 'こーひーをください。', korean: '커피 주세요.', english: 'Coffee, please.', category: 'Cafe' },
    { id: 'cafe-2', japanese: 'これはいくらですか。', reading: 'これはいくらですか。', korean: '이것은 얼마예요?', english: 'How much is this?', category: 'Cafe' },
    { id: 'cafe-3', japanese: 'メニューを見せてください。', reading: 'めにゅーをみせてください。', korean: '메뉴를 보여주세요.', english: 'Please show me the menu.', category: 'Cafe' },
    { id: 'cafe-4', japanese: 'お水をお願いします。', reading: 'おみずをおねがいします。', korean: '물 좀 주세요.', english: 'Water, please.', category: 'Cafe' },
    { id: 'cafe-5', japanese: 'とてもおいしいです。', reading: 'とてもおいしいです。', korean: '아주 맛있어요.', english: "It's very delicious.", category: 'Cafe' },

    { id: 'directions-1', japanese: '駅はどこですか。', reading: 'えきはどこですか。', korean: '역은 어디예요?', english: 'Where is the station?', category: 'Directions' },
    { id: 'directions-2', japanese: 'まっすぐ行ってください。', reading: 'まっすぐいってください。', korean: '곧장 가세요.', english: 'Please go straight.', category: 'Directions' },
    { id: 'directions-3', japanese: '右に曲がってください。', reading: 'みぎにまがってください。', korean: '오른쪽으로 도세요.', english: 'Please turn right.', category: 'Directions' },
    { id: 'directions-4', japanese: 'ここから遠いですか。', reading: 'ここからとおいですか。', korean: '여기서 먼가요?', english: 'Is it far from here?', category: 'Directions' },
    { id: 'directions-5', japanese: 'トイレはどこですか。', reading: 'といれはどこですか。', korean: '화장실은 어디예요?', english: 'Where is the restroom?', category: 'Directions' },

    { id: 'travel-1', japanese: '空港までお願いします。', reading: 'くうこうまでおねがいします。', korean: '공항까지 부탁합니다.', english: 'To the airport, please.', category: 'Travel' },
    { id: 'travel-2', japanese: 'パスポートを見せてください。', reading: 'ぱすぽーとをみせてください。', korean: '여권을 보여주세요.', english: 'Please show me your passport.', category: 'Travel' },
    { id: 'travel-3', japanese: '何時に出発しますか。', reading: 'なんじにしゅっぱつしますか。', korean: '몇 시에 출발해요?', english: 'What time do we depart?', category: 'Travel' },
    { id: 'travel-4', japanese: '荷物はここに置いてもいいですか。', reading: 'にもつはここにおいてもいいですか。', korean: '짐을 여기 놓아도 되나요?', english: 'Can I put my luggage here?', category: 'Travel' },
    { id: 'travel-5', japanese: '写真を撮ってもいいですか。', reading: 'しゃしんをとってもいいですか。', korean: '사진을 찍어도 되나요?', english: 'May I take a photo?', category: 'Travel' },

    { id: 'mealtime-1', japanese: 'いただきます。', reading: 'いただきます。', korean: '잘 먹겠습니다.', english: "Let's eat.", category: 'Mealtime' },
    { id: 'mealtime-2', japanese: 'ごちそうさまでした。', reading: 'ごちそうさまでした。', korean: '잘 먹었습니다.', english: 'That was a great meal.', category: 'Mealtime' },
    { id: 'mealtime-3', japanese: '何を食べたいですか。', reading: 'なにをたべたいですか。', korean: '뭐 먹고 싶어요?', english: 'What do you want to eat?', category: 'Mealtime' },
    { id: 'mealtime-4', japanese: 'お腹が空きました。', reading: 'おなかがすきました。', korean: '배가 고파요.', english: "I'm hungry.", category: 'Mealtime' },
    { id: 'mealtime-5', japanese: '辛い料理は好きですか。', reading: 'からいりょうりはすきですか。', korean: '매운 음식 좋아해요?', english: 'Do you like spicy food?', category: 'Mealtime' },

    { id: 'friends-1', japanese: 'あなたの名前は何ですか。', reading: 'あなたのなまえはなんですか。', korean: '당신의 이름은 뭐예요?', english: 'What is your name?', category: 'Friends' },
    { id: 'friends-2', japanese: '私は学生です。', reading: 'わたしはがくせいです。', korean: '저는 학생이에요.', english: 'I am a student.', category: 'Friends' },
    { id: 'friends-3', japanese: '一緒に遊びましょう。', reading: 'いっしょにあそびましょう。', korean: '같이 놀아요.', english: "Let's play together.", category: 'Friends' },
    { id: 'friends-4', japanese: '趣味は何ですか。', reading: 'しゅみはなんですか。', korean: '취미가 뭐예요?', english: "What's your hobby?", category: 'Friends' },
    { id: 'friends-5', japanese: 'また会いましょう。', reading: 'またあいましょう。', korean: '또 만나요.', english: "Let's meet again.", category: 'Friends' },

    { id: 'time-1', japanese: '今何時ですか。', reading: 'いまなんじですか。', korean: '지금 몇 시예요?', english: 'What time is it now?', category: 'Time' },
    { id: 'time-2', japanese: '明日会いましょう。', reading: 'あしたあいましょう。', korean: '내일 만나요.', english: "Let's meet tomorrow.", category: 'Time' },
    { id: 'time-3', japanese: '今日は何曜日ですか。', reading: 'きょうはなんようびですか。', korean: '오늘은 무슨 요일이에요?', english: 'What day is it today?', category: 'Time' },
    { id: 'time-4', japanese: '時間がありません。', reading: 'じかんがありません。', korean: '시간이 없어요.', english: "I don't have time.", category: 'Time' },
    { id: 'time-5', japanese: '少々お待ちください。', reading: 'しょうしょうおまちください。', korean: '잠시만 기다려 주세요.', english: 'Please wait a moment.', category: 'Time' },

    { id: 'weather-1', japanese: '今日はいい天気ですね。', reading: 'きょうはいいてんきですね。', korean: '오늘 날씨가 좋네요.', english: 'The weather is nice today.', category: 'Weather' },
    { id: 'weather-2', japanese: '明日は雨が降ります。', reading: 'あしたはあめがふります。', korean: '내일은 비가 와요.', english: 'It will rain tomorrow.', category: 'Weather' },
    { id: 'weather-3', japanese: '今日はとても寒いです。', reading: 'きょうはとてもさむいです。', korean: '오늘은 아주 추워요.', english: "It's very cold today.", category: 'Weather' },
    { id: 'weather-4', japanese: '夏は暑いですね。', reading: 'なつはあついですね。', korean: '여름은 덥네요.', english: 'Summer is hot, isn\'t it?', category: 'Weather' },
    { id: 'weather-5', japanese: '傘を持っていますか。', reading: 'かさをもっていますか。', korean: '우산을 가지고 있어요?', english: 'Do you have an umbrella?', category: 'Weather' },
  ],
};
