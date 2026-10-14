// ════════════════════════════════════════════════════
//  近体诗 · 平水韵格律算法（零依赖、纯函数）
//
//  平水韵（刘渊《壬子新刊礼部韵略》，106 韵）：
//    上平 15 韵 · 下平 15 韵 · 上声 29 · 去声 30 · 入声 17
//  近体诗（律诗 / 绝句）只押【平声韵】，且必须一韵到底（首句可借邻韵）。
//
//  算法分四步：
//    ① 平仄判定 classifyTone(ch)
//       优先查平水韵字表（含入声，最准）；字表未收则按普通话四声推测
//       （一/二声→平，三/四声→仄），并标记 confidence 供上层如实呈现。
//    ② 节律格式 identifyPattern(tones)
//       近体诗四种基本句式：仄起仄收 / 仄起平收 / 平起仄收 / 平起平收，
//       由首句前两字定"起"、末字定"收"。
//    ③ 押韵校验 checkRhyme(lines)
//       逐句末字取韵部，校验一韵到底（首句可借邻韵，标为"孤雁出群"）。
//    ④ 声律谱 buildToneMap(lines)
//       输出 ○平 ●仄 逐字谱 + 每句的"替/对/粘"三项核验。
//
//  ⚠️ 学术口径（如实登记，不掩饰）：
//    平水韵完整字表 9000+ 字，本文件手校常用字 ≈650 字（优先覆盖
//    教材/名篇高频字与全部入声常用字）。未收录字以普通话四声回退，
//    回退结果标 confidence='modern'，界面以浅色显示以便识别。
// ════════════════════════════════════════════════════

// ── 韵部定义（平水韵 106 韵）────────────────────────
// 每韵给出序号、韵目名、四声、代表字（用于展示与人工校对）
export const RHYME_GROUPS = [
  // 上平十五韵
  { id: 'sp1', name: '一东', tone: 'level', reps: '东同铜桐筒童僮瞳中衷忠虫终戎崇嵩弓躬宫融雄熊穹穷冯风枫丰充隆空公功工攻蒙笼聋珑洪红鸿虹丛翁聪通蓬烘潼胧砻峒螽梦讧冻忡酆恫总侗窿懵庞种盅芎倥艨绒葱匆骢' },
  { id: 'sp2', name: '二冬', tone: 'level', reps: '冬农宗钟龙舂松冲容蓉庸封胸雍浓重从逢缝踪茸峰锋烽蛩慵恭供淙侬松凶墉镛佣溶邛共憧喁邕壅纵龚枞脓淞匈汹禺蛩跫榕' },
  { id: 'sp3', name: '三江', tone: 'level', reps: '江扛窗邦缸降双泷庞撞豇缸腔' },
  { id: 'sp4', name: '四支', tone: 'level', reps: '支枝移为垂吹陂碑奇宜仪皮儿离施知驰池规危夷师姿迟眉悲之芝时诗棋旗辞词期祠基疑姬丝司葵医帷思滋持随痴维卮麾墀弥慈遗肌脂雌披嬉尸狸炊湄篱兹差疲茨卑亏蕤陲骑曦歧谁斯私窥欹熙欺疵笞羁彝髭颐资糜饥衰锥姨夔祗涯伊追缁箕椎罴篪厘萎匙澌騑妫' },
  { id: 'sp5', name: '五微', tone: 'level', reps: '微薇晖辉徽挥韦围帏违闱霏菲妃飞非扉肥威畿机几讥矶稀希衣依归饥玑豨诽绯圻旂畿' },
  { id: 'sp6', name: '六鱼', tone: 'level', reps: '鱼渔初书舒居裾车渠余予誉舆胥狙锄疏蔬梳虚嘘徐猪闾庐驴诸除储如墟与畲疽苴于茹蛆且沮祛蜍榈淤好妤雎纾躇趄滁屠据匹咀衙涂虑' },
  { id: 'sp7', name: '七虞', tone: 'level', reps: '虞愚娱隅刍无芜巫于盂衢儒濡襦须株诛蛛殊瑜榆谀愉腴区驱躯朱珠趋扶符凫雏敷夫肤纡输枢厨俱驹模谟蒲胡湖瑚乎壶狐弧孤辜姑觚菰徒途涂荼图屠奴呼吾梧吴租卢鲈苏酥乌枯粗都铺禺诬圩瞿需逾俞殳竽渝岖芙摹' },
  { id: 'sp8', name: '八齐', tone: 'level', reps: '齐蛴脐黎犁梨黧妻萋凄堤低氐诋题提荑缔折篦鸡稽奚蹄兮倪霓西栖犀嘶撕梯鼙批挤迷泥溪蹊圭闺携畦嵇跻瀌奚醯' },
  { id: 'sp9', name: '九佳', tone: 'level', reps: '佳街鞋牌柴钗差崖涯阶偕谐骸排乖怀淮豺侪埋霾斋娃蛙蜗' },
  { id: 'sp10', name: '十灰', tone: 'level', reps: '灰恢魁隈回徊枚梅媒煤瑰雷催摧堆陪杯醅嵬推开哀埃台苔该才材财裁来莱栽哉灾猜孩虺胎皑呆抬' },
  { id: 'sp11', name: '十一真', tone: 'level', reps: '真因茵辛新薪晨辰臣人仁神亲申伸绅身宾滨邻鳞麟珍尘陈春津秦频苹颦银垠筠巾民珉缗贫淳醇纯唇伦纶轮沦匀旬巡驯钧均臻榛姻寅彬鹑皴遵循振甄岷谆椿询恂漘莘圳' },
  { id: 'sp12', name: '十二文', tone: 'level', reps: '文闻纹云氛分纷芬焚坟群裙君军勤斤筋勋薰曛熏荤耘芸汾氲员欣芹殷昕贲郧雯蕲' },
  { id: 'sp13', name: '十三元', tone: 'level', reps: '元原源园猿辕坦烦繁蕃樊翻萱喧冤言轩藩魂浑温孙门尊存蹲敦墩暾屯豚村盆奔论坤昏婚阍痕根恩吞沅媛援爰幡番反埙鸳宛掀昆琨鲲扪荪髡跟垠抡蕴犍袁怨蜿溷昆' },
  { id: 'sp14', name: '十四寒', tone: 'level', reps: '寒韩翰丹殚单安难餐滩坛檀弹残干肝竿乾阑栏澜兰刊丸桓绢繁曼馒谩瞒潘胖端湍酸团抟攒官观冠鸾銮栾峦欢宽盘蟠漫汗郸叹摊姗珊鼾' },
  { id: 'sp15', name: '十五删', tone: 'level', reps: '删潸关弯湾还环鹌鬟寰班斑颁般蛮颜菅攀顽山鳏艰闲娴悭孱潺殷扳讪患间' },
  // 下平十五韵
  { id: 'xp1', name: '一先', tone: 'level', reps: '先前千阡笺天坚肩贤弦烟燕莲怜田填钿年颠巅牵妍研眠渊涓蠲编玄县泉迁仙鲜钱煎然延筵禅蝉缠连联涟篇偏绵全宣镌穿川缘鸢铅捐旋娟船涎鞭专圆员乾虔愆权拳椽传焉跹溅舷咽零骈阗鹃翩扁平沿诠痊悛荃遄卷挛戋佃滇婵颛犍搴嫣癣澶单竣鄢扇键蜷棉' },
  { id: 'xp2', name: '二萧', tone: 'level', reps: '萧箫挑貂刁凋雕迢条跳苕调枭浇聊辽寥撩僚寮尧幺宵消霄绡销超朝潮嚣樵谯骄娇焦蕉椒饶烧遥姚摇谣瑶韶昭招飚标彪漂飘翘祧佻徭硝翘' },
  { id: 'xp3', name: '三肴', tone: 'level', reps: '肴巢交郊茅嘲钞包胶爻苞梢蛟庖匏坳敲胞抛鲛崤铙炮哮捎茭淆泡跑咬啁教' },
  { id: 'xp4', name: '四豪', tone: 'level', reps: '豪毫操髦刀萄猱桃糟漕旄袍挠蒿涛皋号陶翱敖遭篙羔高嘈搔毛艘滔骚韬缫膏牢醪逃槽劳叨绸萄颢' },
  { id: 'xp5', name: '五歌', tone: 'level', reps: '歌多罗河戈阿和波科柯陀娥蛾鹅萝荷何过磨螺禾哥娑驼佗沱峨那苛诃珂轲莎蓑梭婆摩魔讹坡颇俄哦呵皤么涡窝茄迦伽磋跎番蹉搓驮献蝌箩锅倭' },
  { id: 'xp6', name: '六麻', tone: 'level', reps: '麻花霞家茶华沙车牙蛇瓜斜邪芽嘉瑕纱鸦遮叉葩奢楂琶衙赊涯夸巴加耶嗟遐笳差蟆蛙虾拿葭茄挝呀枷哑娲爬杷芭鲨窊' },
  { id: 'xp7', name: '七阳', tone: 'level', reps: '阳杨扬香乡光昌堂章张王房芳长塘妆常凉霜藏场央泱鸯秧嫱床方浆觞梁娘庄黄仓皇装殇襄骧相湘箱缃创忘芒望尝偿樯枪坊囊郎唐狂强肠康冈苍匡荒遑行妨棠翔良航倡伥羌庆姜僵缰疆粮穰将墙桑刚祥详洋徉佯粱量羊伤汤鲂樟彰漳璋猖商防筐煌隍凰蝗惶璜廊浪当裆珰沧纲亢吭潢钢丧盲簧忙茫傍汪臧琅当庠裳昂障糖疡锵杭邙赃滂禳攘瓤抢螳踉眶炀阊彭蒋亡殃蔷镶孀' },
  { id: 'xp8', name: '八庚', tone: 'level', reps: '庚更羹盲横觥彭亨英瑛烹平评京惊荆明盟鸣荣莹兵卿生甥笙牲擎鲸迎行衡耕萌氓宏闳茎莺樱泓橙筝争清情晴精睛菁晶旌盈楹瀛嬴赢营婴缨贞成盛城诚呈程声征正轻名令并倾萦琼赓撑瞠枪崢猩珩蘅铿嵘丁嘤鹦铮琤砰怦绷瞠轰顷' },
  { id: 'xp9', name: '九青', tone: 'level', reps: '青经泾形刑邢型陉亭庭廷霆蜓停丁宁钉仃馨星腥醒惺娉灵棂苓零玲铃翎聆龄蛉囹泠瓴屏瓶萍荧萤萦扃冥溟铭瞑暝螟' },
  { id: 'xp10', name: '十蒸', tone: 'level', reps: '蒸承丞惩陵凌绫菱冰膺鹰应蝇绳渑乘升胜兴缯凭仍兢矜征凝称登灯僧增憎层能棱朋鹏弘肱腾誊藤恒' },
  { id: 'xp11', name: '十一尤', tone: 'level', reps: '尤邮优忧流留榴骝刘由油游猷悠攸牛修羞秋周州洲舟酬仇柔俦畴筹稠邱抽湫遒收鸠愁休囚求裘球浮谋牟眸矛侯猴喉讴沤鸥瓯楼娄陬偷头投钩沟幽彪疣绸浏瘤犹啾酋售蹂搜蒐叟艘搜邹诹驺鍪篓髅瘤馏骝' },
  { id: 'xp12', name: '十二侵', tone: 'level', reps: '侵寻浔林霖临针箴斟沈深淫心琴禽擒钦衾吟今襟金音阴岑簪琳琛椹谌忱壬任霪妊森参涔淋祲喑' },
  { id: 'xp13', name: '十三覃', tone: 'level', reps: '覃潭谭参骖南男谙庵含涵函岚蚕探贪耽龛堪谈甘三酣柑惭蓝篮担儋郯婪泔苷' },
  { id: 'xp14', name: '十四盐', tone: 'level', reps: '盐檐廉帘嫌严占髯谦奁纤签瞻蟾炎添兼缣尖潜阎镰粘淹箝甜恬拈暹詹渐歼黔沾苫占崦阉砭' },
  { id: 'xp15', name: '十五咸', tone: 'level', reps: '咸缄谗衔岩帆衫杉监凡馋芟喃嵌掺搀严' },
  // 上声（示例性收录常用韵）
  { id: 's1', name: '一董', tone: 'oblique', reps: '董懂动孔总笼汞桶洞空懵' },
  { id: 's2', name: '二肿', tone: 'oblique', reps: '肿种踵宠陇垄拥壅冗茸重冢奉捧勇涌踊俑蛹恐拱巩竦悚耸汹' },
  { id: 's10', name: '十贿', tone: 'oblique', reps: '贿悔改采彩綵海在罪载殆每亥乃' },
  { id: 's17', name: '十七筱', tone: 'oblique', reps: '筱小表鸟了晓少扰绕娆绍秒沼眇矫皎杳窈窕袅挑掉肇缥缈渺淼茑赵兆' },
  // ── 仄声韵 · 上声（收录常用 5 韵）──
  { id: 's3', name: '三讲', tone: 'oblique', reps: '讲港棒蚌项' },
  { id: 's4', name: '四纸', tone: 'oblique', reps: '纸只咫是靡彼毁委诡傀髓妓绮此徙髀尔迩弭弥婢庳侈弛豕紫捶揣企旨指视美訾否兕几姊匕比妣轨水唯止市徵喜己纪跪技蚁鄙晷子仔梓矢雉死履垒癸趾址以已似耜祀史驶耳使里理李起杞圯跂士仕俟始齿矣耻麂枳峙鲤迩氏玺巳滓苡倚匕迤逦旖旎舣蚍秕芷拟你企诔捶屣棰' },
  { id: 's20', name: '二十哿', tone: 'oblique', reps: '哿火舸柁沱我娜荷可坷轲左果裹朵锁琐堕惰妥坐么裸跛颇叵坷轲' },
  { id: 's25', name: '二十五有', tone: 'oblique', reps: '有酒首手口母后柳友妇斗狗久负厚走守绶右否受牖偶耦阜九后咎薮吼帚垢亩舅藕朽臼肘韭剖诱牡缶酉扣欧笱瓿黝' },
  // ── 仄声韵 · 去声（收录常用 5 韵）──
  { id: 'q1', name: '一送', tone: 'oblique', reps: '送梦凤洞众瓮贡弄冻痛栋恸仲中粽讽空控赣砻哄衷' },
  { id: 'q2', name: '二宋', tone: 'oblique', reps: '宋用颂诵统纵讼种综俸共供从缝雍封恐' },
  { id: 'q4', name: '四寘', tone: 'oblique', reps: '寘置事地意志思泪吏赐自字义利器位戏至次累伪寺瑞智记异致备肆翠骑使试类弃饵媚鼻易辔坠醉议翅避笥帜炽粹莳谊帅厕寄睡忌贰萃穗帔臂邃' },
  { id: 'q8', name: '八霁', tone: 'oblique', reps: '霁制计势世丽岁济第艺惠慧币砌滞际厉涕契毙帝蔽敝髻锐戾袂系祭卫隶闭逝缀翳替细桂税婿例誓筮蕙诣砺励瘗噬继脆睿毳曳蒂睇憩彗递' },
  { id: 'q10', name: '十卦', tone: 'oblique', reps: '卦挂懈廨隘卖画瘥问话败稗晒怪坏诫戒界介芥械拜快迈' },
  { id: 'q23', name: '二十三漾', tone: 'oblique', reps: '漾上望相将状帐浪唱让旷壮放向仗畅量葬匠障谤尚涨饷样藏舫访贶养酱嶂抗当酿亢脏瘴谅亮妄怆丧怅两圹宕忘傍砀恙吭炀张行广汤炕长创诳掠妨旺荡' },
  { id: 'q26', name: '二十六宥', tone: 'oblique', reps: '宥候就授售寿秀绣宿奏富兽斗漏陋守狩昼寇茂旧胄宙袖岫柚覆复救臭幼佑右侑囿豆窦逗溜瘤留构遘媾购透瘦漱镂鹫走副诟究凑谬缪疚灸畜柩骤首皱绉戊句鼬蹂沤又柚' },
  { id: 'q11', name: '十一队', tone: 'oblique', reps: '队内塞爱代佩岱贷逮戴袋再载菜蔡耐奈赖瀬妹昧碎对退背辈焙辈倍偕' },
  { id: 'q15', name: '十五翰', tone: 'oblique', reps: '翰汉看灿烂岸难散畔旦但惮叹炭案按贯半伴畔叛判乱段锻算蒜赞赞' },
  { id: 'q22', name: '二十二祃', tone: 'oblique', reps: '祃驾夜下谢榭罢夏暇霸嫁借藉蔗假化舍价射骂稼架诈亚娅跨麝怕讶迓蜡' },
  { id: 'q17', name: '十七霰', tone: 'oblique', reps: '霰殿面县变箭战扇煽膳传见现砚院练炼燕宴卷贱电荐绢彦掾甸便眷面线倦羡堰奠遍恋啭眩钏倩卞汴弁咽片禅谴绚谚颤擅颤抖' },
  // ── 仄声韵 · 入声（17 韵全收 —— 普通话已派入四声，是算法最需特判的部分）──
  { id: 'r1', name: '一屋', tone: 'oblique', reps: '屋木竹目服福禄熟谷肉咒鹿腹菊陆轴逐牧伏宿读犊渎牍椟黩毂复粥肃碌骕鬻育六缩哭幅斛戮仆畜蓄叔淑菽独卡馥沐速祝麓辘镞蹙筑穆睦啄覆鹜秃扑鬻辐瀑竺簇暴掬濮郁矗鞫塾朴蹴煜谡毓舳蝠夙蝮匐觫囿苜茯髑副孰谷' },
  { id: 'r2', name: '二沃', tone: 'oblique', reps: '沃俗玉足曲粟烛属录辱狱绿毒局欲束鹄蜀促触续督赎浴酷瞩躅褥旭欲渌逯告仆' },
  { id: 'r3', name: '三觉', tone: 'oblique', reps: '觉角桷较岳乐捉拙卓桌琢啄浊擢濯幄喔药握学渥' },
  { id: 'r4', name: '四质', tone: 'oblique', reps: '质日笔出室实疾术一乙壹吉秩密率律逸佚失漆栗毕恤蜜橘溢瑟膝匹述黜弼跸七叱卒虱悉谧术戌佶栉昵窒必侄蛭泌秫蟀嫉唧筚' },
  { id: 'r5', name: '五物', tone: 'oblique', reps: '物佛拂屈郁乞掘讫吃绂弗髴崛尉蔚契屹熨勿' },
  { id: 'r6', name: '六月', tone: 'oblique', reps: '月骨发阙越谒没伐罚卒竭窟笏钺歇突忽勃蹶筏厥蕨掘阀讷殁粤悖兀碣猝樾羯汨咄惚硌' },
  { id: 'r7', name: '七曷', tone: 'oblique', reps: '曷达末阔活钵脱夺褐割沫拔葛闼渴拨豁括聒抹遏挞跋魃喝撮怛萨' },
  { id: 'r8', name: '八黠', tone: 'oblique', reps: '黠札拔猾八察杀刹轧刖戛秸嘎瞎刮刷滑' },
  { id: 'r9', name: '九屑', tone: 'oblique', reps: '屑节雪绝列烈结穴说血舌洁别缺裂热决铁灭折拙切悦辙诀泄锲咽杰揭碣竭冽瞥迭跌阅餮耋垤捏页阕觖谲鴂撇蹩篾楔辍啜缀撤绁杰桀' },
  { id: 'r10', name: '十药', tone: 'oblique', reps: '药薄恶略作乐落阁鹤爵弱约脚雀幕洛壑索郭错跃若酌托削铎凿箔鹊诺萼搏讫搏昨阁酪洛珞寞寞膊粕摸昨' },
  { id: 'r11', name: '十一陌', tone: 'oblique', reps: '陌石客白泽伯迹宅席策册碧籍格役帛戟璧驿麦额柏魄积脉夕液册尺隙逆画百辟赤易革脊获翮屐适帻隔益窄核舄掷责坼惜癖僻辟掖腋释译驿峄择摘谪昔瘠赫炙谪虢腊硕螫藉翟亦鬲骼只鲫' },
  { id: 'r12', name: '十二锡', tone: 'oblique', reps: '锡壁历枥击绩勣笛敌滴镝檄激寂觌溺觅狄荻幂戚鹢涤的吃沥雳霹惕剔砾翟籴倜析晰淅蜥劈甓嫡轹栎阋菂踢迪皙裼逖' },
  { id: 'r13', name: '十三职', tone: 'oblique', reps: '职国德食蚀色力翼墨极殛息熄直值得北黑侧贼饰刻则塞式轼域蜮殖植敕亟棘惑忒默织匿慝亿忆臆薏特勒肋幅仄昃稷识逼克蜮唧即拭弋陟测冒抑恻肋亟殛忒黑' },
  { id: 'r14', name: '十四缉', tone: 'oblique', reps: '缉辑戢立集邑急入泣湿习给十拾袭及级涩楫粒汁蛰执笠隰汲吸絷挹悒岌熠葺什芨廿揖煜' },
  { id: 'r15', name: '十五合', tone: 'oblique', reps: '合塔答纳榻合杂腊蜡匝阖蛤衲沓鸽踏拓拉盍塌咂' },
  { id: 'r16', name: '十六叶', tone: 'oblique', reps: '叶帖贴牒接猎妾蝶叠箧惬涉鬣捷颊楫聂摄慑蹑协侠荚睫挟锲讘躞' },
  { id: 'r17', name: '十七洽', tone: 'oblique', reps: '洽狭峡法甲业邺匣压鸭乏怯劫胁插押狎掐夹恰眨呷' },
]

// ── 单字 → 韵部索引（由 reps 自动构建，单一真源）────
const CHAR_TO_GROUP = new Map()
for (const g of RHYME_GROUPS) {
  for (const ch of g.reps) {
    if (!CHAR_TO_GROUP.has(ch)) CHAR_TO_GROUP.set(ch, g) // 首见优先，避免多音字覆盖
  }
}

/**
 * 补充入声字表（高频虚字/常用字，散落于各入声韵）
 * 这些字在普通话中读阴平/阳平（会被四声回退误判为"平"），
 * 但在平水韵中为入声（仄）—— 是格律判定的关键，必须逐一收录。
 * 说明：此处只补"平仄"用途（toneGroup 用于显示），不改动上面的韵部归属。
 */
const EXTRA_RU_SHENG = '不 一 七 八 十 百 亿 的 得 德 国 学 觉 决 绝 说 月 越 发 法 达 答 杂 合 盒 活 夺 脱 括 阔 豁 昨 作 落 洛 络 阁 各 恶 薄 泊 博 莫 寞 幕 索 郭 托 若 弱 约 药 脚 角 却 确 爵 雀 鹊 略 掠 白 百 柏 拍 迫 魄 客 格 隔 革 核 黑 墨 默 特 则 泽 择 责 册 策 测 色 涩 北 得 德 刻 克 极 即 集 急 级 及 疾 嫉 习 席 夕 昔 惜 悉 膝 七 漆 息 熄 直 值 植 殖 职 食 识 石 实 十 什 拾 湿 失 室 日 密 蜜 笔 毕 必 匹 乙 一 逸 溢 瑟 质 秩 术 述 出 屈 曲 局 玉 足 促 俗 续 绿 录 陆 六 竹 逐 轴 筑 畜 蓄 叔 熟 肃 缩 祝 独 读 犊 木 目 牧 穆 服 福 幅 复 腹 覆 宿 肃 熟 肉 菊 掬 鞠 郁 育 毓 狱 欲 浴 曲 烛 属 辱 褥 触 蜀 束';
const EXTRA_SET = new Set(EXTRA_RU_SHENG.split(/\s+/).join(''))

/**
 * 补充"普通话易判错"的常用仄声字（去声/上声高频字）
 * 这些字不在上面的韵部代表字表内，若不补则会被回退规则误判或标 unknown。
 * 仅用于平仄判定，不作韵部归属。
 */
const EXTRA_OBLIQUE = new Set('尽 径 静 净 竟 境 镜 敬 劲 竞 靖 病 命 定 订 剩 胜 圣 性 姓 令 另 证 政 正 郑 梦 孟 盛 称 秤 应 映 硬 幸 杏 行 万 半 伴 畔 判 叛 岸 暗 按 案 汉 汗 旱 悍 但 担 淡 蛋 弹 断 段 锻 乱 畔 换 唤 幻 患 贯 惯 灌 冠 观 串 算 蒜 赞 暂 散 伞 感 敢 橄 看 刊 盼 扮 办 板 版 饭 返 犯 范 泛 见 现 县 线 宪 献 建 健 键 剑 箭 荐 贱 践 片 骗 遍 变 便 面 免 勉 电 殿 甸 店 点 典 恋 练 炼 链 念 验 燕 宴 雁 艳 厌 焰 岸 怨 愿 远 苑 劝 券 卷 倦 圈 院 愿 乱 暖 短 断 段 算 蒜 管 馆 贯 惯 灌 满 慢 漫 曼 蔓 赞 攒 灿 惨 掺 颤 产 铲 忏 战 站 展 辗 盏 扇 善 擅 膳 占 沾 粘 转 传 专 穿 川 喘 串 串 唱 畅 场 厂 敞 丈 仗 杖 帐 账 涨 掌 长 两 俩 辆 量 亮 谅 辆 样 痒 养 仰 氧 想 响 享 项 巷 向 象 像 相 匠 将 酱 强 抢 墙 腔 香 乡 详 祥 翔 湘 箱 镶 阳 扬 杨 洋 羊 佯 疡 央 秧 鸯 王 亡 忘 望 妄 旺 网 往 枉 罔 惘 龄 铃 玲 灵 岭 领 令 零 铃 冷 愣 井 景 警 颈 静 净 竟 境 镜 敬 劲 竞 靖 请 情 晴 清 轻 倾 卿 顷 庆 磐 罄 青 清 轻 倾 卿 名 明 鸣 铭 冥 溟 命 病 并 屏 瓶 平 评 萍 苹 凭 贫 品 聘 频 颦 民 敏 悯 闽 皿 泯 面 免 勉 眠 绵 棉 缅 腼 灭 蔑 篾 血 穴 雪 学 削 靴 谑 谖 喧 宣 悬 旋 选 炫 绚 眩 铉 玄 舷 弦 闲 贤 咸 衔 嫌 显 险 鲜 宪 献 现 县 线 限 陷 馅 羡 腺' )

/** 第二批：真实诗句实测的未收录高频仄声字（由 proof/diag-metre-coverage.mjs 量化得出） */
const EXTRA_OBLIQUE_2 = new Set('故 处 谓 四 最 眼 二 数 待 武 困 未 闭 露 迳 古 取 彷 徨 表 忍 岂 碍 趁 颓 垅 辇 卖 碎 对 背 辈 内 爱 代 佩 贷 岱 袋 再 载 菜 蔡 耐 奈 赖 妹 昧 退 焙 倍 塞 烂 灿 叹 炭 旦 惮 谢 榭 罢 夏 暇 霸 嫁 借 蔗 假 化 舍 价 射 骂 稼 架 诈 亚 跨 麝 怕 讶 迓 蜡 驾 夜 下 殿 变 箭 战 扇 膳 荐 绢 彦 甸 眷 倦 羡 堰 奠 啭 钏 倩 卞 汴 弁 咽 谴 谚 擅 抖 贮 柱 住 注 驻 铸 度 渡 妒 慕 墓 暮 募 怖 措 醋 素 诉 塑 兔 吐 怒 路 鹭 璐 布 步 部 簿 富 副 句 具 惧 聚 屡 缕 履 旅 序 叙 绪 续 讳 卉 贵 柜 馈 愧 溃 绘 会 惠 慧 慧 岁 穗 遂 隧 脆 翠 醉 粹 萃 蔽 敝 弊 币 毙 例 厉 励 丽 隶 递 第 帝 蒂 缔 砌 契 艺 诣 羿 婿 细 系 繫 计 继 髻 蓟 闭 蔽 谜 谜 谜 魅 媚 寐 臂 避 譬 屁 媲 剃 涕 替 屉 剂 济 霁 际 祭 际 制 製 滞 彗 睿 锐 蜕 税 说 逝 誓 噬' )

/** 判定是否为"补充仄声字" */
function isExtraOblique(ch) {
  return EXTRA_OBLIQUE.has(ch) || EXTRA_OBLIQUE_2.has(ch)
}

// ── 多音字特判表（一字多韵，需按语境定平仄；给出全部可能）──
export const POLYPHONE = {
  看: ['level', 'oblique'], 听: ['level', 'oblique'], 望: ['level', 'oblique'],
  忘: ['level', 'oblique'], 思: ['level', 'oblique'], 过: ['level', 'oblique'],
  令: ['level', 'oblique'], 教: ['level', 'oblique'], 兴: ['level', 'oblique'],
  为: ['level', 'oblique'], 应: ['level', 'oblique'], 中: ['level', 'oblique'],
  重: ['level', 'oblique'], 长: ['level', 'oblique'], 行: ['level', 'oblique'],
  从: ['level', 'oblique'], 分: ['level', 'oblique'], 论: ['level', 'oblique'],
  燕: ['level', 'oblique'], 车: ['level', 'oblique'], 疏: ['level', 'oblique'],
  骑: ['level', 'oblique'], 传: ['level', 'oblique'],
  冠: ['level', 'oblique'], 间: ['level', 'oblique'], 难: ['level', 'oblique'],
  当: ['level', 'oblique'], 将: ['level', 'oblique'], 相: ['level', 'oblique'],
  空: ['level', 'oblique'], 胜: ['level', 'oblique'], 供: ['level', 'oblique'],
}

// ── 普通话声调 → 平仄 回退规则 ──────────────────────
// 一/二声 → 平；三/四声 → 仄。入声字在普通话中散入四声，
// 故回退对入声字会偏"平"，这也是必须标记 confidence='modern' 的原因。
const MODERN_LEVEL_INITIALS = new Set(['b', 'd', 'g', 'j', 'z', 'zh'])

/** 普通话声调（1~4；未知为 0） */
export function modernTone(ch) {
  if (typeof ch !== 'string' || !ch) return 0
  // 常用字声调表（覆盖近体诗高频字，减少回退误差）
  return MODERN_TONE_MAP[ch] || 0
}

// 高频字普通话声调表（1=阴平 2=阳平 3=上声 4=去声）
const MODERN_TONE_MAP = {
  天: 1, 山: 1, 风: 1, 花: 1, 春: 1, 秋: 1, 江: 1, 云: 1, 霜: 1, 空: 1,
  烟: 1, 波: 1, 舟: 1, 衣: 1, 归: 1, 诗: 1, 书: 1, 音: 1, 心: 1, 深: 1,
  人: 2, 来: 2, 时: 2, 年: 2, 头: 2, 城: 2, 明: 2, 白: 2, 寒: 2, 残: 2,
  流: 2, 留: 2, 行: 2, 长: 2, 情: 2, 晴: 2, 楼: 2, 台: 2, 回: 2, 谁: 2,
  酒: 3, 雨: 3, 水: 3, 里: 3, 起: 3, 老: 3, 好: 3, 草: 3, 鸟: 3, 晚: 3,
  远: 3, 满: 3, 影: 3, 冷: 3, 浅: 3, 小: 3, 少: 3, 语: 3, 与: 3, 举: 3,
  月: 4, 日: 4, 夜: 4, 树: 4, 去: 4, 见: 4, 望: 4, 落: 4, 万: 4, 半: 4,
  梦: 4, 泪: 4, 醉: 4, 静: 4, 近: 4, 恨: 4, 病: 4, 客: 4, 雪: 3,
  不: 4, 又: 4, 更: 4, 共: 4, 独: 2, 一: 1, 十: 2, 百: 3, 千: 1, 两: 3,
  无: 2, 有: 3, 是: 4, 在: 4, 到: 4, 出: 1, 入: 4, 上: 4, 下: 4, 得: 2,
  知: 1, 觉: 2, 别: 2, 折: 2, 送: 4, 问: 4, 道: 4, 说: 1, 读: 2, 听: 1,
  卧: 4, 坐: 4, 立: 4, 走: 3, 飞: 1, 鸣: 2, 啼: 2, 歌: 1, 舞: 3,
  红: 2, 绿: 4, 青: 1, 碧: 4, 黄: 2, 黑: 1, 紫: 3, 丹: 1, 翠: 4,
  朝: 1, 暮: 4, 晨: 2, 昏: 1, 宵: 1, 昼: 4, 阴: 1, 暖: 3,
}

/**
 * 平仄判定（核心）
 * @returns {{tone:'level'|'oblique'|'unknown', confidence:'rhyme-book'|'modern'|'polyphone', group?:object, alternates?:string[]}}
 */
export function classifyTone(ch) {
  if (!ch || !/[\u4e00-\u9fff]/.test(ch)) {
    return { tone: 'unknown', confidence: 'none' }
  }

  const group = CHAR_TO_GROUP.get(ch)
  const poly = POLYPHONE[ch]

  // 多音字：给出两种可能，交由格律模式消歧（取能成立的那个）
  if (poly && group) {
    return {
      tone: group.tone === 'level' ? 'level' : 'oblique',
      confidence: 'polyphone',
      group,
      alternates: poly,
    }
  }

  if (group) {
    return { tone: group.tone === 'level' ? 'level' : 'oblique', confidence: 'rhyme-book', group }
  }

  // 补充入声字：平水韵为仄声（普通话回退会误判为平，故优先于回退）
  if (EXTRA_SET.has(ch)) {
    return { tone: 'oblique', confidence: 'rhyme-book', note: '入声（补充字表）' }
  }

  // 补充常用仄声字（去声/上声高频字，韵部代表字表未收）
  if (isExtraOblique(ch)) {
    return { tone: 'oblique', confidence: 'rhyme-book', note: '仄声（补充字表）' }
  }

  // 回退：普通话声调推测
  const mt = modernTone(ch)
  if (mt >= 1 && mt <= 4) {
    return { tone: mt <= 2 ? 'level' : 'oblique', confidence: 'modern' }
  }
  return { tone: 'unknown', confidence: 'none' }
}

/** 取韵部（用于押韵校验）；返回 null 表示字表未收 */
export function rhymeGroupOf(ch) {
  return CHAR_TO_GROUP.get(ch) || null
}

// ── 近体诗四种基本句式 ──────────────────────────────
// 五言：仄起仄收(仄仄平平仄) / 仄起平收(仄仄仄平平) / 平起仄收(平平平仄仄) / 平起平收(平平仄仄平)
// 七言：在五言前加两字相反的"头节"
export const PATTERNS = {
  5: [
    { key: 'zq-zs', start: 'oblique', end: 'oblique', name: '仄起仄收', base: '●●○○●' },
    { key: 'zq-ps', start: 'oblique', end: 'level', name: '仄起平收', base: '●●●○○' },
    { key: 'pq-zs', start: 'level', end: 'oblique', name: '平起仄收', base: '○○○●●' },
    { key: 'pq-ps', start: 'level', end: 'level', name: '平起平收', base: '○○●●○' },
  ],
  7: [
    { key: 'zq-zs', start: 'oblique', end: 'oblique', name: '仄起仄收', base: '○○●●○○●' },
    { key: 'zq-ps', start: 'oblique', end: 'level', name: '仄起平收', base: '○○●●●○○' },
    { key: 'pq-zs', start: 'level', end: 'oblique', name: '平起仄收', base: '●●○○○●●' },
    { key: 'pq-ps', start: 'level', end: 'level', name: '平起平收', base: '●●○○●●○' },
  ],
}

/** 逐字转平仄数组 */
export function toToneArray(line) {
  return Array.from(line || '').map((ch) => ({ ch, ...classifyTone(ch) }))
}

/** 按 ○● 符号渲染 */
export const TONE_SYMBOL = { level: '○', oblique: '●', unknown: '△' }

/**
 * 识别句式（由首两字定"起"、末字定"收"）
 * @param tones toToneArray 的结果
 */
export function identifyPattern(tones) {
  const valid = tones.filter((t) => t.tone !== 'unknown')
  if (valid.length < 2) return null
  const len = tones.length
  if (len !== 5 && len !== 7) return { key: 'other', name: `${len} 言（非标准近体句式）`, start: null, end: null, base: null }

  const start = tones[0].tone === 'oblique' ? 'oblique' : 'level'
  const lastCh = tones[len - 1]
  const end = lastCh.tone === 'oblique' ? 'oblique' : 'level'

  const found = PATTERNS[len].find((p) => p.start === start && p.end === end)
  return found || null
}

/**
 * 逐句校验「替」：一句之内 2/4/6 位平仄应交替（不交替即"失替"）
 */
export function checkTi(tones) {
  const pos = [1, 3, 5].filter((i) => i < tones.length) // 0-based：第 2、4、6 字
  const seq = pos.map((i) => tones[i]).filter((t) => t.tone !== 'unknown')
  if (seq.length < 2) return { ok: true, checked: 0, detail: '字数不足，未校验' }
  let alternations = 0
  for (let i = 1; i < seq.length; i++) if (seq[i].tone !== seq[i - 1].tone) alternations++
  const expected = seq.length - 1
  return {
    ok: alternations === expected,
    checked: seq.length,
    alternations,
    expected,
    detail: alternations === expected ? '平仄交替合律' : `2/4/6 位有 ${expected - alternations} 处未交替`,
  }
}

/**
 * 校验「对」：同一联内出句与对句的 2/4/6 位平仄应相反
 */
export function checkDui(lineA, lineB) {
  const pos = [1, 3, 5]
  let compared = 0
  let matched = 0
  for (const i of pos) {
    const a = lineA[i]
    const b = lineB[i]
    if (!a || !b || a.tone === 'unknown' || b.tone === 'unknown') continue
    compared++
    if (a.tone !== b.tone) matched++
  }
  if (!compared) return { ok: true, compared: 0, detail: '字数不足，未校验' }
  return {
    ok: matched === compared,
    compared,
    matched,
    detail: matched === compared ? '本联相对合律' : `本联有 ${compared - matched} 处未相对`,
  }
}

/**
 * 校验「粘」：上联对句与下联出句的 2 位平仄应相同
 */
export function checkNian(lineA, lineB) {
  const i = 1
  const a = lineA[i]
  const b = lineB[i]
  if (!a || !b || a.tone === 'unknown' || b.tone === 'unknown') {
    return { ok: true, compared: 0, detail: '字数不足，未校验' }
  }
  return {
    ok: a.tone === b.tone,
    compared: 1,
    detail: a.tone === b.tone ? '联间相粘合律' : '联间失粘',
  }
}

/**
 * 押韵校验：逐句取末字韵部
 * 近体诗规则：
 *  · 偶数句必押、一韵到底（同韵部）
 *  · 首句可押可不押；押则允许借邻韵（"孤雁出群格"）
 *  · 只押平声韵
 */
export function checkRhyme(lines) {
  const ends = lines.map((line, idx) => {
    const chars = Array.from(line || '')
    const ch = chars[chars.length - 1] || ''
    const g = rhymeGroupOf(ch)
    return {
      lineIndex: idx,
      isEven: (idx + 1) % 2 === 0,
      isFirst: idx === 0,
      ch,
      group: g,
      groupName: g ? g.name : null,
      tone: g ? g.tone : classifyTone(ch).tone,
      confidence: g ? 'rhyme-book' : classifyTone(ch).confidence,
    }
  })

  const evenEnds = ends.filter((e) => e.isEven && e.group)
  const mainGroup = evenEnds.length ? evenEnds[0].group : (ends.find((e) => e.group)?.group || null)

  const problems = []
  let sameRhyme = 0
  let checked = 0
  for (const e of ends) {
    if (!e.group) {
      if (e.isEven) problems.push({ lineIndex: e.lineIndex, type: 'unknown', msg: `第 ${e.lineIndex + 1} 句末字「${e.ch}」不在平水韵字表内` })
      continue
    }
    checked++
    if (e.isFirst) {
      // 首句借邻韵：允许，但标注
      if (mainGroup && e.group.id !== mainGroup.id) {
        problems.push({ lineIndex: 0, type: 'borrow', msg: `首句借「${e.group.name}」邻韵（孤雁出群格）`, severity: 'info' })
      } else sameRhyme++
      continue
    }
    if (e.isEven) {
      if (mainGroup && e.group.id === mainGroup.id) sameRhyme++
      else problems.push({ lineIndex: e.lineIndex, type: 'out', msg: `第 ${e.lineIndex + 1} 句押「${e.group.name}」，与主韵「${mainGroup.name}」不同（出韵）`, severity: 'error' })
    } else {
      // 奇数句（非首句）以仄收为常，押韵反而是"撞韵"
      if (e.group.id === mainGroup?.id) {
        problems.push({ lineIndex: e.lineIndex, type: 'collide', msg: `第 ${e.lineIndex + 1} 句本应仄收，却与主韵同部（撞韵）`, severity: 'warn' })
      }
    }
  }

  const errors = problems.filter((p) => p.severity === 'error').length
  const warns = problems.filter((p) => p.severity === 'warn').length

  // 韵脚一致率：分母只算"押韵位置"（偶数句），否则首句计入会把比率算到 >100%
  // （曾因此得出「音律 106 分」这种不可能值 —— 见 proof/verify-poem-metre.mjs）
  const evenWithGroup = ends.filter((e) => e.isEven && e.group).length
  const rhymeRate = evenWithGroup ? Math.min(1, sameRhyme / evenWithGroup) : 0

  return {
    ends,
    mainGroup,
    mainGroupName: mainGroup ? mainGroup.name : null,
    allLevelRhyme: evenEnds.every((e) => e.tone === 'level'),
    sameRhyme,
    checked,
    problems,
    errors,
    warns,
    rhymeRate,
    // 韵脚一致性得分 0~100（封顶，避免数学上不可能的值）
    score: Math.round(rhymeRate * 100),
  }
}

/**
 * 声律谱构建（完整报告）
 * @param lines 诗句数组（已按对仗断句）
 */
export function buildMetreReport(lines, { title = '', dynasty = '', author = '' } = {}) {
  // ⚠️ 必须先剥离标点再解析：
  //   接口返回的诗句常带「，。」，若不去掉会被算成字（实测出现「16 言」这种荒谬句式名），
  //   而且句末标点会把韵脚取字带偏（取到标点而非末字）。
  const stripPunct = (s) => String(s || '').replace(/[^\u4e00-\u9fff]/g, '')
  const clean = (lines || [])
    .map((l) => (typeof l === 'string' ? l : String(l || '')))
    .map(stripPunct)
    .filter((l) => l.trim())
  if (!clean.length) {
    return { ok: false, reason: '无诗句内容', lines: [] }
  }

  const toneLines = clean.map(toToneArray)
  const lineInfos = toneLines.map((tones, i) => {
    const pattern = identifyPattern(tones)
    const ti = checkTi(tones)
    return {
      index: i,
      text: clean[i],
      tones,
      symbols: tones.map((t) => TONE_SYMBOL[t.tone] || '△').join(''),
      pattern,
      patternName: pattern ? pattern.name : '句式不标准',
      ti,
    }
  })

  // 联间关系：出句/对句成对（1-2、3-4…）
  const pairs = []
  for (let i = 0; i + 1 < toneLines.length; i += 2) {
    const dui = checkDui(toneLines[i], toneLines[i + 1])
    const nian = i + 2 < toneLines.length ? checkNian(toneLines[i + 1], toneLines[i + 2]) : null
    pairs.push({ a: i, b: i + 1, dui, nian })
  }

  const rhyme = checkRhyme(clean)

  // 综合合规率：替 + 对 + 粘 + 韵
  const tiTotal = lineInfos.length
  const tiOk = lineInfos.filter((l) => l.ti.ok).length
  const duiTotal = pairs.length
  const duiOk = pairs.filter((p) => p.dui.ok).length
  const nianChecked = pairs.filter((p) => p.nian && p.nian.compared > 0)
  const nianOk = nianChecked.filter((p) => p.nian.ok).length
  const total = tiTotal + duiTotal + nianChecked.length + 1
  const okCount = tiOk + duiOk + nianOk + (rhyme.errors === 0 ? 1 : 0)
  const compliance = total ? Math.round((okCount / total) * 100) : 0

  // 平仄可信度：字表命中率（回退字越多，可信度越低 —— 如实呈现）
  const allTones = toneLines.flat()
  const known = allTones.filter((t) => t.confidence === 'rhyme-book' || t.confidence === 'polyphone').length
  const usable = allTones.filter((t) => t.tone !== 'unknown').length
  const rhymeBookRatio = usable ? known / usable : 0

  const isRegulated = clean.length === 4 || clean.length === 8
  // 句长取众数而非首句：防止个别句子长短不一时误报句式
  const lenCount = {}
  for (const l of toneLines) lenCount[l.length] = (lenCount[l.length] || 0) + 1
  const dominantLen = Number(Object.keys(lenCount).sort((a, b) => lenCount[b] - lenCount[a])[0]) || 0
  const uniform = Object.keys(lenCount).length === 1
  return {
    ok: true,
    title, dynasty, author,
    charCount: clean.join('').length,
    lineCount: clean.length,
    lineLength: dominantLen,
    uniformLineLength: uniform,
    regulatedForm: isRegulated
      ? (clean.length === 4 ? '绝句' : '律诗')
      : `${clean.length} 句（非典型近体结构）`,
    lines: lineInfos,
    pairs,
    rhyme,
    compliance,
    tiOk, tiTotal, duiOk, duiTotal, nianOk, nianTotal: nianChecked.length,
    rhymeBookRatio: Math.round(rhymeBookRatio * 100) / 100,
    confidenceNote: rhymeBookRatio >= 0.85
      ? '平水韵字表覆盖充分，判定可信'
      : `平水韵字表覆盖 ${Math.round(rhymeBookRatio * 100)}%，其余按普通话四声回退（浅色显示）`,
  }
}

// ════════════════════════════════════════════════════
//  五维评分（意境 / 风骨 / 格律 / 用典 / 音律）
//
//  设计原则：**全部由诗作自身特征推导**，不硬编码分值。
//   · 格律 ← checkTi / checkDui / checkNian 合规率（纯算法结论）
//   · 音律 ← 韵脚一致性 + 平仄交替密度 + 句长整齐度
//   · 意境 ← 意象词密度 + 意象种类数 + 句长变化（意境靠"象"承载）
//   · 风骨 ← 刚健/阔大语汇占比 + 气象词（用词力度而非情绪强度）
//   · 用典 ← 典故/人名/地名/化用标记命中（可解释的显式证据）
//  每维给出 contributions 明细，界面可展开"为什么是这个分"
// ════════════════════════════════════════════════════

// 意象词库（自然物象，分类计权）
const IMAGERY = {
  天文: '日月星辰云霞雾霭霜露风雪雷电虹霓烟岚',
  地理: '山川江河湖海溪泉涧浦洲渚岸堤峰岭崖谷',
  草木: '花草树木松竹梅兰菊柳桃李枫荷莲桂杏槐桑',
  鸟兽: '鸟雁鹤鹭莺燕鹊鸦鸿鹄龙鱼蝉猿马牛羊',
  器物: '舟船帆楼阁台亭轩窗帘幕杯盏壶觞剑琴笛箫钟鼓烛灯镜',
  声色: '红绿青碧黄白紫丹翠金彩明暗幽寒暖香冷',
}

// 风骨词库（刚健、阔大、气骨）
const SPIRIT_WORDS = '雄浑豪迈壮阔苍茫慷慨激昂长风万里千仞九霄凌云铁马金戈剑戟肝胆气骨风骨峥嵘巍峨磅礴吞没裂翻怒啸傲岸卓绝高洁不屈独醒'
const SPIRIT_SINGLE = '剑戈铁马骨雄豪壮怒啸裂吞傲屹'

// 典故/出处标记词（显式证据，避免主观）
const ALLUSION_MARKERS = '典故化用用典出处昔日当年曾经忆昔传闻据说'
// 常见历史人物与地名（可枚举的"用典"证据）
// ⚠️ 必须用数组而非字符串：字符串会被 for...of 逐【字】迭代，
//    导致"白/清/长"等单字被误认成人物实体（曾因此把《登高》的用典分算虚高）。
const ALLUSION_ENTITY_LIST = [
  '屈原', '陶潜', '渊明', '李白', '杜甫', '苏轼', '东坡', '李清照', '稼轩', '弃疾',
  '王维', '孟浩然', '白居易', '杜牧', '李商隐', '曹植', '谢灵运', '嵇康', '阮籍',
  '荆轲', '项羽', '诸葛', '周郎', '赤壁', '长安', '洛阳', '金陵', '扬州', '姑苏',
  '杭州', '洞庭', '潇湘', '巫山', '桃源', '武陵', '黄鹤楼', '滕王阁', '岳阳楼',
]

const countHits = (text, dict) => {
  let n = 0
  for (const ch of dict) if (text.includes(ch)) n++
  return n
}

/**
 * 计算五维得分
 * @param report buildMetreReport 的结果
 * @param poem   { title, dynasty, author }
 * @returns { dimensions: {key,label,score,contributions[]}[], rationale }
 */
export function scoreDimensions(report) {
  if (!report?.ok) {
    return { ok: false, dimensions: [] }
  }
  const text = report.lines.map((l) => l.text).join('')

  // ── 格律：替/对/粘 三项合规率 ──
  const tiRate = report.tiTotal ? report.tiOk / report.tiTotal : 0
  const duiRate = report.duiTotal ? report.duiOk / report.duiTotal : 0
  const nianRate = report.nianTotal ? report.nianOk / report.nianTotal : 0
  const geLv = Math.round((tiRate * 0.4 + duiRate * 0.35 + nianRate * 0.25) * 100)
  const gelvContrib = [
    { label: '句内平仄交替（替）', value: `${report.tiOk}/${report.tiTotal}`, weight: 0.4, ok: tiRate >= 0.99 },
    { label: '联内平仄相对（对）', value: `${report.duiOk}/${report.duiTotal}`, weight: 0.35, ok: duiRate >= 0.99 },
    { label: '联间平仄相粘（粘）', value: `${report.nianOk}/${report.nianTotal}`, weight: 0.25, ok: nianRate >= 0.99 },
  ]

  // ── 音律：韵脚一致 + 平仄交替密度 + 句长整齐 ──
  const rhymeRate = report.rhyme.rhymeRate ?? 0
  // 平仄交替密度：全篇相邻字平仄变化次数 / 总相邻对数
  let alt = 0
  let altTotal = 0
  for (const line of report.lines) {
    for (let i = 1; i < line.tones.length; i++) {
      const a = line.tones[i - 1].tone
      const b = line.tones[i].tone
      if (a === 'unknown' || b === 'unknown') continue
      altTotal++
      if (a !== b) alt++
    }
  }
  const altDensity = altTotal ? alt / altTotal : 0
  const lens = report.lines.map((l) => l.tones.length)
  const uniform = lens.length ? 1 - (Math.max(...lens) - Math.min(...lens)) / Math.max(...lens) : 0
  const yinLv = Math.round((rhymeRate * 0.5 + Math.min(1, altDensity / 0.55) * 0.3 + uniform * 0.2) * 100)
  const yinlvContrib = [
    { label: '韵脚一韵到底', value: `${Math.round(rhymeRate * 100)}%`, weight: 0.5, ok: rhymeRate >= 0.99 },
    { label: '平仄交替密度', value: `${Math.round(altDensity * 100)}%`, weight: 0.3, ok: altDensity >= 0.45 },
    { label: '句长整齐度', value: `${Math.round(uniform * 100)}%`, weight: 0.2, ok: uniform >= 0.99 },
  ]

  // ── 意境：意象密度 + 意象门类覆盖 + 变化度 ──
  const catHits = {}
  let imageryTotal = 0
  for (const [cat, dict] of Object.entries(IMAGERY)) {
    catHits[cat] = countHits(text, dict)
    imageryTotal += catHits[cat]
  }
  const catCovered = Object.values(catHits).filter((v) => v > 0).length
  const charCount = text.length || 1
  const imageryDensity = imageryTotal / charCount
  // 密度纬度按 0.26 归一（实测名篇意象密度约 0.11~0.20），避免名篇一律顶格
  const yiJing = Math.round(
    Math.min(1, imageryDensity / 0.26) * 50 + (catCovered / 6) * 32 + Math.min(1, altDensity / 0.55) * 18,
  )
  const yijingContrib = [
    { label: '意象词密度', value: `${Math.round(imageryDensity * 100)}%（${imageryTotal} 字）`, weight: 0.5, ok: imageryDensity >= 0.12 },
    { label: '意象门类覆盖', value: `${catCovered}/6 类`, weight: 0.32, ok: catCovered >= 4 },
    { label: '字面变化度', value: `${Math.round(altDensity * 100)}%`, weight: 0.18, ok: altDensity >= 0.45 },
  ]

  // ── 风骨：刚健语汇 + 气象阔大度 + 句式力度（无虚词堆砌）──
  const spiritHits = countHits(text, SPIRIT_WORDS) + countHits(text, SPIRIT_SINGLE)
  const emptyWords = countHits(text, '之乎者也而已矣焉哉')
  const spiritDensity = spiritHits / charCount
  const emptyRatio = emptyWords / charCount
  // 阔大度用"绝对命中数"而非密度：一联之内 8 处刚健语即算雄浑
  const fengGu = Math.round(
    Math.min(1, spiritHits / 10) * 50 + Math.min(1, spiritDensity / 0.13) * 28 + (1 - Math.min(1, emptyRatio / 0.06)) * 22,
  )
  const fengguContrib = [
    { label: '刚健/阔大语汇', value: `${spiritHits} 处`, weight: 0.5, ok: spiritHits >= 7 },
    { label: '语汇密度', value: `${Math.round(spiritDensity * 100)}%`, weight: 0.28, ok: spiritDensity >= 0.09 },
    { label: '虚词克制度', value: `${Math.round((1 - Math.min(1, emptyRatio / 0.06)) * 100)}%`, weight: 0.22, ok: emptyRatio <= 0.03 },
  ]

  // ── 用典：标记词 + 人物地名实体 ──
  const markerHits = countHits(text, ALLUSION_MARKERS)
  let entityHits = 0
  const hitEntities = []
  for (const name of ALLUSION_ENTITY_LIST) {
    if (text.includes(name)) {
      entityHits++
      hitEntities.push(name)
    }
  }
  const allusionTotal = markerHits + entityHits * 2
  // 分母提到 10：让"有典"与"满篇典故"能区分开（分母 4 时《登高》即顶格）
  const yongDian = Math.round(Math.min(1, allusionTotal / 10) * 88 + (entityHits > 0 ? 12 : 0))
  const yongdianContrib = [
    { label: '典故标记词', value: `${markerHits} 处`, weight: 0.45, ok: markerHits >= 2 },
    { label: '人物/地名实体', value: hitEntities.length ? `${entityHits} 处：${hitEntities.join('、')}` : '0 处', weight: 0.4, ok: entityHits >= 2 },
    { label: '出处可考度', value: entityHits > 0 ? '可考' : '未见显式典故', weight: 0.15, ok: entityHits > 0 },
  ]

  const clampScore = (v) => Math.max(6, Math.min(100, v)) // 下限 6：雷达图不留零面积，视觉上仍能看出弱项
  const dimensions = [
    { key: 'yijing', label: '意境', score: clampScore(yiJing), contributions: yijingContrib },
    { key: 'fenggu', label: '风骨', score: clampScore(fengGu), contributions: fengguContrib },
    { key: 'gelv', label: '格律', score: clampScore(geLv), contributions: gelvContrib },
    { key: 'yongdian', label: '用典', score: clampScore(yongDian), contributions: yongdianContrib },
    { key: 'yinlv', label: '音律', score: clampScore(yinLv), contributions: yinlvContrib },
  ]

  return {
    ok: true,
    dimensions,
    // 可供答辩解释的一句话依据
    rationale: `格律 ${geLv} 分（替/对/粘 实测 ${report.tiOk}/${report.tiTotal}·${report.duiOk}/${report.duiTotal}·${report.nianOk}/${report.nianTotal}）；`
      + `音律 ${yinLv} 分（韵脚一致 ${Math.round(rhymeRate * 100)}%、平仄交替 ${Math.round(altDensity * 100)}%）；`
      + `意境 ${yiJing} 分（意象 ${imageryTotal} 字 / ${catCovered} 门类，密度 ${Math.round(imageryDensity * 100)}%）；`
      + `风骨 ${fengGu} 分（刚健语汇 ${spiritHits} 处）；`
      + `用典 ${yongDian} 分（标记 ${markerHits} 处、实体 ${entityHits} 处${hitEntities.length ? '：' + hitEntities.join('、') : ''}）`,
  }
}

export const __internal = { CHAR_TO_GROUP, MODERN_TONE_MAP, IMAGERY, SPIRIT_WORDS, ALLUSION_ENTITY_LIST, EXTRA_SET, EXTRA_OBLIQUE, EXTRA_OBLIQUE_2 }
