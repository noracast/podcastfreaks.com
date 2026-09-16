# GA4 のイベント

ページビューのほかに送っている操作のイベント。送るのは `lib/analytics.js` の
`track`（再生まわりは `lib/player.js` の `trackPlayer` が回の情報を添える）。

- 引数をレポートの表で使うには、GA の管理画面の「カスタム定義」で
  **イベントスコープのカスタムディメンション**として登録する。登録するまでは
  リアルタイムと DebugView でしか中身が見えない（登録より前の分は遡らない）
- `listen_seconds`・`result_count` など数を足したいものは**カスタム指標**で登録する
- 除外中のブラウザ（`?ga-optout=1`）からは送らない。手元の開発サーバーでは
  送る内容をコンソールに `[GA]` として出す
- 外部リンクのクリック・スクロールは GA の拡張計測機能（自動）に任せている。
  ここで送る `channel_link` などは、どの番組のリンクかを添えるためのもの

## 共通の引数

| 引数 | 中身 |
|---|---|
| `channel_key` | 番組のキー（`data/rss.json` のキー） |
| `episode_title` | 回の題名（100文字で切る） |

## 再生（右下のプレーヤー）

| イベント | いつ | 引数 |
|---|---|---|
| `episode_select` | 回を選んで差し替えたとき | `source`（`list` 一覧の子行 / `episodes` / `history_back` / `history_forward` / `history_list` / `media_session`）、`resumed`（続きから） |
| `audio_start` | その回が初めて実際に鳴ったとき。`episode_select` との差が「選んだのに鳴らなかった」数 | `rate` |
| `audio_progress` | 10・25・50・75・90% を越えたとき（鳴っている間のみ） | `percent` |
| `audio_complete` | 最後まで聴いたとき | |
| `audio_listen` | 止めた・聴き終えた・回を替えた・ページを閉じたとき。その間に鳴っていた秒数 | `listen_seconds`、`rate` |
| `audio_error` | 音声を鳴らせなかったとき | `error_type`（`media_2` など MediaError のコード、または `NotAllowedError` など）、`audio_host` |
| `player_control` | プレーヤーの操作 | `control`（下表）、`input`（`player` / `tab` 畳んだつまみ / `keyboard` / `tap` / `drag` / `mouse` / `media_session` ロック画面 / `list` / `episodes` 行を押し直した）、`rate`、`direction`（シークの向き）、`history_count` |
| `channel_reveal` | 番組の子行へ辿る操作 | `source`（`player` / `episodes`）、`target`（`cover` / `channel` / `title`） |

`control` の値: `play` `pause` `skip_back` `skip_forward` `to_start` `seek` `rate`
`history_back` `history_forward` `history_open` `history_close` `history_pick`
`minimize` `restore` `episode_page`（この回のページを開く）

## 一覧（トップ）

| イベント | いつ | 引数 |
|---|---|---|
| `search` | 検索欄に打ち終えて1.5秒経ったとき（GA4 の推奨イベント。「検索キーワード」に出る） | `search_term`、`search_scope`（`channels`）、`result_count` |
| `sort_channels` | 見出しで並べ替えたとき | `sort_key`、`sort_direction` |
| `filter_hosting` | Hosting で絞り込んだとき | `hosting`（`all` / `other` / ホスト名）、`result_count` |
| `toggle_columns` | All columns / Compact | `state` |
| `download_opml` | OPML を書き出したとき | `channel_count`、`filtered`、`sort_key` |
| `channel_open` | 子行を開いたとき | `via`（`row` / `reveal` プレーヤーなどから辿った） |
| `channel_episodes_more` | 子行のエピソードを下まで送って足したとき | `shown_count`、`total_count` |
| `channel_episodes_error` | エピソードを読み込めなかったとき | |
| `channel_description_more` | 説明の Show more | |
| `channel_link` | 番組ごとのリンク | `link_type`（`apple` / `x` / `hashtag` / `last_episode` / `first_episode` / `web_open` / `web_value` / `rss_copy` / `rss_value`） |
| `legend_click` | Duration・Frequency のバッジから About へ | `legend` |

## Episodes

| イベント | いつ | 引数 |
|---|---|---|
| `heatmap_toggle` | 濃淡を開け閉めしたとき | `state`（`open` / `close`） |
| `heatmap_period` | 年を選んだとき | `period`（`recent` / 西暦）、`input`（`list` / `select`） |
| `heatmap_day_pick` | 濃淡の日を押したとき | `date`、`month`、`loaded`（並びに無く、その月を読み直したか） |
| `episodes_load_more` | 下まで送って過去の月を読んだとき（ページ送り） | `month`、`from_latest`（最新から送ったか、heatmap で飛んだ先からか）、`added_count` |
| `episodes_reach_end` | 一番古い回まで送り切ったとき | `from_latest` |
| `episodes_back_to_latest` | 「最新の新着に戻る」 | `loaded_from` |

## Request

| イベント | いつ | 引数 |
|---|---|---|
| `request_arrival` | クエリ付きで来たとき（ただ開いたときは送らない） | `via`（`bookmarklet` / `form_link` / `prefilled`）、`url_hosts` |
| `request_lookup` | 調べ終えたとき | `search_term`、`trigger`（`enter` / `button` / `paste` / `arrival`）、`url_count`、`url_hosts`（入れた URL のホスト名）、`has_name`、`registered_count`、`unregistered_count`、`result`（`registered` / `unregistered` / `none` / `error`） |
| `request_registered_open` | 登録済みのジャケットを開いたとき | `channel_key` |
| `request_candidate_open` | 未登録の行の「リクエスト」を開いたとき | `channel_title` |
| `request_candidates_more` | 「もっと見る」 | `unregistered_count` |
| `request_github_click` | GitHub からリクエスト | `context`（`candidate` / `not_listed` / `not_found`） |
| `request_form_open` | フォームを開いたとき | `context`（`registered` / `candidate` / `not_found` / `direct`）、`searched` |
| `request_form_submit` | フォームを送ったとき。**入力の中身は送らない** | `has_feed` `has_twitter` `has_hashtag` `has_message` `has_contributor` |
| `request_bookmarklet_open` | ブックマークレットの説明を開いたとき | |
| `request_bookmarklet_drag` | ブックマークレットを掴んだとき | |
| `request_bookmarklet_copy` | ブックマークレットのコードをコピーしたとき | |
