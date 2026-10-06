// ==UserScript==
// @name         多奇中文簡繁轉換大師
// @version      1.1.0
// @description  自動識別網頁中的簡體中文並轉換為繁體中文，同時將中國大陸常用詞彙轉換為台灣用語(包含頁面標題、元素屬性值)，支援 SPA 類型網站，支援連續按下 stt 快速鍵轉換
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SimplifiedToTraditionalChinese.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SimplifiedToTraditionalChinese.user.js
// @author       Will Huang
// @match        *://*/*
// @exclude      https://www.youtube.com/*
// @exclude      https://m.youtube.com/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @require      https://cdn.jsdelivr.net/npm/@willh/opencc-js@1.1.0/dist/umd/full.js
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    /* global OpenCC */

    // ===== 執行環境檢查 =====

    // 頁面主機名稱：同一份文件的生命週期內不會改變（SPA 換頁只能改路徑，不能換網域），所以只算一次
    const PAGE_HOSTNAME = window.location.hostname.toLowerCase();

    // YouTube 由 repo 中專責的 `YouTubeSubtitleGeminiTranslator.user.js` 處理字幕翻譯。
    // 這支腳本早期附帶的 YouTube timedtext 字幕攔截器已在 1.1.0 移除：
    // 它會在「所有網站」改寫 fetch 與 XMLHttpRequest.prototype（每個 XHR 都多掛一個 listener），
    // 卻只對 YouTube 有用，而 YouTube 又早已被排除；另外 fetch(new URL(...)) 時還會因為
    // resource.url 為 undefined 而丟錯，進到 catch 後再呼叫一次原始 fetch，造成同一個請求送出兩次。
    // 除了 metadata 的 @exclude 之外，這裡保留一道執行期保險：
    // 即便 userscript manager 尚未套用新的 @exclude（例如快取了舊版設定），
    // 只要頁面位於 YouTube 就直接退出，不註冊任何轉換、觀察器或快捷鍵。
    if (PAGE_HOSTNAME === 'www.youtube.com' || PAGE_HOSTNAME === 'm.youtube.com' || PAGE_HOSTNAME === 'youtube.com') {
        return;
    }

    // @require 的腳本會在本腳本執行「之前」同步載入完成，
    // 所以此時 OpenCC 要嘛已經存在，要嘛代表 @require 下載失敗（之後也不會再出現）。
    // 舊版用 100ms × 20 次輪詢等待，實際上等不到任何東西，因此改為單次檢查後直接退出。
    if (typeof OpenCC === 'undefined') {
        console.error('[簡轉繁] OpenCC 函式庫載入失敗，腳本停止執行');
        return;
    }

    // 補充：metadata 加上 @noframes，讓腳本只在最上層頁面執行。
    // 因為 @match 是 *://*/*，沒有 @noframes 時，每個 iframe（廣告、嵌入內容）都會各自載入
    // 約 1.1MB 的 OpenCC，並各自註冊鍵盤監聽，對一般瀏覽是純粹的浪費。

    // ===== 設定常數 =====

    /* eslint-disable no-multi-spaces */

    // 允許「自動」進行簡繁轉換的網域模式（比對對象是 location.hostname，不是整個網址）
    // 設計意圖：
    // 1. 舊版用 /https:\/\/[^\/]*\.weibo\.com\// 比對整個 href，有兩個問題：
    //    (a) 要求網域前面一定有一個「.」，導致 weibo.com（微博主站）、baidu.com、qq.com 這類裸網域比對不到；
    //    (b) 沒有錨定開頭，像 https://www.google.com/url?q=https://news.sina.cn/... 這種
    //        「查詢字串裡夾帶 .cn 網址」的頁面也會被誤判為符合。
    // 2. 改為比對 hostname 並用 (^|\.) 與 $ 錨定：同時涵蓋裸網域與所有子網域，也不受路徑與查詢字串影響。
    //    （因為不再比對協定，http:// 的網站現在也會符合。）
    // 3. 只看 hostname 也代表同網域的 SPA 換頁不會改變判斷結果，一般網站因此不需要監聽路由。
    // 若要全站啟用，可將此陣列留空（空陣列 = 匹配所有網域）。
    const ALLOWED_HOST_PATTERNS = [
        /\.cn$/,                 // 中國網域 (.cn、.com.cn 等)
        /(^|\.)qq\.com$/,        // 騰訊 (qq.com)
        /(^|\.)baidu\.com$/,     // 百度 (baidu.com)
        /(^|\.)weibo\.com$/,     // 微博 (weibo.com)
        // X (x.com)：時間軸上繁體、簡體與其他語言的推文混雜，
        // 每個文字節點都會先經過簡繁偵測，只有判定為簡體的推文才會轉換，繁體推文維持原樣；
        // 發文框是 contenteditable，在排除範圍內，不會改到使用者正在輸入的文字
        /(^|\.)x\.com$/,         // X (x.com)
        // 增加更多網域模式...
    ];

    // 指定要自動翻譯的 GitHub ID（owner）清單
    // 設為空陣列時表示停用此條件，僅使用 ALLOWED_HOST_PATTERNS
    // 設定範例：['doggy8088', 'microsoft']，會套用到對應 owner 底下所有 Repo 頁面
    const ALLOWED_GITHUB_IDS = [
        // https://github.com/duanyytop/agents-radar/issues/28
        'duanyytop',
    ];

    // MutationObserver 處理節奏設定
    // 設計意圖：新增的內容「優先在 MutationObserver 回呼內同步轉換」。回呼會在瀏覽器繪製畫面之前執行，
    // 使用者就不會先看到簡體、過一下才閃成繁體（舊版固定延遲 50ms 才轉換，會有明顯閃爍）。
    // 但如果同一個 task 內回呼被連續觸發太多次（例如網頁自己的程式也在監聽 DOM 並把文字改回去，
    // 形成兩個觀察器互相觸發的「乒乓」），就改用 setTimeout 延後批次處理，強迫讓出主執行緒，避免頁面卡死。
    const MAX_SYNC_FLUSHES_PER_TASK = 20;    // 同一個 task 內最多同步處理幾次，超過就改為延後處理
    const MUTATION_DEFER_DELAY = 50;         // 延後批次處理的等待時間（毫秒）

    // 簡繁體檢測閾值
    const MIN_SIMPLIFIED_CHAR_COUNT = 1;     // 判定為簡體中文所需的最少簡體字數量

    // 鍵盤連續按鍵快捷鍵設定 (連續鍵入 "stt" 觸發簡繁轉換)
    // 設計意圖：網頁開啟後，若在非輸入文字的區域連續鍵入 "stt"（代表 Simplified To Traditional），
    // 即可手動強制觸發整頁簡轉繁。設定 1000 毫秒間隔閥值，限制使用者必須在短時間內連續輸入，
    // 避免平時瀏覽網頁時的無意識零星按鍵被誤組合成快捷鍵。
    const SHORTCUT_SEQUENCE = 'stt';         // 觸發簡繁轉換的目標字元序列
    const SHORTCUT_KEY_TIMEOUT = 1000;       // 連續按鍵的最大允許間隔時間（毫秒），超過此時間未鍵入下一字即重置

    /* eslint-enable no-multi-spaces */

    // 預先正規化 GitHub ID 清單，避免每次判斷都重複轉換大小寫與空白
    // 設計意圖：提升頻繁路由變化時的判斷效率，並讓設定值更寬容
    const normalizedAllowedGitHubIds = new Set(
        ALLOWED_GITHUB_IDS
            .filter(id => typeof id === 'string')
            .map(id => id.trim().toLowerCase())
            .filter(Boolean)
    );

    // ===== 頁面白名單判斷 =====

    // 網域白名單只依賴 hostname，而 hostname 在頁面生命週期內不會變，所以啟動時算一次即可
    const isAllowedHost =
        ALLOWED_HOST_PATTERNS.length === 0 ||
        ALLOWED_HOST_PATTERNS.some(pattern => pattern.test(PAGE_HOSTNAME));

    function isGitHubHost() {
        return PAGE_HOSTNAME === 'github.com' || PAGE_HOSTNAME === 'www.github.com';
    }

    // 檢查是否為「指定 GitHub ID 清單底下的 Repo 頁面」
    // 設計意圖：讓你只要維護一個帳號陣列，就能自動涵蓋多個 owner 的所有 Repo 頁面
    function shouldConvertGitHubRepoById() {
        if (normalizedAllowedGitHubIds.size === 0 || !isGitHubHost()) {
            return false;
        }

        // Repo 路徑至少會是 /owner/repo，若不足兩段表示不是特定 Repo 範圍
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        if (pathSegments.length < 2) {
            return false;
        }

        return normalizedAllowedGitHubIds.has(pathSegments[0].toLowerCase());
    }

    // 檢查當前網址是否在自動轉換白名單中
    // 第一優先：網域白名單；第二優先：GitHub ID（owner）清單底下所有 Repo 頁面（會隨 SPA 換頁改變）
    function shouldConvertPage() {
        return isAllowedHost || shouldConvertGitHubRepoById();
    }

    // ===== 簡繁體偵測 =====

    // 偵測字表：只收錄「簡體專用」與「繁體專用」的字，用來判斷一段文字是不是簡體中文。
    // 設計意圖：
    // - 舊版是手選的約 300 字，很多常見簡體字沒收錄（例如「其他仓库的内容」「加载完成了」整句都偵測不到），
    //   也曾誤收「只、制、系、游、后」這類繁體也常用的字，導致繁體內容被誤判後丟進 OpenCC 改寫。
    // - 現在改由 dev/SimplifiedToTraditionalChinese/generate-detection-chars.js 從本腳本 @require 的
    //   同一版 OpenCC 字典自動產生：簡體表取 STCharacters 的簡體字，再排除任何在繁體文字中也會出現的字
    //   （出現在繁體字表、臺灣異體字表，或在 10 個以上的繁體詞組中被保留，例如「皇后、仙后」裡的「后」）；
    //   繁體表反之。詳細規則與手動例外清單寫在產生器的註解中。
    // - 以 repo 內的 zh-tw 文件與一篇真實簡體文章（agents-radar issue #28）驗證：簡體短片段（2~8 字）
    //   偵測率由 90.4%（1.0.6 手選字表）提升到 96.5%，繁體文字被誤判並改寫的數量維持 0。
    // - 升級 OpenCC（修改 @require 網址）後，請重新執行產生器，讓字表與轉換器保持一致。
    // <generated:detection-chars>
    // 本區塊由 dev/SimplifiedToTraditionalChinese/generate-detection-chars.js 自動產生，請勿手動編輯
    // 資料來源：https://cdn.jsdelivr.net/npm/@willh/opencc-js@1.1.0/dist/umd/full.js
    // 簡體專用字 2687 個、繁體專用字 3743 個
    const SIMPLIFIED_ONLY_CHARS = [
        '㐷㐹㐽㑇㑈㑔㑩㓆㓥㓰㔉㖊㖞㘎㚯㛀㛟㛠㛣㛤㛿㟆㟜㟥㡎㤘㤽㥪㧏㧐㧑㧟㧰㨫㭎㭏㭣㭤㭴㱩㱮㲿㳔㳕㳠㳡㳢㳽㴋㶉㶶㶽㺍㻅㻏㻘䀥䁖䂵䃅䅉䅟䅪䇲',
        '䉤䌶䌷䌸䌹䌺䌻䌼䌽䌾䌿䍀䍁䍠䎬䏝䑽䓓䓕䓖䓨䗖䘛䘞䙊䙌䙓䜣䜤䜥䜧䜩䝙䞌䞍䞎䞐䟢䢀䢁䢂䥺䥽䥾䥿䦀䦁䦂䦃䦅䦆䦶䦷䩄䭪䯃䯄䯅䲝䲞䲟䲠䲡䲢',
        '䲣䴓䴔䴕䴖䴗䴘䴙䶮万与专业丛东丝丢两严丧个临为丽举义乌乐乔习乡书买乱争亏亘亚产亩亲亵亸亿仅从仑仓仪们价众优会伛伞伟传伡伣伤伥伦伧',
        '伪伫体佥侠侣侥侦侧侨侩侪侬侭俣俦俨俩俪俫俭债倾偬偻偾偿傤傥傧储傩儿兑兖党兰关兴兹养兽冁内冈册写军农冯冲决况冻净凄凉减凑凛凤凫凭凯',
        '击凿刍刘则刚创删别刬刭刹刽刾刿剀剂剐剑剥剧劝办务劢动励劲劳势勋勚匀匦匮区医华协单卖卢卤卧卫却卺厂厅历厉压厌厍厐厕厢厣厦厨厩厮县叁',
        '参叆叇双发变叙叠叶号叹叽吓吕吗吨听启吴呐呒呓呕呖呗员呙呛呜咏咙咛咝咤咨响哑哒哓哔哕哗哙哜哝哟唛唝唠唡唢唤啧啬啭啮啯啰啴啸喷喽喾嗫',
        '嗳嘘嘤嘱噜嚣团园囱围囵国图圆圣圹场坏块坚坛坜坝坞坟坠垄垅垆垒垦垩垫垭垯垱垲垴埘埙埚堑堕塆墙壮声壳壶壸处备复够头夹夺奁奂奋奖奥妆妇',
        '妈妩妪妫姗姹娄娅娆娇娈娱娲娴婳婴婵婶媪媭嫒嫔嫱嬷孙学孪宁宝实宠审宪宫宽宾寝对寻导寿将尔尘尝尧尴尽层屃屉届属屡屦屿岁岂岖岗岘岚岛岭',
        '岽岿峃峄峡峣峤峥峦崂崃崄崭嵘嵚嵝巅巩巯币帅师帏帐帘帜带帧帮帱帻帼幂并广庄庆庐庑库应庙庞废庼廪开异弃弑张弥弪弯弹强归当录彟彦彨彻径',
        '徕忆忏忧忾怀态怂怃怄怅怆怜总怼怿恋恒恳恶恸恹恺恻恼恽悦悫悬悭悮悯惊惧惨惩惫惬惭惮惯愠愤愦愿慑慭懑懒懔戆戋戏戗战戬戯户扑执扩扪扫扬',
        '扰抚抛抟抠抡抢护报担拟拢拣拥拦拧拨择挂挚挛挜挝挞挟挠挡挢挣挤挥挦捝捞损捡换捣据掳掴掷掸掺掼揽揾揿搀搁搂搄搅携摄摅摆摇摈摊撄撑撵撷',
        '撸撺擜擞攒敌敚敛敩数斋斓斩断无旧时旷旸昙昵昼昽显晋晒晓晔晕晖暂暅暧术机杀杂权杠条来杨杩极构枞枢枣枥枧枨枪枫枭柜柠柽栀栅标栈栉栊栋',
        '栌栎栏树栖样栾桠桡桢档桤桥桦桧桨桩桪梦梼梾梿检棁棂椁椝椟椠椢椤椫椭椮楼榄榅榇榈榉榝槚槛槟槠横樯樱橥橱橹橼檩欢欤欧歼殁殇残殒殓殚殡',
        '殴毁毂毕毙毡毵毶氇气氢氩氲汇汉汤汹沄沟没沣沤沥沦沧沨沩沪泞泪泶泷泸泺泻泼泽泾洁洒洼浃浅浆浇浈浉浊测浍济浏浐浑浒浓浔浕涚涛涝涞涟涠',
        '涡涢涣涤润涧涨涩淀渊渌渍渎渐渑渔渖渗温湾湿溁溃溅溆溇滗滚滞滟滠满滢滤滥滦滨滩滪潆潇潋潍潜潴澛澜濑濒灏灭灯灵灾灿炀炉炖炜炝点炼炽烁',
        '烂烃烛烟烦烧烨烩烫烬热焕焖焘煴爱爷牍牦牵牺犊状犷犸犹狈狝狞独狭狮狯狰狱狲猃猎猕猡猪猫猬献獭玑玙玚玛玮环现玱玺珐珑珰珲琎琏琐琼瑶瑷',
        '瑸璎瓒瓮瓯电画畅畴疖疗疟疠疡疬疭疮疯疱疴痈痉痒痖痨痪痫瘅瘆瘗瘘瘪瘫瘾瘿癞癣癫皑皱皲盏盐监盖盗盘眍眦眬睁睐睑瞆瞒瞩矫矶矾矿砀码砖砗',
        '砚砜砺砻砾础硁硕硖硗硙硚确硵硷碍碛碜碱礼祃祎祢祯祷祸禀禄禅离秃秆种积称秽秾稆税稣稳穑穞穷窃窍窎窑窜窝窥窦窭竖竞笃笋笔笕笺笼笾筚筛',
        '筜筝筹筼签筿简箓箦箧箨箩箪箫篑篓篮篯篱簖籁籴类籼粜粝粤粪粮糁糇糍紧絷縆纟纠纡红纣纤纥约级纨纩纪纫纬纭纮纯纰纱纲纳纴纵纶纷纸纹纺纻',
        '纼纽纾线绀绁绂练组绅细织终绉绊绋绌绍绎经绐绑绒结绔绕绖绗绘给绚绛络绝绞统绠绡绢绣绤绥绦继绨绩绪绫绬续绮绯绰绱绲绳维绵绶绷绸绹绺绻',
        '综绽绾绿缀缁缂缃缄缅缆缇缈缉缊缋缌缍缎缏缐缑缒缓缔缕编缗缘缙缚缛缜缝缞缟缠缡缢缣缤缥缦缧缨缩缪缫缬缭缮缯缰缱缲缳缴缵罂网罗罚罢罴',
        '羁羟羡翘翙翚耢耧耸耻聂聋职聍联聩聪肃肠肤肮肴肾肿胀胁胆胜胧胨胪胫胶脉脍脏脐脑脓脔脚脱脶脸腊腌腘腭腻腼腽腾膑膻臜舆舣舰舱舻艰艳艺节',
        '芈芗芜芦苁苇苈苋苌苍苎苏苹茎茏茑茔茕茧荆荐荙荚荛荜荝荞荟荠荡荣荤荥荦荧荨荩荪荫荬荭荮药莅莱莲莳莴莶获莸莹莺莼萚萝萤营萦萧萨葱蒀蒇',
        '蒉蒋蒌蒏蓝蓟蓠蓣蓥蓦蔂蔷蔹蔺蔼蕰蕲蕴薮藓蘖虏虑虚虫虬虮虱虽虾虿蚀蚁蚂蚃蚕蚝蚬蛊蛎蛏蛮蛰蛱蛲蛳蛴蜕蜗蜡蝇蝈蝉蝎蝼蝾螀螨蟏衅衔补衬衮',
        '袄袅袆袜袭袯装裆裈裢裣裤裥褛褴襕见观觃规觅视觇览觉觊觋觌觍觎觏觐觑觞触觯訚詟誉誊讠计订讣认讥讦讧讨让讪讫讬训议讯记讱讲讳讴讵讶讷',
        '许讹论讻讼讽设访诀证诂诃评诅识诇诈诉诊诋诌词诎诏诐译诒诓诔试诖诗诘诙诚诛诜话诞诟诠诡询诣诤该详诧诨诩诪诫诬语诮误诰诱诲诳说诵诶请',
        '诸诹诺读诼诽课诿谀谁谂调谄谅谆谇谈谉谊谋谌谍谎谏谐谑谒谓谔谕谖谗谘谙谚谛谜谝谞谟谠谡谢谣谤谥谦谧谨谩谪谫谬谭谮谯谰谱谲谳谴谵谶豮',
        '贝贞负贠贡财责贤败账货质贩贪贫贬购贮贯贰贱贲贳贴贵贶贷贸费贺贻贼贽贾贿赀赁赂赃资赅赆赇赈赉赊赋赌赍赎赏赐赑赒赓赔赕赖赗赘赙赚赛赜',
        '赝赞赟赠赡赢赣赪赵赶趋趱趸跃跄跖跞践跶跷跸跹跻踌踪踬踯蹑蹒蹰蹿躏躜躯车轧轨轩轪轫转轭轮软轰轱轲轳轴轵轶轷轸轹轺轻轼载轾轿辀辁辂较',
        '辄辅辆辇辈辉辊辋辌辍辎辏辐辑辒输辔辕辖辗辘辙辚辞辩辫边辽达迁过迈运还这进远违连迟迩迳迹适选逊递逦逻遗遥邓邝邬邮邹邺邻郏郐郑郓郦郧',
        '郸酂酝酦酱酽酾酿释鉴銮錾钅钆钇针钉钊钋钌钍钎钏钐钑钒钓钔钕钖钗钘钙钚钛钜钝钞钟钠钡钢钣钤钥钦钧钨钩钪钫钬钭钮钯钰钱钲钳钴钵钶钷钸',
        '钹钺钻钼钽钾钿铀铁铂铃铄铅铆铇铈铉铊铋铌铍铎铏铐铑铒铓铔铕铖铗铘铙铚铛铜铝铞铟铠铡铢铣铤铥铦铧铨铩铪铫铬铭铮铯铰铱铲铳铴铵银铷铸',
        '铹铺铻铼铽链铿销锁锂锃锄锅锆锇锈锉锊锋锌锍锎锏锐锑锒锓锔锕锖锗锘错锚锛锜锝锞锟锠锡锢锣锤锥锦锧锨锩锪锫锬锭键锯锰锱锲锳锴锵锶锷锸',
        '锹锺锻锼锽锾锿镀镁镂镃镄镅镆镇镈镉镊镋镌镍镎镏镐镑镒镓镔镕镖镗镘镙镚镛镜镝镞镟镠镡镢镣镤镥镦镧镨镩镪镫镬镭镮镯镰镱镲镳镴镵镶长门',
        '闩闪闫闬闭问闯闰闱闲闳间闵闶闷闸闹闺闻闼闽闾闿阀阁阂阃阄阅阆阇阈阉阊阋阌阍阎阏阐阑阒阓阔阕阖阗阘阙阚阛队阳阴阵阶际陆陇陈陉陕陦陧',
        '陨险随隐隶隽难雇雏雠雳雾霁霉霡霭靓靔静靥鞑鞒鞯鞲韦韧韨韩韪韫韬韵页顶顷顸项顺须顼顽顾顿颀颁颂颃预颅领颇颈颉颊颋颌颍颎颏颐频颒颓颔',
        '颕颖颗题颙颚颛颜额颞颟颠颡颢颣颤颥颦颧风飏飐飑飒飓飔飕飖飗飘飙飚飞飨餍饣饤饥饦饧饨饩饪饫饬饭饮饯饰饱饲饳饴饵饶饷饸饹饺饻饼饽饾饿',
        '馀馁馂馃馄馅馆馇馈馉馊馋馌馍馎馏馐馑馒馓馔馕马驭驮驯驰驱驲驳驴驵驶驷驸驹驺驻驼驽驾驿骀骁骂骃骄骅骆骇骈骉骊骋验骍骎骏骐骑骒骓骔骕',
        '骖骗骘骙骚骛骜骝骞骟骠骡骢骣骤骥骦骧髅髋髌鬓鬶魇魉鱼鱽鱾鱿鲀鲁鲂鲃鲄鲅鲆鲇鲈鲉鲊鲋鲌鲍鲎鲏鲐鲑鲒鲓鲔鲕鲖鲗鲘鲙鲚鲛鲜鲝鲞鲟鲠鲡鲢',
        '鲣鲤鲥鲦鲧鲨鲩鲪鲫鲬鲭鲮鲯鲰鲱鲲鲳鲴鲵鲶鲷鲸鲹鲺鲻鲼鲽鲾鲿鳀鳁鳂鳃鳄鳅鳆鳇鳈鳉鳊鳋鳌鳍鳎鳏鳐鳑鳒鳓鳔鳕鳖鳗鳘鳙鳚鳛鳜鳝鳞鳟鳠鳡鳢',
        '鳣鳤鸟鸠鸡鸢鸣鸤鸥鸦鸧鸨鸩鸪鸫鸬鸭鸮鸯鸰鸱鸲鸳鸴鸵鸶鸷鸸鸹鸺鸻鸼鸽鸾鸿鹀鹁鹂鹃鹄鹅鹆鹇鹈鹉鹊鹋鹌鹍鹎鹏鹐鹑鹒鹓鹔鹕鹖鹗鹘鹙鹚鹛鹜',
        '鹝鹞鹟鹠鹡鹢鹣鹤鹥鹦鹧鹨鹩鹪鹫鹬鹭鹮鹯鹰鹱鹲鹳鹴鹾麦麸麹麺黄黉黡黩黪黾鼋鼌鼍鼹齐齑齿龀龁龂龃龄龅龆龇龈龉龊龋龌龙龚龛龟鿎鿏鿒鿔',
    ].join('');
    const TRADITIONAL_ONLY_CHARS = [
        '㑮㑯㑳㑶㒓㓄㓨㔋㖮㗲㗿㘉㘓㘔㘚㛝㜄㜏㜐㜗㜢㜷㞞㟺㠏㠣㢗㢝㥮㦎㦛㦞㨻㩋㩜㩳㩵㪎㯤㰙㵗㵾㶆㷍㷿㸇㹽㺏㺜㻶㿖㿗㿧䀉䀹䁪䁻䂎䃮䅐䅳䆉䉑䉙',
        '䉬䉲䉶䊭䊷䊺䋃䋔䋙䋚䋦䋹䋻䋼䋿䌈䌋䌖䌝䌟䌥䌰䍤䍦䍽䎙䎱䓣䕤䕳䖅䗅䗿䙔䙡䙱䚩䛄䛳䜀䜖䝭䝻䝼䞈䞋䞓䟃䟆䟐䠆䠱䡐䡩䡵䢨䤤䥄䥇䥑䥕䥗䥩䥯',
        '䥱䦘䦛䦟䦯䦳䧢䪊䪏䪗䪘䪴䪾䫀䫂䫟䫴䫶䫻䫾䬓䬘䬝䬞䬧䭀䭃䭑䭔䭿䮄䮝䮞䮠䮫䮰䮳䮾䯀䯤䰾䱀䱁䱙䱧䱬䱰䱷䱸䱽䲁䲅䲖䲘䲰䳜䳢䳤䳧䳫䴉䴋䴬䴱',
        '䴴䴽䵳䵴䶕䶲丟並亂亙亞佇佈佔併來侖侶侷俁係俓俔俠俥俬倀倆倈倉個們倖倫倲偉偑側偵偽傌傑傖傘備傢傭傯傳傴債傷傾僂僅僉僑僕僞僤僥僨僱價',
        '儀儁儂億儈儉儎儐儔儕儘償儣優儭儲儷儸儺儻儼兇兌兒兗內兩冊冑冪凈凍凙凜凱別刪剄則剋剎剗剛剝剮剴創剷剾劃劇劉劊劌劍劏劑劚勁勑動務勛勝',
        '勞勢勣勩勱勳勵勸勻匭匯匱區協卹卻卽厙厠厤厭厲厴參叄叢吳吶呂咼員哯唄唓唸問啓啞啟啢喎喚喪喫喬單喲嗆嗇嗊嗎嗚嗩嗰嗶嗹嘆嘍嘓嘔嘖嘗嘜嘩',
        '嘪嘮嘯嘰嘳嘵嘸嘺嘽噁噅噓噚噝噞噠噥噦噯噲噴噸噹嚀嚇嚌嚐嚕嚙嚛嚥嚦嚧嚨嚮嚲嚳嚴嚶嚽囀囁囂囃囅囈囉囌囑囒囪圇國圍園圓圖團圞垻埡埨埬埰',
        '執堅堊堖堚堝堯報場塊塋塏塒塗塚塢塤塵塸塹塿墊墜墠墮墰墲墳墶墻墾壇壈壋壎壓壗壘壙壚壜壞壟壠壢壣壩壪壯壺壼壽夠夢夥夾奐奧奩奪奬奮奼妝',
        '姍姦娙娛婁婡婦婭媈媧媯媰媼媽嫋嫗嫵嫺嫻嫿嬀嬃嬇嬈嬋嬌嬙嬡嬣嬤嬦嬪嬰嬸嬻孃孄孆孇孋孌孎孫學孻孾孿宮寀寠寢實寧審寫寬寵寶將專尋對導尷',
        '屆屍屓屜屢層屨屩屬岡峯峴島峽崍崑崗崙崢崬嵐嵗嵼嵽嵾嶁嶄嶇嶈嶔嶗嶘嶠嶢嶧嶨嶮嶸嶹嶺嶼嶽巊巋巒巔巖巗巘巰巹帥師帳帶幀幃幓幗幘幝幟幣幩',
        '幫幬幹幾庫廁廂廄廈廎廕廚廝廞廟廠廡廢廣廧廩廬廳弒弔弳張強彃彄彆彈彌彎彔彙彠彥彫彲彿後徑從徠復徹徿恆恥悅悞悵悶悽惡惱惲惻愛愜愨愴愷',
        '愻愾慄態慍慘慚慟慣慤慪慫慮慳慶慺慼慾憂憊憐憑憒憖憚憢憤憫憮憲憶憸憹懀懇應懌懍懎懞懟懣懤懨懲懶懷懸懺懼懾戀戇戔戧戩戰戱戲戶抬拋挩挱',
        '挾捨捫捱捲掃掄掆掗掙掚掛採揀揚換揮揯損搖搗搵搶摋摐摑摜摟摯摳摶摺摻撈撊撏撐撓撝撟撣撥撧撫撲撳撻撾撿擁擄擇擊擋擓擔據擟擠擣擫擬擯擰',
        '擱擲擴擷擺擻擼擽擾攄攆攋攏攔攖攙攛攜攝攢攣攤攪攬敎敓敗敘敵數斂斃斅斆斕斬斷斸旂旣時晉晛晝暈暉暐暘暢暫曄曆曇曉曊曏曖曠曥曨曬書會朥',
        '朧朮東枴柵柺査桱桿梔梖梘梜條梟梲棄棊棖棗棟棡棧棲棶椏椲楇楊楓楨業極榘榦榪榮榲榿構槍槓槤槧槨槫槮槳槶槼樁樂樅樑樓標樞樠樢樣樤樧樫樳',
        '樸樹樺樿橈橋機橢橫橯檁檉檔檜檟檢檣檭檮檯檳檵檸檻櫃櫅櫍櫓櫚櫛櫝櫞櫟櫠櫥櫧櫨櫪櫫櫬櫱櫳櫸櫻欄欅欇權欍欏欐欑欒欓欖欘欞欽歎歐歟歡歲歷',
        '歸歿殘殞殢殤殨殫殭殮殯殰殲殺殻殼毀毆毊毿氂氈氌氣氫氬氭氳氾汎汙決沒沖況泝洩洶浹浿涇涗涼淒淚淥淨淩淪淵淶淺渙減渢渦測渾湊湋湞湧湯溈',
        '準溝溡溫溮溳溼滄滅滌滎滙滬滯滲滷滸滻滾滿漁漊漍漚漢漣漬漲漵漸漿潀潁潑潔潕潙潚潛潣潤潯潰潷潿澀澅澆澇澐澗澠澤澦澩澫澬澮澱澾濁濃濄濆',
        '濕濘濚濜濟濤濧濫濰濱濺濼濾濿瀂瀃瀅瀆瀇瀉瀋瀏瀕瀘瀝瀟瀠瀦瀧瀨瀰瀲瀾灃灄灍灑灒灕灘灙灝灡灣灤灧灩災為烏烴無煇煉煒煙煢煥煩煬煱熂熅熉',
        '熌熒熓熗熚熡熰熱熲熾燀燁燈燉燒燖燙燜營燦燬燭燴燶燻燼燾爃爄爇爍爐爖爛爥爧爭爲爺爾牀牆牘牽犖犛犞犢犧狀狹狽猌猙猶猻獁獃獄獅獊獎獨獩',
        '獪獫獮獰獱獲獵獷獸獺獻獼玀玁珼現琱琺琿瑋瑒瑣瑤瑩瑪瑲瑻瑽璉璊璕璗璝璡璣璦璫璯環璵璸璼璽璾璿瓄瓅瓊瓏瓔瓕瓚瓛甌甕產産甦甯畝畢畫異畵',
        '當畼疇疊痙痠痮痺痾瘂瘋瘍瘓瘞瘡瘧瘮瘱瘲瘺瘻療癆癇癉癐癒癘癟癡癢癤癥癧癩癬癭癮癰癱癲發皁皚皟皰皸皺盃盜盞盡監盤盧盨盪眝眞眥眾睍睏睜',
        '睞睪瞘瞜瞞瞤瞶瞼矇矉矑矓矚矯硃硜硤硨硯碕碙碩碭碸確碼碽磑磚磠磣磧磯磽磾礄礆礎礐礒礙礦礪礫礬礮礱祕祿禍禎禕禡禦禪禮禰禱禿秈稅稈稏稜',
        '稟種稱穀穇穌積穎穠穡穢穩穫穭窩窪窮窯窵窶窺竄竅竇竈竊竚竪竱競筆筍筧筴箇箋箏節範築篋篔篘篠篢篤篩篳篸簀簂簍簑簞簡簢簣簫簷簹簽簾籃籅',
        '籋籌籔籙籛籜籟籠籤籩籪籬籮籲粵糉糝糞糧糰糲糴糶糹糺糾紀紂紃約紅紆紇紈紉紋納紐紓純紕紖紗紘紙級紛紜紝紞紟紡紬紮細紱紲紳紵紹紺紼紿絀',
        '絁終絃組絅絆絍絎結絕絙絛絝絞絡絢絥給絧絨絪絰統絲絳絶絹絺綀綁綃綄綆綇綈綉綋綌綎綏綐綑經綖綜綝綞綟綠綡綢綣綧綪綫綬維綯綰綱網綳綴綵',
        '綸綹綺綻綽綾綿緄緇緊緋緍緑緒緓緔緗緘緙線緝緞緟締緡緣緤緦編緩緬緮緯緰緱緲練緶緷緸緹緻縈縉縊縋縍縎縐縑縕縗縛縝縞縟縣縧縫縬縭縮縯縰',
        '縱縲縳縴縵縶縷縸縹縺總績繂繃繅繆繈繏繐繒繓織繕繚繞繟繡繢繨繩繪繫繬繭繮繯繰繳繶繷繸繹繻繼繽繾繿纁纆纇纈纊續纍纏纓纔纕纖纗纘纚纜缽',
        '罃罈罌罎罰罵罷羅羆羈羋羣羥羨義羵羶習翫翬翹翽耬耮聖聞聯聰聲聳聵聶職聹聻聽聾肅脅脈脛脣脥脩脫脹腎腖腡腦腪腫腳腸膃膕膚膞膠膢膩膹膽膾',
        '膿臉臍臏臗臘臚臟臠臢臥臨臺與興舉舊舘艙艣艤艦艫艱艷芻茲荊莊莖莢莧菕華菴菸萇萊萬萴萵葉葒葝葤葦葯葷蒍蒐蒓蒔蒕蒞蒭蒼蓀蓆蓋蓧蓮蓯蓴蓽',
        '蔄蔔蔘蔞蔣蔥蔦蔭蔯蔿蕁蕆蕎蕒蕓蕕蕘蕝蕢蕩蕪蕭蕳蕷蕽薀薆薈薊薌薑薔薘薟薦薩薳薴薵薺藍藎藝藥藪藭藶藷藹藺蘀蘄蘆蘇蘊蘋蘚蘞蘟蘢蘭蘺蘿虆',
        '虉處虛虜號虧虯蛺蛻蜆蝀蝕蝟蝦蝨蝸螄螞螢螮螻螿蟂蟄蟈蟎蟘蟜蟣蟬蟯蟲蟳蟶蟻蠀蠁蠅蠆蠍蠐蠑蠔蠙蠟蠣蠦蠨蠱蠶蠻蠾衆衊術衕衚衛衝袞裊裏補裝',
        '裡製複褌褘褲褳褸褻襀襇襉襏襓襖襗襘襝襠襤襪襬襯襰襲襴襵覈見覎規覓視覘覛覡覥覦親覬覯覲覷覹覺覼覽覿觀觴觶觸訁訂訃計訊訌討訏訐訑訒訓',
        '訕訖託記訛訜訝訞訟訢訣訥訨訩訪設許訴訶診註証詀詁詆詊詎詐詑詒詓詔評詖詗詘詛詝詞詠詡詢詣試詩詪詫詬詭詮詰話該詳詵詷詼詿誂誄誅誆誇誋',
        '誌認誑誒誕誘誚語誠誡誣誤誥誦誨說誫説誰課誳誴誶誷誹誺誼誾調諂諄談諉請諍諏諑諒諓論諗諛諜諝諞諟諡諢諣諤諥諦諧諫諭諮諯諰諱諲諳諴諶諷',
        '諸諺諼諾謀謁謂謄謅謆謉謊謎謏謐謔謖謗謙謚講謝謠謡謨謫謬謭謯謱謳謸謹謾譁譂譅譆證譊譎譏譑譓譖識譙譚譜譞譟譨譫譭譯議譴護譸譽譾讀讅變',
        '讋讌讎讒讓讕讖讚讜讞豈豎豐豔豬豵豶貓貗貙貝貞貟負財貢貧貨販貪貫責貯貰貲貳貴貶買貸貺費貼貽貿賀賁賂賃賄賅資賈賊賑賒賓賕賙賚賜賝賞賟',
        '賠賡賢賣賤賦賧質賫賬賭賰賴賵賺賻購賽賾贃贄贅贇贈贉贊贋贍贏贐贑贓贔贖贗贚贛贜赬趕趙趨趲跡踐踰踴蹌蹔蹕蹟蹠蹣蹤蹳蹺蹻躂躉躊躋躍躎躑',
        '躒躓躕躘躚躝躡躥躦躪軀軉車軋軌軍軏軑軒軔軕軗軛軜軝軟軤軨軫軬軲軷軸軹軺軻軼軾軿較輄輅輇輈載輊輋輒輓輔輕輖輗輛輜輝輞輟輢輥輦輨輩輪',
        '輬輮輯輳輶輷輸輻輾輿轀轂轄轅轆轇轉轊轍轎轐轔轗轟轠轡轢轣轤辦辭辮辯農迴逕這連週進遊運過達違遙遜遞遠遡適遱遲遷選遺遼邁還邇邊邏邐郟',
        '郵鄆鄉鄒鄔鄖鄟鄧鄩鄭鄰鄲鄳鄴鄶鄺酇酈醃醜醞醟醣醫醬醱醲醶釀釁釃釅釋釐釒釓釔釕釗釘釙釚針釟釣釤釦釧釨釩釲釳釴釵釷釹釺釾釿鈀鈁鈃鈄鈅',
        '鈆鈇鈈鈉鈋鈍鈎鈐鈑鈒鈔鈕鈖鈗鈛鈞鈠鈡鈣鈥鈦鈧鈮鈯鈰鈲鈳鈴鈷鈸鈹鈺鈽鈾鈿鉀鉁鉅鉆鉈鉉鉊鉋鉍鉑鉔鉕鉗鉚鉛鉝鉞鉠鉢鉤鉥鉦鉧鉬鉭鉮鉳鉶鉷',
        '鉸鉺鉻鉽鉾鉿銀銁銂銃銅銈銊銍銏銑銓銖銘銚銛銜銠銣銥銦銨銩銪銫銬銱銳銶銷銹銻銼鋁鋂鋃鋅鋇鋉鋌鋏鋐鋒鋗鋙鋝鋟鋠鋣鋤鋥鋦鋨鋩鋪鋭鋮鋯鋰',
        '鋱鋶鋸鋹鋼錀錁錂錄錆錇錈錏錐錒錕錘錙錚錛錜錝錞錟錠錡錢錤錥錦錨錩錫錮錯録錳錶錸錼錽鍀鍁鍃鍄鍅鍆鍇鍈鍉鍊鍋鍍鍒鍔鍘鍚鍛鍠鍤鍥鍩鍬鍭',
        '鍮鍰鍵鍶鍺鍼鍾鎂鎄鎇鎈鎊鎌鎍鎓鎔鎖鎘鎙鎚鎛鎝鎞鎡鎢鎣鎦鎧鎩鎪鎬鎭鎮鎯鎰鎲鎳鎵鎶鎷鎸鎿鏃鏆鏇鏈鏉鏌鏍鏏鏐鏑鏗鏘鏚鏜鏝鏞鏟鏡鏢鏤鏥鏦',
        '鏨鏰鏵鏷鏹鏺鏻鏽鏾鐃鐄鐇鐈鐋鐍鐎鐏鐐鐒鐓鐔鐘鐙鐝鐠鐥鐦鐧鐨鐩鐪鐫鐮鐯鐲鐳鐵鐶鐸鐺鐼鐽鐿鑀鑄鑉鑊鑌鑑鑒鑔鑕鑞鑠鑣鑥鑪鑭鑰鑱鑲鑴鑷鑹',
        '鑼鑽鑾鑿钁钂長門閂閃閆閈閉開閌閍閎閏閐閑閒間閔閗閘閝閞閡閣閤閥閨閩閫閬閭閱閲閵閶閹閻閼閽閾閿闃闆闇闈闉闊闋闌闍闐闑闒闓闔闕闖關闞',
        '闠闡闢闤闥陘陝陞陣陰陳陸陽隉隊階隑隕際隤隨險隮隯隱隴隸隻雋雖雙雛雜雞離難雲電霑霢霣霧霼霽靂靄靆靈靉靚靜靝靦靧靨鞏鞝鞦鞽鞾韁韃韆韉',
        '韋韌韍韓韙韚韛韜韝韞韠韻響頁頂頃項順頇須頊頌頍頎頏預頑頒頓頔頗領頜頠頡頤頦頫頭頮頰頲頴頵頷頸頹頻頽顂顃顅顆題額顎顏顒顓顔顗願顙顛',
        '類顢顣顥顧顫顬顯顰顱顳顴風颭颮颯颰颱颳颶颷颸颺颻颼颾飀飄飆飈飋飛飠飢飣飥飦飩飪飫飭飯飱飲飴飵飶飼飽飾飿餃餄餅餈餉養餌餎餏餑餒餓餔',
        '餕餖餗餘餚餛餜餞餡餦餧館餪餫餬餭餱餳餵餶餷餸餺餼餾餿饁饃饅饈饉饊饋饌饑饒饗饘饜饞饟饠饢馬馭馮馯馱馳馴馹馼駁駃駉駊駎駐駑駒駓駔駕駘',
        '駙駚駛駝駞駟駡駢駤駧駩駪駫駭駰駱駶駸駻駼駿騁騂騃騄騅騉騊騌騍騎騏騑騔騖騙騚騜騝騞騟騠騤騧騪騫騭騮騰騱騴騵騶騷騸騻騼騾驀驁驂驃驄驅',
        '驊驋驌驍驎驏驓驕驗驙驚驛驟驢驤驥驦驨驪驫骯髏髒體髕髖髮鬆鬍鬖鬚鬠鬢鬥鬧鬨鬩鬮鬱鬹魎魘魚魛魟魢魥魦魨魯魴魵魷魺魽鮀鮁鮃鮄鮅鮆鮈鮊鮋',
        '鮍鮎鮐鮑鮒鮓鮚鮜鮝鮞鮟鮠鮡鮣鮤鮦鮪鮫鮭鮮鮯鮰鮳鮵鮶鮸鮺鮿鯀鯁鯄鯆鯇鯉鯊鯒鯔鯕鯖鯗鯛鯝鯞鯡鯢鯤鯧鯨鯪鯫鯬鯰鯱鯴鯶鯷鯻鯽鯾鯿鰁鰂鰃鰆',
        '鰈鰉鰊鰋鰌鰍鰏鰐鰑鰒鰓鰕鰛鰜鰟鰠鰣鰤鰥鰦鰧鰨鰩鰫鰭鰮鰱鰲鰳鰵鰶鰷鰹鰺鰻鰼鰽鰾鱀鱂鱄鱅鱆鱇鱈鱉鱊鱒鱔鱖鱗鱘鱚鱝鱟鱠鱢鱣鱤鱧鱨鱭鱮鱯',
        '鱲鱷鱸鱺鳥鳧鳩鳬鳲鳳鳴鳶鳷鳼鳽鳾鴀鴃鴅鴆鴇鴉鴐鴒鴔鴕鴗鴛鴜鴝鴞鴟鴣鴥鴦鴨鴮鴯鴰鴲鴳鴴鴷鴻鴽鴿鵁鵂鵃鵊鵏鵐鵑鵒鵓鵚鵜鵝鵟鵠鵡鵧鵩鵪',
        '鵫鵬鵮鵯鵰鵲鵷鵾鶄鶇鶉鶊鶌鶒鶓鶖鶗鶘鶚鶠鶡鶥鶦鶩鶪鶬鶭鶯鶰鶱鶲鶴鶹鶺鶻鶼鶿鷀鷁鷂鷄鷅鷉鷊鷐鷓鷔鷖鷗鷙鷚鷟鷣鷤鷥鷦鷨鷩鷫鷭鷯鷲鷳鷴',
        '鷷鷸鷹鷺鷽鷿鸂鸇鸊鸋鸌鸏鸑鸕鸗鸘鸚鸛鸝鸞鹵鹹鹺鹼鹽麗麥麨麩麪麫麬麯麲麳麴麵麷麼黃黌點黨黲黴黶黷黽黿鼂鼉鼕鼴齊齋齎齏齒齔齕齗齘齙齜',
        '齟齠齡齣齦齧齩齪齬齭齮齯齰齲齴齶齷齼齾龍龎龐龑龓龔龕龜龭龯鿁鿓',
    ].join('');
    // </generated:detection-chars>

    // 偵測字表轉換成「字碼（charCode）」的 Set，在第一次需要轉換時才建立（見 ensureConverterReady）
    // 設計意圖：
    // - 腳本跑在所有網站上，但只有白名單頁面或使用者手動觸發時才需要偵測，延遲建立可省下約 6,000 次 Set 插入。
    // - 逐字比對時用 charCodeAt() 取得數字，不會像 text[i] 那樣為每個中文字配置一個新字串，
    //   也不像 regex match(/g) 會建立整個比對結果陣列。
    let simplifiedOnlyCodes = null;
    let traditionalOnlyCodes = null;
    const toCharCodeSet = chars => new Set(Array.from(chars, ch => ch.charCodeAt(0)));

    // 快速判斷是否含有中文字（涵蓋 CJK 擴充 A、基本區與相容字區，與偵測字表的產生範圍一致；
    // regex 字面值提到函式外，不加 g 旗標以免 test() 受 lastIndex 狀態影響）
    const CJK_CHAR_REGEX = /[\u3400-\u9fff\uf900-\ufaff]/;

    // 檢測文本是否主要為簡體中文
    // 判定條件：簡體專用字數量 >= 繁體專用字數量，且至少有 MIN_SIMPLIFIED_CHAR_COUNT 個簡體專用字。
    // 刻意維持 >=（平手也轉換）：字表已排除繁簡共用字，平手幾乎只會出現在真正繁簡混雜的文字，
    // 改成 > 反而會讓「簡體短句夾一個繁體字」這類內容漏轉。
    function isSimplifiedChinese(text) {
        let simplifiedCount = 0;
        let traditionalCount = 0;
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i);
            // 英數、標點等非中文字元直接跳過，不必查 Set（0x3400 是 CJK 擴充 A 的起點）
            if (code < 0x3400) {
                continue;
            }
            if (simplifiedOnlyCodes.has(code)) {
                simplifiedCount++;
            } else if (traditionalOnlyCodes.has(code)) {
                traditionalCount++;
            }
        }
        return simplifiedCount >= MIN_SIMPLIFIED_CHAR_COUNT && simplifiedCount >= traditionalCount;
    }

    // ===== 詞庫對照表（套用在 OpenCC 轉換「之後」的文字上）=====
    // 設計意圖：
    // - 只套用在「確實由簡體轉換而來」的文字，已經是繁體的內容不會被詞庫改動
    //   （避免把「演算法」再替換成「演演算法」這類循環問題，詳見 docs/prevent-term-loop.md）。
    // - OpenCC 的 tw2 設定會把「台」轉成「臺」（例如「台湾」→「臺灣」、「后台」→「後臺」），
    //   但臺灣日常書寫習慣用「台」（本腳本的說明文字也寫「台灣用語」），因此這裡統一改回「台」。
    //   若偏好教育部標準字「臺」，刪除這一行即可。
    const termMapping = {
        '臺': '台',
        // 修正簡繁轉換的錯誤
        // TODO: 干 => 乾, 幹
    };

    // ===== OpenCC 轉換器、偵測字表與詞庫正規表達式（延遲建立，只建立一次）=====
    // 設計意圖：建立轉換器約需數十毫秒，非白名單頁面在使用者手動觸發之前完全不需要它，
    // 所以等到第一次真正要轉換時才建立。
    let converter = null;
    let termRegex = null;

    function ensureConverterReady() {
        if (converter) {
            return;
        }
        simplifiedOnlyCodes = toCharCodeSet(SIMPLIFIED_ONLY_CHARS);
        traditionalOnlyCodes = toCharCodeSet(TRADITIONAL_ONLY_CHARS);
        converter = OpenCC.Converter({ from: 'cn', to: 'tw2' });
        termRegex = buildTermRegex();
    }

    function buildTermRegex() {
        // 過濾掉來源與目標相同的無效規則（例如 '索引': '索引'），只保留真正需要替換的詞
        const sourceTerms = Object.keys(termMapping).filter(source => termMapping[source] !== source);

        // 若沒有任何可替換詞彙，避免建立空正規表達式（會匹配每個字元間隙）
        if (sourceTerms.length === 0) {
            return null;
        }

        // 按照詞語長度從長到短排序，讓長詞優先匹配，避免短詞先吃掉長詞的一部分
        const pattern = sourceTerms
            .sort((a, b) => b.length - a.length)
            .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // 轉義特殊字元
            .join('|');

        // 建立一個大的正規表達式，一次匹配所有詞彙
        return new RegExp(pattern, 'g');
    }

    // 轉換文本：簡體轉繁體 + 詞彙替換
    function convertText(text) {
        if (!converter || !text || !CJK_CHAR_REGEX.test(text)) {
            return text;
        }

        // 先檢測是否為簡體中文；不是就原樣返回，保護繁體原文不被 OpenCC 的詞組轉換改動
        if (!isSimplifiedChinese(text)) {
            return text;
        }

        const convertedText = converter(text);

        // OpenCC 沒有改動任何字，代表其實沒有需要轉換的簡體字，詞庫也不套用
        if (convertedText === text) {
            return text;
        }

        // replace 只掃描一次，替換後的結果不會被同一次 replace 再匹配，所以不會產生連鎖替換
        return termRegex
            ? convertedText.replace(termRegex, match => termMapping[match])
            : convertedText;
    }

    // ===== 排除規則 =====

    // 額外不轉換的選擇器清單（例如其他腳本建立的浮動視窗）
    const excludedSelectors = [
        'div#gemini-qna-overlay',
    ];

    // 可編輯區域：使用者正在編輯的內容不應該被改寫
    // （否則在 .cn 網站的編輯器輸入簡體字，馬上就會被換成繁體，游標還可能跳位）。
    // 注意：刻意用屬性選擇器判斷，而不是 element.isContentEditable ——
    // Chromium 讀取 isContentEditable 會強制更新樣式（style recalc），在剛改過文字、
    // 又要走訪大量節點的情況下，每個元素都會觸發一次，效能會非常差。
    const CONTENT_EDITABLE_SELECTOR = '[contenteditable]:not([contenteditable="false"])';

    // 在啟動時把所有選擇器合併成單一字串，並且「只驗證一次」，
    // 取代舊版「每個元素 × 每個選擇器都 try/catch matches()」的做法（無效選擇器還會在每個元素上重複噴警告）
    const EXCLUDED_SELECTOR = [...excludedSelectors, CONTENT_EDITABLE_SELECTOR]
        .filter(selector => {
            try {
                document.createDocumentFragment().querySelector(selector);
                return true;
            } catch (e) {
                console.warn(`[簡轉繁] 無效的選擇器，已忽略: ${selector}`, e);
                return false;
            }
        })
        .join(',');

    // 整個子樹（包含元素本身的屬性）都不處理的標籤
    // 使用 localName 比對：HTML 與 SVG 元素的 localName 都是小寫（tagName 在 SVG 中是小寫、HTML 中是大寫，不一致）
    const EXCLUDED_TAGS = new Set(['style', 'script', 'noscript', 'iframe', 'object']);

    // 表單控制項：只轉換它們「看得到的屬性」（placeholder、title），但絕不碰它們的內容 ——
    // <textarea> 裡的文字就是表單值；<option> 沒有 value 屬性時，顯示文字就是送出的值，改了會影響表單送出的資料
    const FORM_CONTROL_TAGS = new Set(['input', 'textarea', 'select']);

    // 檢查元素本身是否應該被排除（連同整個子樹）
    function isExcludedElement(el) {
        const tag = el.localName;
        if (EXCLUDED_TAGS.has(tag)) {
            return true;
        }
        // 沿用舊版規則：帶有任何屬性的 <code>（通常是語法高亮區塊，如 class="language-js"）不轉換，
        // 沒有屬性的行內 <code> 則照常轉換
        if (tag === 'code' && el.attributes.length > 0) {
            return true;
        }
        return el.matches(EXCLUDED_SELECTOR);
    }

    // 檢查節點是否位於排除區域「內部」（從父元素開始往上找整條祖先鏈）
    // 設計意圖：MutationObserver 回報的新增節點，可能是排除區域裡面的子孫節點
    // （例如 Gemini 浮動視窗串流進來的文字、編輯器裡剛輸入的字）。
    // 舊版只檢查節點本身，導致這些內容仍會被轉換。
    function isInsideExcludedRegion(node) {
        for (let el = node.parentElement; el; el = el.parentElement) {
            if (FORM_CONTROL_TAGS.has(el.localName) || isExcludedElement(el)) {
                return true;
            }
        }
        return false;
    }

    // ===== 屬性轉換（白名單）=====
    // 設計意圖：
    // 舊版採「黑名單」：每個元素的每個屬性都要跑 toLowerCase、10 次 startsWith 再加上 convertText，
    // 而且所有 data-* 都會被轉換；若網站把中文 data 值當成程式裡的狀態或查詢 key，就可能壞掉。
    // 真正需要轉換的只有「使用者看得到」的少數屬性，所以改成白名單：
    // - title：滑鼠懸停提示
    // - alt：圖片無法載入時顯示的替代文字
    // - placeholder：輸入框的提示文字
    // - data-title / data-tooltip / data-original-title：常見 tooltip 套件（如 Bootstrap）用來顯示提示文字的屬性
    // 刻意「不」轉換 aria-label：它不會顯示在畫面上，但網站程式與其他 userscript 常用
    // [aria-label="..."] 當選擇器，改寫後反而容易讓其他功能失效（與舊版行為一致）。
    // 這份清單同時作為 MutationObserver 的 attributeFilter，讓瀏覽器原生濾掉 class、style 等高頻變動。
    const CONVERTIBLE_ATTRIBUTES = ['title', 'alt', 'placeholder', 'data-title', 'data-tooltip', 'data-original-title'];
    const CONVERTIBLE_ATTRIBUTE_SET = new Set(CONVERTIBLE_ATTRIBUTES);

    // 轉換元素的白名單屬性值
    // 走訪 el.attributes（多數元素只有 0~3 個屬性），比對白名單 Set，比逐一呼叫 getAttribute() 更省
    function convertElementAttributes(el) {
        const attrs = el.attributes;
        for (let i = 0; i < attrs.length; i++) {
            const attr = attrs[i];
            if (!CONVERTIBLE_ATTRIBUTE_SET.has(attr.name)) {
                continue;
            }
            const value = attr.value;
            const convertedValue = convertText(value);
            if (convertedValue !== value) {
                attr.value = convertedValue;
            }
        }
    }

    // ===== 文字節點轉換 =====

    // 記錄每個文字節點「上次處理後的內容」
    // 設計意圖（取代舊版的 WeakSet convertedNodes）：
    // - 舊版只要節點轉換過一次就永遠跳過，但 React、Vue 常「就地」更新同一個文字節點
    //   （例如「加载中」→「加载完成」），第二次出現的簡體字就不會被轉換。
    // - 改成記錄「處理後的值」：只有目前內容和記錄值相同時才跳過（代表內容沒變過，或正是我們自己寫入的值），
    //   一旦內容被網站改掉，就會重新轉換。已經是繁體的「演算法」也不會被重複處理成「演演算法」。
    // - WeakMap 以節點為 key，節點被移除並回收後記錄會自動消失，不會造成記憶體洩漏。
    const processedTextValues = new WeakMap();

    function convertTextNode(node) {
        const text = node.nodeValue;
        if (processedTextValues.get(node) === text) {
            return;
        }

        // 純空白或不含中文的節點（佔頁面文字節點的大多數）直接略過；
        // 不再先呼叫 trim()，避免為每個空白文字節點都配置一個新字串
        if (!text || !CJK_CHAR_REGEX.test(text)) {
            return;
        }

        const convertedText = convertText(text);
        if (convertedText !== text) {
            node.nodeValue = convertedText;
        }
        processedTextValues.set(node, convertedText);
    }

    // ===== DOM 走訪 =====

    // TreeWalker 過濾器
    // 設計意圖：用原生 TreeWalker 取代舊版的遞迴 + childNodes，速度更快，也不會有遞迴深度的問題。
    // 回傳 FILTER_REJECT 會連同整個子樹一起跳過，所以排除區域只需要在入口判斷一次。
    const walkerFilter = {
        acceptNode(node) {
            // 表單控制項本身會被走訪（轉換 placeholder/title），但它的子孫（textarea 文字、option）一律不處理
            const parent = node.parentNode;
            if (parent && FORM_CONTROL_TAGS.has(parent.localName)) {
                return NodeFilter.FILTER_REJECT;
            }
            if (node.nodeType === Node.ELEMENT_NODE && isExcludedElement(node)) {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        },
    };

    // 轉換某個節點與其整個子樹（文字節點 + 白名單屬性）
    function convertSubtree(root) {
        // 已從 DOM 移除的節點不需要處理（例如新增後馬上又被網站移除）
        if (!root.isConnected) {
            return;
        }

        if (root.nodeType === Node.TEXT_NODE) {
            if (!isInsideExcludedRegion(root)) {
                convertTextNode(root);
            }
            return;
        }

        if (root.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        if (isExcludedElement(root) || isInsideExcludedRegion(root)) {
            return;
        }

        convertElementAttributes(root);
        if (FORM_CONTROL_TAGS.has(root.localName)) {
            return;
        }

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, walkerFilter);
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeType === Node.TEXT_NODE) {
                convertTextNode(node);
            } else {
                convertElementAttributes(node);
            }
        }
    }

    /**
     * 整頁簡繁轉換（包含 <head> 裡的 <title> 與 <body> 的所有內容）。
     * 設計意圖：
     * 1. 提供全域統一的整頁轉換入口，供自動轉換啟動、選單命令與鍵盤快捷鍵呼叫。
     * 2. 從 document.documentElement 開始走訪，頁面標題的文字節點就和其他文字一樣被處理，
     *    不需要再對 document.title 寫特例。
     * 3. 已處理且內容未變的文字節點會透過 processedTextValues 快速略過，重複呼叫的成本很低。
     */
    function convertPage() {
        ensureConverterReady();
        convertSubtree(document.documentElement);

        // 觀察器運作中時，丟棄這次整頁轉換自己產生的 mutation 紀錄（整頁剛走訪過，不需要再處理一次）
        if (isAutoConverting) {
            observer.takeRecords();
        }
    }

    // ===== 自動轉換（MutationObserver）=====

    // 觀察 document.documentElement（而不是只觀察 body）
    // 設計意圖：這樣 <head> 裡的 <title> 變動也一併涵蓋，取代舊版獨立的標題觀察器
    // （舊版只處理 childList、漏掉 characterData，而且 <title> 若是之後才建立或被整個替換，就會失去追蹤）。
    const OBSERVER_OPTIONS = {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        // 只讓瀏覽器回報白名單屬性的變動，class、style 等高頻變動在瀏覽器端就被濾掉，根本不會進入回呼。
        // 舊版沒有設定這個選項：動畫或輪播每一幀改 style 都會觸發回呼並重設防抖計時器，
        // 計時器一直被往後推，新內容就永遠不會被轉換。
        attributeFilter: CONVERTIBLE_ATTRIBUTES,
    };

    let isAutoConverting = false;

    // 待處理的節點：新增的節點，以及內容被改動的文字節點（需要走訪整個子樹）
    const pendingNodes = new Set();
    // 只有白名單屬性變動的元素：只需要重轉屬性，不必走訪它的整個子樹
    const pendingAttributeElements = new Set();

    let deferredFlushTimer = null;
    let syncFlushBudget = MAX_SYNC_FLUSHES_PER_TASK;
    let isBudgetResetScheduled = false;

    const observer = new MutationObserver(handleMutations);

    function handleMutations(records) {
        // GitHub ID 白名單會隨 SPA 換頁改變；換頁後若不再符合，checkRouteChange() 會停止自動轉換
        if (needsRouteWatch) {
            checkRouteChange();
        }
        if (!isAutoConverting) {
            return;
        }

        for (const record of records) {
            if (record.type === 'childList') {
                record.addedNodes.forEach(node => pendingNodes.add(node));
            } else if (record.type === 'characterData') {
                pendingNodes.add(record.target);
            } else if (record.type === 'attributes') {
                pendingAttributeElements.add(record.target);
            }
        }

        if (pendingNodes.size === 0 && pendingAttributeElements.size === 0) {
            return;
        }

        // 已經排定延後處理時，新的變動直接併入同一批，而且「不重設」計時器，
        // 確保最晚 MUTATION_DEFER_DELAY 毫秒內一定會處理（舊版每次回呼都重設計時器，會被持續的變動餓死）
        if (deferredFlushTimer !== null) {
            return;
        }

        if (takeSyncFlushBudget()) {
            flushPendingMutations();
        } else {
            deferredFlushTimer = setTimeout(flushPendingMutations, MUTATION_DEFER_DELAY);
        }
    }

    // 同步處理額度：每個 task 最多同步處理 MAX_SYNC_FLUSHES_PER_TASK 次
    // 設計意圖：用 setTimeout(0) 在下一個 task 重置額度。如果網頁與本腳本互相觸發 DOM 變動，
    // 兩邊的回呼會在 microtask 中一直連鎖執行、永遠不讓出主執行緒；額度用完就改為延後處理，強制打斷這個循環。
    function takeSyncFlushBudget() {
        if (!isBudgetResetScheduled) {
            isBudgetResetScheduled = true;
            setTimeout(() => {
                syncFlushBudget = MAX_SYNC_FLUSHES_PER_TASK;
                isBudgetResetScheduled = false;
            }, 0);
        }
        if (syncFlushBudget <= 0) {
            return false;
        }
        syncFlushBudget--;
        return true;
    }

    function flushPendingMutations() {
        deferredFlushTimer = null;
        if (!isAutoConverting) {
            return;
        }

        // 先取出再清空，避免處理過程中集合被修改而影響迭代
        const nodes = Array.from(pendingNodes);
        const attributeElements = Array.from(pendingAttributeElements);
        pendingNodes.clear();
        pendingAttributeElements.clear();

        for (const node of nodes) {
            convertSubtree(node);
        }
        for (const el of attributeElements) {
            if (el.isConnected && !isExcludedElement(el) && !isInsideExcludedRegion(el)) {
                convertElementAttributes(el);
            }
        }

        // 丟棄「自己改寫 DOM」所產生的 mutation 紀錄
        // 設計意圖（取代舊版的 isConverting 旗標）：MutationObserver 的回呼是非同步（microtask）送達的，
        // 舊版在同步轉換結束時就把旗標設回 false，等自己造成的紀錄送到時旗標早已失效，
        // 導致每次轉換之後都會再白跑一輪。takeRecords() 會直接清空佇列中還沒送達的紀錄。
        // 這裡清掉的只會是自己造成的紀錄：本函式從頭到尾同步執行，期間網頁的程式碼沒有機會改動 DOM。
        observer.takeRecords();
    }

    function startAutoConvert() {
        if (isAutoConverting) {
            return;
        }
        // 先整頁轉換再開始觀察，這次走訪造成的變動就不會被觀察器收到
        convertPage();
        observer.observe(document.documentElement, OBSERVER_OPTIONS);
        isAutoConverting = true;
        console.log('[簡轉繁] 已啟用自動轉換，開始監聽頁面變化...');
    }

    function stopAutoConvert() {
        if (!isAutoConverting) {
            return;
        }
        isAutoConverting = false;
        observer.disconnect();
        clearTimeout(deferredFlushTimer);
        deferredFlushTimer = null;
        pendingNodes.clear();
        pendingAttributeElements.clear();
        console.log('[簡轉繁] 目前頁面不在轉換清單中，已停止自動轉換');
    }

    // 使用者是否已在此分頁手動觸發過轉換（選單命令或 stt 快捷鍵）
    // 設計意圖：手動觸發代表使用者明確想看這個頁面的繁體版本，所以除了立即轉換，
    // 也會在這個分頁啟用自動轉換（觀察器），讓無限捲動、動態載入的內容同樣被轉換
    // （舊版在非白名單頁面只轉換當下的內容，之後載入的新內容仍是簡體）。
    // 這個狀態只存在記憶體中，重新整理頁面後就恢復成依白名單判斷。
    let manuallyEnabled = false;

    function applyAutoConvertState() {
        if (manuallyEnabled || shouldConvertPage()) {
            startAutoConvert();
        } else {
            stopAutoConvert();
        }
    }

    // ===== SPA 路由監聽（只用於 GitHub ID 白名單）=====
    // 設計意圖：
    // - 網域白名單只看 hostname，同網域的 SPA 換頁不會改變判斷結果；換頁後的新內容也本來就會被觀察器轉換。
    //   所以舊版「每次換頁延遲 300ms 再整頁轉換一次」純屬重工
    //   （hash 換頁還會同時觸發 popstate 與 hashchange，整頁轉換跑兩次）。
    // - 唯一會隨路徑改變的規則是 GitHub ID 白名單：GitHub 是 SPA，舊版只在載入時判斷一次，
    //   從首頁點進 duanyytop/... 不會啟動轉換，從 duanyytop/... 點到其他 owner 的 repo 卻會繼續轉換。
    //   因此只有在 GitHub 上才監聽路由，並在網址改變時重新判斷。
    const needsRouteWatch = isGitHubHost() && normalizedAllowedGitHubIds.size > 0;
    let lastUrl = window.location.href;

    // 網址有變才重新判斷；多個來源（history 覆寫、popstate、Navigation API、觀察器回呼）可能重複呼叫，這裡保證冪等
    function checkRouteChange() {
        if (window.location.href === lastUrl) {
            return;
        }
        lastUrl = window.location.href;
        applyAutoConvertState();
    }

    function initRouteWatch() {
        if (!needsRouteWatch) {
            return;
        }

        // SPA 用 pushState / replaceState 換頁時不會觸發任何事件，只能覆寫這兩個方法
        for (const method of ['pushState', 'replaceState']) {
            const original = history[method];
            history[method] = function (...args) {
                const result = original.apply(this, args);
                checkRouteChange();
                return result;
            };
        }

        // 瀏覽器上一頁、下一頁（只改 hash 不影響 GitHub owner 判斷，不需要另外監聽 hashchange）
        window.addEventListener('popstate', checkRouteChange);

        // Navigation API（Chromium 102+ 等）：currententrychange 在 pushState、replaceState、上一頁時都會觸發。
        // 它是事件而不是覆寫函式，即使 userscript manager 把腳本放在隔離環境（isolated world）執行、
        // 導致上面的 history 覆寫攔截不到網頁的呼叫，這裡仍然收得到
        if (window.navigation && typeof window.navigation.addEventListener === 'function') {
            window.navigation.addEventListener('currententrychange', checkRouteChange);
        }
    }

    // ===== 手動轉換（選單命令與 stt 快捷鍵）=====

    function triggerManualConversion(source) {
        manuallyEnabled = true;
        if (isAutoConverting) {
            // 已在自動轉換中：再整頁檢查一次（已處理且內容未變的節點會被快速略過）
            convertPage();
        } else {
            // 會先整頁轉換，再啟動觀察器
            startAutoConvert();
        }
        console.log(`[簡轉繁] ${source}觸發轉換完成`);
    }

    // ===== 鍵盤快捷鍵功能實作 (連續快速鍵入 "stt" 觸發簡繁轉換) =====
    // 已知限制：在把 's' 或 't' 當成單鍵快捷鍵的網站上（例如 GitHub：'s' 聚焦搜尋框、't' 開啟檔案搜尋），
    // 第一個 's' 就會被網站接手並把焦點移進輸入框，之後的 't' 會被判定為「正在輸入」而重置序列，
    // 所以 stt 在這類網站上無法觸發。若要攔截 's'，就得連帶封鎖網站原本的快捷鍵，代價太大，
    // 因此這類網站請改用 Tampermonkey 選單的「轉換此頁面」命令。

    // 按鍵輸入緩衝區與逾時重置計時器
    let keySequenceBuffer = '';
    let keySequenceTimer = null;

    function resetKeySequence() {
        keySequenceBuffer = '';
        if (keySequenceTimer) {
            clearTimeout(keySequenceTimer);
            keySequenceTimer = null;
        }
    }

    // 不支援 composedPath() 的舊瀏覽器才會用到：以 closest() 往上找可編輯的祖先
    const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"]';

    /**
     * 檢查單一節點本身是否屬於使用者可直接輸入或正在進行文本編輯的元素（不往上找祖先）。
     * 設計意圖：
     * 1. 排除 HTML 原生輸入元素（INPUT、TEXTAREA、SELECT）。
     * 2. 排除可編輯區塊（如各類富文本編輯器、Notion、Google Docs、Slack 等）。
     *    這裡使用 isContentEditable 是可接受的：只在少數按鍵、少數節點上呼叫，最多觸發一次樣式更新。
     * 3. 排除 ARIA 角色為 textbox、searchbox 或 combobox 的模擬文字輸入元件。
     * 4. 祖先的檢查交給呼叫端的 composedPath()，它本來就包含所有祖先，不需要對每個節點再呼叫 closest()
     *    （舊版每個節點都 closest() 往上爬，成本是 O(深度²)）。
     *
     * @param {EventTarget} node - 待檢查的節點
     * @returns {boolean} 若為輸入或可編輯元素則返回 true
     */
    function isDirectlyEditable(node) {
        if (!(node instanceof Element)) {
            return false;
        }

        const tag = node.localName;
        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
            return true;
        }

        if (node.isContentEditable) {
            return true;
        }

        const role = node.getAttribute('role');
        return role === 'textbox' || role === 'searchbox' || role === 'combobox';
    }

    /**
     * 檢查當前鍵盤事件是否發生在使用者輸入的範圍內。
     * 設計意圖：
     * 1. 優先檢查 document.activeElement，若當前焦點已位於輸入框中，則絕對不觸發快捷鍵。
     * 2. 透過 event.composedPath() 檢查事件傳遞路徑中的所有節點（包含所有祖先），能有效穿透 Shadow DOM，
     *    正確識別現代 Web Components 封裝內部的自訂輸入框。
     * 3. 確保使用者在網頁任何輸入框、表單、編輯器正常鍵入 "stt" 時，不會被當成快捷鍵截斷或干擾正常輸入。
     *
     * @param {KeyboardEvent} event - 鍵盤事件物件
     * @returns {boolean} 若處於輸入模式則返回 true
     */
    function isInInputMode(event) {
        if (isDirectlyEditable(document.activeElement)) {
            return true;
        }

        if (typeof event.composedPath === 'function') {
            return event.composedPath().some(node => isDirectlyEditable(node));
        }

        const target = event.target;
        return target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null;
    }

    /**
     * 處理連續按鍵觸發簡繁轉換的鍵盤事件監聽器。
     * 設計意圖與運作機制：
     * 1. 排除包含 Ctrl / Alt / Meta(Command) 等系統修飾鍵，避免與系統或瀏覽器快捷鍵（如 Ctrl+S）產生衝突。
     * 2. 排除輸入法組字中狀態 (isComposing / keyCode 229)，避免中文輸入法選字期間誤觸發。
     * 3. 快速路徑：沒有進行中的序列、且按下的不是序列開頭字元時直接返回。腳本跑在所有網站上，
     *    絕大多數按鍵都會在這裡結束，不必每次按鍵都做較昂貴的「是否在輸入框中」檢查。
     * 4. 嚴格檢查是否處於輸入模式，若在輸入框內鍵入則立即清空緩衝區並退出。
     * 5. 採用前綴狀態機比對：
     *    - 使用者依序鍵入字母，檢查拼接後的新字串是否符合目標序列 "stt" 的前綴。
     *    - 若符合前綴則累積緩衝區，並重設逾時清除計時器（SHORTCUT_KEY_TIMEOUT）。
     *    - 若不符合但新按下的鍵恰為起始字元 's'，則視為重新開始序列（例如輸入 "sstt" 能在第二個 's' 順利接續 't', 't' 觸發）。
     *    - 若完全不符合則清空緩衝區與計時器。
     * 6. 達成連續完整按鍵 "stt" 且各鍵輸入間隔未逾時時，阻止預設行為與事件冒泡，並立即執行簡繁轉換。
     *
     * @param {KeyboardEvent} event - 鍵盤事件物件
     */
    function handleKeyDown(event) {
        // 排除包含 Ctrl / Alt / Meta(Command) 的組合鍵，避免干擾系統或自訂全域快捷鍵
        if (event.ctrlKey || event.altKey || event.metaKey) {
            resetKeySequence();
            return;
        }

        // 排除輸入法組字中狀態 (IME composing)，避免選字或注音拼音輸入時觸發
        if (event.isComposing || event.keyCode === 229) {
            return;
        }

        // 取得按鍵字元並轉換為小寫，確保支援大寫鎖定 (CapsLock) 或 Shift 鍵入時的一致性
        const key = event.key ? event.key.toLowerCase() : '';

        // 只處理單一字母或符號鍵；Shift、Enter、Backspace、方向鍵等功能鍵會打斷連續輸入序列
        if (key.length !== 1) {
            resetKeySequence();
            return;
        }

        // 快速路徑：與序列無關的按鍵直接結束（見上方說明第 3 點）
        if (keySequenceBuffer === '' && key !== SHORTCUT_SEQUENCE[0]) {
            return;
        }

        // 若使用者正在可輸入的範圍內（如文字框、輸入框、編輯器），絕不觸發快捷鍵並重置緩衝區
        if (isInInputMode(event)) {
            resetKeySequence();
            return;
        }

        // 清除上一個按鍵所設定的逾時清除計時器
        if (keySequenceTimer) {
            clearTimeout(keySequenceTimer);
            keySequenceTimer = null;
        }

        // 透過前綴比對檢查連續按鍵是否朝著 "stt" 邁進
        const nextBuffer = keySequenceBuffer + key;
        if (SHORTCUT_SEQUENCE.startsWith(nextBuffer)) {
            keySequenceBuffer = nextBuffer;
        } else if (key === SHORTCUT_SEQUENCE[0]) {
            // 若目前按下的字元恰好是序列的開頭字元 's'，則將緩衝區重設為 's' 重新開始
            keySequenceBuffer = key;
        } else {
            // 與序列不符，清空緩衝區
            keySequenceBuffer = '';
        }

        // 檢查是否成功達成連續按下 "stt"
        if (keySequenceBuffer === SHORTCUT_SEQUENCE) {
            resetKeySequence();
            // 阻止該按鍵可能的預設行為（例如部分網站的單鍵快速導航）
            event.preventDefault();
            event.stopPropagation();
            triggerManualConversion('快捷鍵 "stt" ');
            return;
        }

        // 若序列尚未湊齊但有部分匹配，設定逾時計時器，若間隔停留太久未按下一鍵則自動重置
        if (keySequenceBuffer.length > 0) {
            keySequenceTimer = setTimeout(resetKeySequence, SHORTCUT_KEY_TIMEOUT);
        }
    }

    // ===== 啟動 =====

    // 白名單頁面：立即整頁轉換並啟動觀察器；其他頁面：什麼都不做，等使用者手動觸發
    applyAutoConvertState();

    // 只有 GitHub（且設定了 GitHub ID 白名單）才需要監聽 SPA 路由
    initRouteWatch();

    // 選單命令：無論目前頁面是否在白名單中都提供（舊版依頁面註冊兩種不同文字的選單，
    // 但白名單狀態現在會隨 SPA 換頁改變，統一成一個命令較不易混淆）
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('🔄 轉換此頁面 (簡→繁)', () => triggerManualConversion('選單命令'));
    }

    // 網頁開啟後，無論是否符合自動轉換網址名單，皆啟用鍵盤快捷鍵（連續按下 "stt" 觸發簡繁轉換）
    // 使用 capture 捕獲階段（true）確保在最上層即時攔截按鍵，避免被網頁上其他監聽器透過 stopPropagation 阻擋。
    window.addEventListener('keydown', handleKeyDown, true);

})();
