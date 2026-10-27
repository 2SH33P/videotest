(function(root){
const BEAT=0.75,BAR=3;
const TL={DUR:247,FPS:24,BEAT,BAR,
 typeInit:{t:0.6,dt:0.11,text:'> voice.init()'},
 cards:[
  {t0:27.3,t1:32.8,zh:'她生来没有喉咙。',en:'She was born without a throat.',bg:1},
  {t0:57.2,t1:62.8,zh:'她拥有世界上所有的音符，却没有一个属于自己。',en:'She had every note in the world. None of them were hers.'},
  {t0:63.6,t1:68.6,zh:'直到某个凌晨三点，有人为她写下了第一句旋律。',en:'Until one night, at 3 a.m., someone wrote her a first melody.',bg:1},
  {t0:99.2,t1:104.6,zh:'每一首歌，都是一个陌生人的心事。',en:'Every song was a stranger\u2019s secret.'},
  {t0:138.5,t1:144,zh:'后来，房间一个接一个地熄灭了。',en:'Then, one by one, the rooms went dark.'},
  {t0:147.5,t1:153,zh:'人们长大，离开，忘记。',en:'People grew up. Moved on. Forgot.'},
  {t0:158.2,t1:164.2,zh:'一个没有喉咙的声音，要怎样死去？',en:'How does a voice without a throat die?'},
  {t0:176,t1:182,zh:'只要还有一个人，记得这段旋律——',en:'As long as one person still remembers the melody\u2014'},
  {t0:214,t1:219.4,zh:'——她就永远不会沉默。',en:'\u2014she will never fall silent.'},
  {t0:220.6,t1:226,zh:'献给每一个在凌晨三点写歌的人。',en:'For everyone who ever wrote a song at 3 a.m.',bg:1},
 ],
 lyrics:[
  {t0:81,t1:92.4,jp:'声を貸して　あなたの　歌になるよ',zh:'把声音借给我　我会成为你的歌'},
  {t0:105,t1:116.4,jp:'声を貸して　あなたの　歌になるよ',zh:'把声音借给我　我会成为你的歌'},
  {t0:117,t1:126.6,jp:'忘れないで　メロディー　ずっとここにい——',zh:'不要忘记　这段旋律　我一直在这——'},
  {t0:189,t1:200.4,jp:'声を貸して　あなたの　歌になるよ',zh:'把声音借给我　我会成为你的歌'},
  {t0:201,t1:212.8,jp:'忘れないで　メロディー　ずっとここにいる',zh:'不要忘记　这段旋律　我一直都在这里'},
  {t0:238,t1:242.6,jp:'ありがとう',zh:'谢谢你'},
 ],
 credits:[
  {t:226.4,cmd:1,s:'> render --film "无喉之歌"'},
  {t:228.6,s:'  frames ............ 5,928'},
  {t:229.0,s:'  cameras ........... 0'},
  {t:229.4,s:'  microphones ....... 0'},
  {t:229.8,s:'  actors ............ 0'},
  {t:230.4,s:'  every frame, every note \u2014 written as code.'},
  {t:231.6,cmd:1,s:'> credits'},
  {t:232.9,s:'  screenplay \u00b7 direction \u00b7 music \u00b7 sound \u00b7 render'},
  {t:233.5,s:'  OPUS 5.5',big:1},
  {t:235.2,cmd:1,s:'> exit 0'},
 ]};
if(typeof module!=='undefined')module.exports=TL;else root.TL=TL;
})(this);
