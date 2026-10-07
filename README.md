# nerv-translations

NERV 网站的翻译仓库。任何人都可以提 PR，也可以用 AI 起草；维护者审核后合并。合并后网站自动取用，不用另外发布；只有换图提醒的文字要等后端下一次发布。

[English](#english)

## 文件

- `servers/<社区>.json`：一个社区的服务器命名规则。`<社区>` 是这个社区在 NERV 里的标识，小写字母、数字与连字符，以字母或数字开头，最长 32 个字符，例如 `zed`、`ub`、`exg`；文件直接放在 `servers/` 下，不建子目录。
- `server-labels.json`：服务器标签词典，放在仓库根目录。
- `maps/names/<游戏>.json`：一个游戏的地图译名。`<游戏>` 是这个游戏的 Steam AppID，只写数字，例如 CS2 是 `730`；文件直接放在 `maps/names/` 下。
- `maps/tags.json`：ZE 标签词典。`maps/` 下只放这个文件与 `maps/names/<游戏>.json`。
- `search/aliases/<游戏>.json`：一个游戏的搜索正式关系，写明玩家的叫法指哪些图。`<游戏>` 同样是 Steam AppID；`search/` 下只放这些文件。
- `reminders/<语言>.json`：换图提醒的文字，一种语言一个文件。`<语言>` 是 `en`、`zh-CN`、`ja`、`ko`；`reminders/` 下只放这几个文件，`en.json` 必须有。
- 这些文件都是 UTF-8 的 JSON（不带 BOM），同一个对象里不写重复的键。
- `schemas/` 与 `.github/`：各类文件的格式（JSON Schema，由 NERV 生成）与提交时的检查，只由维护者更新，PR 里不要改。
- 界面文字的语言文件以后放进来，格式随之补上。

## 服务器命名规则

服务器名多半是社区起的中文名，命名规则把原名按固定格式写成英语、简体中文、日语、韩语：

```json
{
  "rules": [
    {
      "match": "【僵尸乐园】 CS2 攀岩 Kz 困难 #{编号}",
      "names": {
        "en": "ZombiEden CS2 KZ Hard #{编号}",
        "ja": "ゾンビエデン CS2 KZ ハード #{编号}"
      }
    }
  ],
  "servers": [
    {"address": "cs1.zombieden.cn:27015", "names": {"en": "[ZombiEden] Gensokyo Lobby"}}
  ]
}
```

- `match` 是服务器原名的全文，逐字比较；`{变量}` 代表会变的部分，例如编号，至少一个字。上面这条规则让"【僵尸乐园】 CS2 攀岩 Kz 困难 #3"在英语界面显示"ZombiEden CS2 KZ Hard #3"，以后新开的 #4 也自动套用。
- 变量名用任何文字的字母、数字与下划线，例如 `编号`、`n`，不能以数字开头；同一条 `match` 里一个变量只出现一次，两个变量之间要有别的字。
- `names` 按语言写：`en`、`zh-CN`、`ja`、`ko`，至少写一种，可以用 `match` 里的变量；`{{` 与 `}}` 写出大括号本身。繁体中文由简体转换，不单独写。
- 规则没写的语言，这种语言的玩家看到原名；英语也不代替其他语言。上面的例子没写 `zh-CN` 与 `ko`，简体中文、繁体中文与韩语界面显示原名。
- 一个文件里按顺序取第一条匹配的规则。
- `servers` 按连接地址给某一台服单独起名，优先于规则，名字里不能用变量。地址写成网站显示的样子：小写的域名或 IPv4，加端口，例如 `cs1.zombieden.cn:27015`、`110.42.9.31:27111`。
- `rules` 与 `servers` 都可以省略。

### 标签与临时标记

社区常给一类服挂上属性，例如 EXG 的装备服、热门服。这些属性不写进名字，写成标签，显示在名字旁：

```json
{
  "rules": [
    {
      "match": "僵尸逃跑ZE 装备#{n}",
      "names": {"en": "EXG Zombie Escape #{n}", "zh-CN": "EXG 僵尸逃跑 #{n}"},
      "labels": ["gear"],
      "marks": [{"text": "[热门]", "label": "hot"}, {"text": "[已人满]"}]
    }
  ]
}
```

- `labels` 写这条规则的服带哪些标签，写 `server-labels.json` 里的标签 `id`，按写的顺序显示，同一个标签只写一次。`servers` 里单独起名的服也可以写 `labels`。
- `marks` 写社区在原名里临时挂的标记，例如 EXG 的"[已人满]""[热门]"，逐字比较。比较 `match` 之前先把这些标记连同旁边的一个空格从原名里去掉；写了 `label` 的标记变成这个标签，排在 `labels` 之后，没写的直接丢掉。上面的规则让"僵尸逃跑ZE 装备#12 [热门]"显示"EXG 僵尸逃跑 #12"，带"装备""热门"两个标签；"[已人满]"只是去掉，满不满看人数。
- 标记只按规则去掉：没有规则匹配的服，原名连同标记照原样显示，不带标签。标记不要写进同一条规则的 `match`，否则这条规则匹配不到带标记的名字。
- 规则没写某种语言的名字时，这种语言显示原名，也不另显示标签，原名里已经写着。

## 服务器标签词典

`server-labels.json` 写每个服务器标签的各语言写法，规则只写用哪个标签，社区改了叫法只改这一处：

```json
{
  "labels": [
    {"id": "gear", "word": "装备", "names": {"en": "Gear", "zh-CN": "装备", "ja": "装備", "ko": "장비"}},
    {"id": "hot", "word": "热门", "names": {"en": "Hot", "zh-CN": "热门", "ja": "人気", "ko": "인기"}}
  ]
}
```

- `id` 是标签的标识，规则按它写标签：小写字母、数字与连字符，以字母或数字开头，最长 32 个字符；一个 `id` 只写一次。
- `word` 是社区自己的叫法。
- `names` 按语言写标签：`en`、`zh-CN`、`ja`、`ko`，可以省略。没写的语言显示 `word`，不拿英语或其他语言代替；繁体中文由简体转换。

## 地图译名

地图译名把服务器报的原始地图名写成英语、简体中文、日语、韩语：

```json
{
  "maps": [
    {"name": "ze_drakelord_castle_b3", "names": {"en": "Drakelord Castle (Beta 3)"}},
    {"name": "ze_atix_panic_2017_p", "names": {"en": "Atix Panic 2017"}, "no_community_name": true}
  ]
}
```

- `name` 是服务器报的原始地图名，不含空格；不分大小写，一张图在文件里只写一次。原始地图名照样显示，也照样搜得到。
- `names` 按语言写：`en`、`zh-CN`、`ja`、`ko`，至少写一种。繁体中文由简体转换，不单独写。
- 英语名去掉玩法前缀、下划线与作者、移植者这类标记，保留版本号与梗，版本写成一眼看得懂的样子，例如 `ze_frozen_abyss_v1_2` 写作"Frozen Abyss (v1.2)"。
- 这里的译名优先于社区给的中文名（CS2 的图用 EXG 的，CSGO 的 ZE 图用 UB 的），社区之后的更新不覆盖它。
- 没写的语言显示原始地图名，不拿英语或其他语言代替；简体中文没写时先显示社区给的中文名。`"no_community_name": true` 表示这张图不用社区给的中文名，上面的例子里 `ze_atix_panic_2017_p` 在简体中文界面显示原始地图名。
- 每一条至少写 `names` 或 `no_community_name` 之一。从文件里删掉一条，简体中文回到社区给的中文名，其余语言显示原始地图名。

## ZE 标签词典

ZE 地图的标签来自 EXG。词典把 EXG 的标签词换成通用的标签，并给出各语言的名称与别名：

```json
{
  "tags": [
    {
      "id": "laser",
      "exg": ["跳刀"],
      "names": {"zh-CN": "跳刀"}
    }
  ]
}
```

- `id` 是标签的标识，页面按它筛选，管理员按它给地图设标签，定下后不再改：小写字母、数字与连字符，以字母或数字开头，最长 32 个字符。
- `exg` 是 EXG 表示这个标签的词，至少一个；一个词只属于一个标签。EXG 给了词典里没有的词时，这张图的标签保持原样，词典补上后下一次更新换成通用标签。
- `names` 按语言写标签的名称：`en`、`zh-CN`、`ja`、`ko`，至少写一种。没写的语言显示第一个 EXG 词，不拿其他语言的名称代替；繁体中文由简体转换。
- `aliases` 按语言写玩家可能输入的其他叫法，可以省略。玩家输入任一语言的名称或别名都能找到这个标签；几个标签共用的叫法让玩家从中选。
- 地图上的标签按文件里的顺序显示。

## 搜索的正式关系

玩家常用俗称找图，例如"宫殿62"指 ze_ffxiv_wanderers_palace_v6_2，地图名和译名里都没有这个词。正式关系写明一个叫法指哪些图，例如 CS2 的 `search/aliases/730.json`：

```json
{
  "aliases": [
    {"alias": "宫殿62", "strong": ["ze_ffxiv_wanderers_palace_v6_2"]},
    {"alias": "宫殿", "weak": ["ze_ffxiv_wanderers_palace", "ze_ffxiv_wanderers_palace_v2_8", "ze_ffxiv_wanderers_palace_v5_2", "ze_ffxiv_wanderers_palace_v6_2"]},
    {"alias": "米纳斯", "weak": ["ze_lotr_minas_tirith", "ze_lotr_minas_tirith_p"], "unrelated": ["ze_lotr_minas_tirith_cs2"]}
  ]
}
```

- `alias` 是玩家输入的叫法，照玩家的写法写，简体、繁体都可以。比较叫法时简繁不分，也不分大小写和全角半角，空格与标点只用来分词："宫殿62"、"宮殿62"与"宫殿 62"是同一个叫法，一个文件里只写一次。叫法里至少要有一个字母、数字或汉字。
- `strong`：强相关，这个叫法就是指这张图，搜这个词时排在名字正好是这个词的图之后、一般文字匹配之前。
- `weak`：弱相关，可能指这张图，排在强相关之后。
- `unrelated`：无关，这个叫法不指这张图；玩家的搜索也不能再把它们学成相关。上面的例子里，搜"米纳斯"不出现 ze_lotr_minas_tirith_cs2。
- 地图写服务器报的原始地图名，不分大小写，不必已在网站的地图目录里。一个叫法可以指多张图；同一张图在一条里只写一次，不管写在哪一类；每条至少写 `strong`、`weak`、`unrelated` 之一。
- 关系按游戏分文件，同一个叫法在 CS2 和 CSS 里互不影响。
- 维护者写的关系覆盖从玩家搜索里学到的关系。删掉一条，或从一条里删掉一张图，就撤销了这条关系。

## 换图提醒

玩家订阅的地图开了、人数也够了，网站在网页与客户端上提醒他（QQ 提醒用简体中文）。提醒的标题与每一行正文写在 `reminders/<语言>.json` 里，例如 `reminders/zh-CN.json`：

```json
{
  "title": "换图通知",
  "map": "地图：{map}",
  "map_with_name": "地图：{map}（{name}）",
  "server": "服务器：{server}",
  "players": "当前人数：{players} / {capacity}",
  "players_without_capacity": "当前人数：{players}"
}
```

- 每个键是一句完整的文字，`{变量}` 由网站填上，`{{` 与 `}}` 写出大括号本身：
  - `title`：提醒的标题，不用变量；
  - `map`：这种语言没有地图译名时的地图一行，`{map}` 是原始地图名；
  - `map_with_name`：有译名时的地图一行，`{map}` 是原始地图名，`{name}` 是译名；
  - `server`：服务器一行，`{server}` 是服务器名，网站已按需在名字前加上社区简称；
  - `players`：当前人数一行，`{players}` 是送出提醒那一刻服务器上的人数，`{capacity}` 是服务器的容量；
  - `players_without_capacity`：不知道容量时的人数一行，`{players}` 是人数。
- 每句只用自己的变量，而且全部用上，例如 `players` 要同时有 `{players}` 与 `{capacity}`。
- `en.json` 写全六句；其他语言缺哪句，那一句显示英语。繁体中文由简体转换，不单独写。
- 例如 FYS 的"僵尸逃跑[ZE] 19"换到 ze_alien_shooter_gp1_3，送出提醒时服务器上 52 人、容量 64：简体中文的提醒标题是"换图通知"，正文三行是"地图：ze_alien_shooter_gp1_3（孤胆枪手）""服务器：FYS 僵尸逃跑[ZE] 19""当前人数：52 / 64"。
- 合并后不立即生效：后端下一次发布时取 main 上最新的提醒文字，在那之前提醒照旧。

## 检查与生效

- 提交 PR 或推送时，GitHub Actions 检查文件名、JSON 的写法，并按 `schemas/` 检查格式，不通过就改好再提交。
- 合并后网站自动取到新版本（服务器名与服务器标签约 30 秒内更新，地图译名与标签约 90 秒内），先把整个仓库再检查一遍：除了格式，还有格式以外的检查，例如名字里的变量是否都在 `match` 里定义、大括号与变量的写法、同一文件里有没有重复的 `match`、同一个地址有没有写两次、规则写的标签在不在标签词典里、标签或标记有没有写两次、标记是不是写进了自己规则的 `match`、标签词典的 `id` 有没有重复、同一张图有没有写两次（不分大小写）、地图译名里什么都没写的条目、标签的 `id` 或 EXG 词有没有重复、同一个叫法有没有写两次、一个叫法里有没有把同一张图写两次、一张图也没写的叫法、全是标点符号或空格的叫法、只有空格的名字、文件的大小与个数。只有全部文件都合格，这次合并才生效；任何一处不合格，这次合并的全部改动都不生效，网站继续用上一版，修好再合并即可。
- 换图提醒的文字在 PR 里就查得出英语缺句与变量写错：`en.json` 缺了哪一句，或者哪一句少用、多用了变量（例如把"当前人数：{players} / {capacity}"里的 `{players}` 写成 `{player}`），检查不通过并指出这一句。合并后网站不取它们，后端发布时再查一遍：除了这些，还有大括号与变量的写法、只有空格的文字、`reminders/` 下有没有别的语言的文件、文件的大小与个数。任何一处不合格，这次发布一句也不取，提醒继续用上一版。

## English

The translation repository of the NERV website. Anyone may open a pull request, drafted by hand or with AI; a maintainer reviews and merges it. The website picks up a merge by itself; nothing else needs publishing, except that the reminder texts wait for the backend's next release.

### Files

- `servers/<community>.json`: the server naming rules of one community. `<community>` is the community's ID in NERV: lower-case letters, digits and hyphens, starting with a letter or digit, at most 32 characters, such as `zed`, `ub` or `exg`. The file sits directly under `servers/`.
- `server-labels.json`: the server label dictionary, at the top of the repository.
- `maps/names/<game>.json`: the map names of one game. `<game>` is the game's Steam AppID in digits, such as `730` for CS2. The file sits directly under `maps/names/`.
- `maps/tags.json`: the ZE tag dictionary. `maps/` holds nothing but this file and `maps/names/<game>.json`.
- `search/aliases/<game>.json`: the formal search relations of one game, which say what maps players' aliases mean. `<game>` is again the Steam AppID; `search/` holds nothing but these files.
- `reminders/<language>.json`: the texts of map reminders, one file per language. `<language>` is `en`, `zh-CN`, `ja` or `ko`; `reminders/` holds nothing but these files, and `en.json` is required.
- These files are UTF-8 JSON without a byte order mark, with no key repeated in an object.
- `schemas/` and `.github/`: the format of each kind of file as a JSON Schema, generated by NERV, and the check a change gets. Only the maintainer updates them; pull requests leave them alone.
- The interface's language files will come here later, with their format.

### Server naming rules

Most server names are Chinese names the communities chose. A naming rule writes an original name in English, Simplified Chinese, Japanese and Korean by a fixed pattern; see the example above.

- `match` is a server's whole original name, compared exactly. `{variable}` stands for a part that varies, such as a number, at least one character. The rule above shows "【僵尸乐园】 CS2 攀岩 Kz 困难 #3" as "ZombiEden CS2 KZ Hard #3" in English, and a new #4 as well.
- A variable is named by letters of any script, digits and underscores, such as `编号` or `n`, and does not start with a digit; a variable appears once in a `match`, and two variables have other text between them.
- `names` gives the names by language, `en`, `zh-CN`, `ja` and `ko`, at least one; they may use the variables of the `match`. `{{` and `}}` write a brace itself. Traditional Chinese is converted from Simplified Chinese.
- A language a rule leaves out shows the original name; English does not stand in for other languages. The example gives no `zh-CN` or `ko` name, so the Chinese and Korean pages show the original name.
- In a file, the first rule that matches applies.
- `servers` names a single server by its connect address and comes before the rules; its names use no variables. Write the address as the website shows it: a lower-case domain or an IPv4 address, then the port, such as `cs1.zombieden.cn:27015` or `110.42.9.31:27111`.
- `rules` and `servers` may each be left out.

#### Labels and temporary marks

Communities often mark a kind of server, such as EXG's gear servers and hot servers. Such marks are not part of the name: they are labels, shown next to the name; see the example above.

- `labels` gives the labels of the servers a rule names, by their `id` in `server-labels.json`, in the order they show, each once. An entry of `servers` may give `labels` too.
- `marks` gives the temporary marks a community puts in its original names, such as EXG's "[已人满]" and "[热门]", compared exactly. They are taken out of the name, with a space next to them, before `match` is compared; a mark with a `label` becomes that label, after the rule's `labels`, and one without is dropped. The rule above shows "僵尸逃跑ZE 装备#12 [热门]" as "EXG Zombie Escape #12" with the labels Gear and Hot; "[已人满]" is only taken out, as the player count shows whether a server is full.
- Marks are taken out only by rules: a server no rule matches shows its original name, marks and all, with no label. Do not write a mark into its own rule's `match`, or the rule cannot match a name with the mark.
- A language a rule gives no name in shows the original name and no labels, as the original name already says them.

### Server label dictionary

`server-labels.json` gives each server label's words by language; rules give only which labels, so a community's new word for a label changes one place; see the example above.

- `id` identifies the label, and rules give labels by it: lower-case letters, digits and hyphens, starting with a letter or digit, at most 32 characters; each `id` once.
- `word` is the community's own word for the label.
- `names` gives the label's word by language, `en`, `zh-CN`, `ja` and `ko`, and may be left out. A language left out shows `word`; no other language, English included, stands in. Traditional Chinese is converted from Simplified Chinese.

### Map names

A map-name file gives a map, by the raw name servers report, a name in English, Simplified Chinese, Japanese and Korean; see the example above.

- `name` is the raw map name a server reports, without spaces. Case is ignored, and a file names a map once. The raw name is still shown and still found by search.
- `names` gives the names by language, `en`, `zh-CN`, `ja` and `ko`, at least one. Traditional Chinese is converted from Simplified Chinese.
- An English name drops the mode prefix, the underscores and marks such as the author's or porter's, keeps the version and any joke, and writes the version plainly: `ze_frozen_abyss_v1_2` is "Frozen Abyss (v1.2)".
- These names come before the Chinese names the communities give (EXG's for CS2 maps, UB's for CSGO ZE maps), and the communities' later updates do not replace them.
- A language left out shows the raw map name; no other language, English included, stands in. Simplified Chinese first shows the community's Chinese name. `"no_community_name": true` means the map does not use the community's Chinese name: in the example, `ze_atix_panic_2017_p` shows its raw name on the Simplified Chinese pages.
- Each entry gives `names`, `no_community_name` or both. Removing an entry brings back the community's Chinese name in Simplified Chinese and the raw map name in the other languages.

### ZE tag dictionary

The tags of ZE maps come from EXG. The dictionary turns EXG's tag words into common tags and gives their names and aliases by language; see the example above.

- `id` identifies the tag; pages filter by it and administrators set a map's tags by it, so it stays once chosen. It is lower-case letters, digits and hyphens, starting with a letter or digit, at most 32 characters.
- `exg` lists EXG's words for the tag, at least one; a word belongs to one tag. When EXG gives a word the dictionary lacks, the map keeps its tags; once the word is added, the next update gives the common tag.
- `names` gives the tag's name by language, `en`, `zh-CN`, `ja` and `ko`, at least one. A language left out shows the first EXG word; no other language stands in. Traditional Chinese is converted from Simplified Chinese.
- `aliases` gives other names players may type, by language, and may be left out. A name or alias in any language finds the tag; one that several tags share lets the player choose among them.
- A map shows its tags in the order of the file.

### Search relations

Players often look for a map by a nickname: "宫殿62" means ze_ffxiv_wanderers_palace_v6_2, though neither its name nor its translations contain the word. A formal relation says what maps an alias means, as in CS2's `search/aliases/730.json`; see the example above.

- `alias` is what players type, written as they write it, in Simplified or Traditional Chinese alike. Aliases are compared without regard to Simplified or Traditional Chinese, case, or full and half width, and spaces and punctuation only separate words: "宫殿62", "宮殿62" and "宫殿 62" are one alias, given once in a file. An alias has at least one letter, digit or Chinese character.
- `strong`: the alias means the map. Searching for it ranks the map right after the maps whose name is the word, before ordinary text matches.
- `weak`: the alias may mean the map; it ranks after the strong ones.
- `unrelated`: the alias does not mean the map, and players' searches can no longer relate them. In the example, a search for "米纳斯" does not show ze_lotr_minas_tirith_cs2.
- Maps are given by the raw names servers report, case ignored; the website's catalog need not have them yet. An alias may mean several maps; an entry gives a map once, whatever its kind, and gives at least one of `strong`, `weak` and `unrelated`.
- Each game has its own file: an alias in CS2 and the same alias in CSS do not affect each other.
- The maintainers' relations override those learnt from players' searches. Deleting an entry, or a map from it, revokes the relation.

### Map reminders

When a map a player subscribes to is on and has enough players, the website reminds the player on the web pages and in the client (QQ reminders are in Simplified Chinese). The reminder's title and each line of its body are in `reminders/<language>.json`; see the example above, `reminders/zh-CN.json`.

- Each key is one whole text in which the website fills in `{variable}`; `{{` and `}}` write a brace itself:
  - `title`: the reminder's title, with no variable;
  - `map`: the map's line when the language has no name for the map; `{map}` is the raw map name;
  - `map_with_name`: the map's line with its name; `{map}` is the raw map name, `{name}` its name;
  - `server`: the server's line; `{server}` is the server's name, with the community's short name already put before it where needed;
  - `players`: the line of the current players; `{players}` is the players on the server when the reminder is sent, `{capacity}` the server's capacity;
  - `players_without_capacity`: the same line when the capacity is not known; `{players}` is the players.
- A text uses only its own variables, and all of them: `players` has both `{players}` and `{capacity}`.
- `en.json` has all six texts; a text another language leaves out shows in English. Traditional Chinese is converted from Simplified Chinese.
- When FYS's "僵尸逃跑[ZE] 19" changes to ze_alien_shooter_gp1_3 and has 52 players of 64 when the reminder is sent, the Simplified Chinese reminder has the title "换图通知" and the lines "地图：ze_alien_shooter_gp1_3（孤胆枪手）", "服务器：FYS 僵尸逃跑[ZE] 19" and "当前人数：52 / 64"; in English they read "Map changed", "Map: ze_alien_shooter_gp1_3", "Server: FYS 僵尸逃跑[ZE] 19" and "Current players: 52 / 64".
- A merge does not take effect at once: the backend's next release takes the latest reminder texts of main, and until then reminders read as before.

### Checks

- Every pull request and push is checked by GitHub Actions: file names, strict JSON, and the format against `schemas/`. Fix what it reports and push again.
- The website fetches a merged version by itself (server names and labels change within about 30 seconds, map names and tags within about 90 seconds) and first checks the whole repository again: the format, and what a schema cannot express, such as that every variable a name uses is defined by its `match`, how braces and variables are written, that no `match` appears twice in a file, that no address is named twice, that every label a rule gives is in the label dictionary, that no label or mark is given twice, that no mark is in its own rule's `match`, that no label ID is given twice in the dictionary, that no map is named twice in a file (case ignored), that no map entry is empty, that no tag ID or EXG word is given twice, that no alias is given twice, that no alias gives a map twice, that every alias gives a map, that every alias has a letter, digit or Chinese character, that no name is only spaces, and the size and number of files. The merge takes effect only when every file passes; if anything fails, none of the merge takes effect and the website keeps the previous version until a fixed merge.
- A pull request already shows a reminder text English lacks or a variable written wrong: if `en.json` leaves a text out, or a text leaves out a variable or uses another (`{player}` for `{players}` in "Current players: {players} / {capacity}", say), the check fails and names the text. The website does not take the reminder texts at a merge; the backend's release checks them again, and also how braces and variables are written, that no text is only spaces, that `reminders/` holds no other language's file, and the size and number of files. If anything fails, the release takes none of the texts and reminders keep the previous version.
