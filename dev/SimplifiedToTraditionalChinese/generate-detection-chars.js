/**
 * 從 OpenCC 字典自動產生「簡體專用字」與「繁體專用字」偵測字表，
 * 並寫回 src/SimplifiedToTraditionalChinese.user.js 中的 <generated:detection-chars> 區塊。
 *
 * 用法（不需要安裝任何套件，Node.js 18 以上即可）：
 *   cd dev/SimplifiedToTraditionalChinese && npm run build
 *   node generate-detection-chars.js --opencc ./full.js   # 離線時改用本機的 OpenCC bundle
 *
 * 為什麼需要這支產生器：
 * userscript 用這兩份字表判斷一段文字「是不是簡體中文」，只有判定為簡體才交給 OpenCC 轉換，
 * 藉此保護原本就是繁體的內容不被 OpenCC 的詞組轉換改寫（例如「台北」被改成「臺北」）。
 * 舊版字表是手選的約 300 字，涵蓋率不足又混入繁簡共用字；改從 OpenCC 字典推導後，
 * 字表會與 userscript 執行時用的轉換器完全一致。預設會讀取 userscript 的 @require 網址下載
 * 同一版 OpenCC，所以升級 OpenCC 版本後，只要重新執行本程式即可同步字表。
 *
 * OpenCC 字典的特性（推導規則的前提）：
 * - opencc-js 的字表只保留「第一個候選字」。像「只 → 只/隻」這種第一候選就是自己的字，
 *   根本不會出現在 STCharacters 中；「后 → 後」則會出現，但「皇后、仙后」這些詞組會在
 *   STPhrases 中被標示為保留「后」。所以不能只看單字表，必須一併參考詞組。
 * - 詞組表的「鍵」常用來處理繁簡混雜的輸入（例如 STPhrases 的「党內 → 黨內」、「受夠了」），
 *   這些鍵裡出現的字不代表該字真的會出現在另一種文字中，因此只採用詞組的「值」當證據。
 *
 * 推導規則：
 * 1. 簡體專用字 = STCharacters 中「簡體字 ≠ 繁體字」的單一字元，再排除：
 *    a. 結構性證據：出現在 STCharacters 的值、TSCharacters 的鍵、臺灣異體字表兩側的字
 *       （代表它本身就是繁體字，例如「吃、床、群」是臺灣用字）。
 *    b. 詞組證據：在 PHRASE_KEEP_THRESHOLD 個以上的 STPhrases 繁體詞組中被保留的字
 *       （例如「里、干、后、游、台」）。門檻以下的通常只是人名或冷僻詞
 *       （例如「种師道、万俟、党懷英」），不代表臺灣日常會用。
 *       實際分佈在 8 與 14 之間有明顯斷層，門檻設為 10。
 *    c. MANUAL_SIMPLIFIED_EXCLUSIONS：門檻以下但在臺灣常見的字。
 * 2. 繁體專用字 = TSCharacters 的鍵與臺灣異體字（例如「為、裡、眾」）中的單一字元，再排除：
 *    a. 結構性證據：出現在 STCharacters 的鍵、TSCharacters 的值的字。
 *    b. 詞組證據：出現在任何 TSPhrases 簡體詞組的值中的字（例如「乾隆、乾坤」裡的「乾」）。
 *       TSPhrases 只有約 300 筆且都是刻意收錄的例外，所以出現一次就排除。
 *    c. MANUAL_TRADITIONAL_EXCLUSIONS：簡體中文也常用、但字典沒有標示出來的字。
 * 3. 只保留 BMP 範圍（U+3400–U+9FFF、U+F900–U+FAFF）的字，因為 userscript 用 charCodeAt() 逐字比對。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const USERSCRIPT_PATH = path.resolve(__dirname, '../../src/SimplifiedToTraditionalChinese.user.js');
const BLOCK_START = '    // <generated:detection-chars>';
const BLOCK_END = '    // </generated:detection-chars>';

// 繁體詞組中至少被保留幾次，才視為「繁體也常用」（見檔案開頭的規則 1b）
const PHRASE_KEEP_THRESHOLD = 10;

// 每行輸出幾個字，讓產生的區塊在編輯器與 diff 中都容易閱讀
const CHARS_PER_LINE = 64;

// 門檻以下但在臺灣常見的字：字 → 臺灣常見用法（只用於說明）
const MANUAL_SIMPLIFIED_EXCLUSIONS = {
    '佣': '佣金',
    '厘': '公厘',
};

// 簡體中文也常用、但 OpenCC 字典沒有標示出來的繁體字：字 → 簡體常見用法（只用於說明）
const MANUAL_TRADITIONAL_EXCLUSIONS = {
    '著': '著名、著作',
};

// 產生結果的基本檢查：字典結構若有變動導致推導失準，寧可直接失敗也不要寫出錯誤的字表
const MUST_BE_SIMPLIFIED = '这们说为发对国东车门';
const MUST_BE_TRADITIONAL = '這們說為發對國東車門裡眾';
const MUST_NOT_BE_EITHER = '只制系游后采划朴于云几台里干面着乾著佣厘';

const isBmpCjk = ch => ch.length === 1 && /[\u3400-\u9fff\uf900-\ufaff]/.test(ch);

// opencc-js 的字典格式："鍵 值|鍵 值|..."（也可能已經是 [[鍵, 值], ...] 陣列）
function parseDict(dict) {
    return typeof dict === 'string' ? dict.split('|').map(entry => entry.split(' ')) : dict;
}

function collectChars(strings) {
    return new Set(strings.join(''));
}

// 計算每個字出現在幾個字串中（同一字串內重複出現只算一次）
function countCharsByString(strings) {
    const counts = new Map();
    for (const str of strings) {
        for (const ch of new Set(str)) {
            counts.set(ch, (counts.get(ch) || 0) + 1);
        }
    }
    return counts;
}

async function loadOpenCC(userscriptSource) {
    // 產生區塊的「資料來源」一律記錄 @require 網址：那才是 userscript 執行時真正使用的版本，
    // 離線模式的本機路徑只是取得同一份檔案的手段，寫進 userscript 沒有意義
    const match = userscriptSource.match(/^\/\/ @require\s+(\S*opencc\S*)\s*$/m);
    if (!match) {
        throw new Error('在 userscript 中找不到 OpenCC 的 @require 網址');
    }
    const requireUrl = match[1];

    const localPathIndex = process.argv.indexOf('--opencc');
    let code;
    if (localPathIndex !== -1) {
        const localPath = path.resolve(process.argv[localPathIndex + 1]);
        console.log(`使用本機 OpenCC：${localPath}（請確認與 ${requireUrl} 為同一版本）`);
        code = fs.readFileSync(localPath, 'utf8');
    } else {
        const response = await fetch(requireUrl);
        if (!response.ok) {
            throw new Error(`下載 OpenCC 失敗：HTTP ${response.status} ${requireUrl}`);
        }
        code = await response.text();
    }

    // UMD bundle 會把 OpenCC 掛在 globalThis 上，在獨立的 vm context 中執行即可取得
    const sandbox = {};
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    if (!sandbox.OpenCC || !sandbox.OpenCC.Locale) {
        throw new Error('OpenCC bundle 沒有匯出 Locale，無法讀取字典');
    }
    return { OpenCC: sandbox.OpenCC, source: requireUrl };
}

function deriveDetectionChars(Locale) {
    const [stCharacters, stPhrases] = Locale.from.cn.map(parseDict);
    const [tsCharacters, tsPhrases] = Locale.to.cn.map(parseDict);
    const twVariants = parseDict(Locale.to.tw2[0]);
    const twVariantsRev = parseDict(Locale.from.tw2[0]);

    // 規則 1：簡體專用字
    const tradStructural = collectChars([
        ...stCharacters.map(([, trad]) => trad),
        ...tsCharacters.map(([trad]) => trad),
        ...twVariants.flat(),
        ...twVariantsRev.flat(),
    ]);
    const keptInTradPhrases = countCharsByString(stPhrases.map(([, trad]) => trad));
    const simplified = stCharacters
        .filter(([simp, trad]) =>
            isBmpCjk(simp) &&
            simp !== trad &&
            !tradStructural.has(simp) &&
            (keptInTradPhrases.get(simp) || 0) < PHRASE_KEEP_THRESHOLD &&
            !(simp in MANUAL_SIMPLIFIED_EXCLUSIONS))
        .map(([simp]) => simp);

    // 規則 2：繁體專用字
    const simpStructural = collectChars([
        ...stCharacters.map(([simp]) => simp),
        ...tsCharacters.map(([, simp]) => simp),
    ]);
    const keptInSimpPhrases = collectChars(tsPhrases.map(([, simp]) => simp));
    const traditionalCandidates = new Set([
        ...tsCharacters.map(([trad]) => trad),
        ...twVariants.map(([, twChar]) => twChar),
        ...twVariantsRev.map(([twChar]) => twChar),
    ]);
    const traditional = [...traditionalCandidates].filter(ch =>
        isBmpCjk(ch) &&
        !simpStructural.has(ch) &&
        !keptInSimpPhrases.has(ch) &&
        !(ch in MANUAL_TRADITIONAL_EXCLUSIONS));

    // 依字碼排序並去除重複，讓每次產生的結果穩定，diff 只反映字典真正的變化
    return {
        simplified: [...new Set(simplified)].sort(),
        traditional: [...new Set(traditional)].sort(),
    };
}

function verify({ simplified, traditional }) {
    const simplifiedSet = new Set(simplified);
    const traditionalSet = new Set(traditional);
    const errors = [];
    const overlap = simplified.filter(ch => traditionalSet.has(ch));
    if (overlap.length > 0) {
        errors.push(`兩份字表有重疊：${overlap.join('')}`);
    }
    const missingSimplified = [...MUST_BE_SIMPLIFIED].filter(ch => !simplifiedSet.has(ch));
    if (missingSimplified.length > 0) {
        errors.push(`簡體字表缺少基本字：${missingSimplified.join('')}`);
    }
    const missingTraditional = [...MUST_BE_TRADITIONAL].filter(ch => !traditionalSet.has(ch));
    if (missingTraditional.length > 0) {
        errors.push(`繁體字表缺少基本字：${missingTraditional.join('')}`);
    }
    const ambiguous = [...MUST_NOT_BE_EITHER].filter(ch => simplifiedSet.has(ch) || traditionalSet.has(ch));
    if (ambiguous.length > 0) {
        errors.push(`字表誤收繁簡共用字：${ambiguous.join('')}`);
    }
    if (errors.length > 0) {
        throw new Error(`產生結果未通過檢查，未寫入檔案：\n- ${errors.join('\n- ')}`);
    }
}

function renderCharArray(name, chars) {
    const lines = [];
    for (let i = 0; i < chars.length; i += CHARS_PER_LINE) {
        lines.push(`        '${chars.slice(i, i + CHARS_PER_LINE).join('')}',`);
    }
    return [`    const ${name} = [`, ...lines, `    ].join('');`].join('\n');
}

function renderBlock({ simplified, traditional }, source) {
    return [
        BLOCK_START,
        '    // 本區塊由 dev/SimplifiedToTraditionalChinese/generate-detection-chars.js 自動產生，請勿手動編輯',
        `    // 資料來源：${source}`,
        `    // 簡體專用字 ${simplified.length} 個、繁體專用字 ${traditional.length} 個`,
        renderCharArray('SIMPLIFIED_ONLY_CHARS', simplified),
        renderCharArray('TRADITIONAL_ONLY_CHARS', traditional),
        BLOCK_END,
    ].join('\n');
}

async function main() {
    const userscript = fs.readFileSync(USERSCRIPT_PATH, 'utf8');
    const startIndex = userscript.indexOf(BLOCK_START);
    const endIndex = userscript.indexOf(BLOCK_END);
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error(`在 ${USERSCRIPT_PATH} 中找不到產生區塊的起訖標記`);
    }

    const { OpenCC, source } = await loadOpenCC(userscript);
    const result = deriveDetectionChars(OpenCC.Locale);
    verify(result);

    const updated =
        userscript.slice(0, startIndex) +
        renderBlock(result, source) +
        userscript.slice(endIndex + BLOCK_END.length);
    fs.writeFileSync(USERSCRIPT_PATH, updated);

    console.log(`已更新 ${path.relative(process.cwd(), USERSCRIPT_PATH)}`);
    console.log(`簡體專用字 ${result.simplified.length} 個、繁體專用字 ${result.traditional.length} 個`);
}

main().catch(error => {
    console.error(error.message);
    process.exit(1);
});
