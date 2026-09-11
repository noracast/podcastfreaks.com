"use strict";

import consola from 'consola'

// ログの出し方。scripts/ からはこれを使う。
//
// consola は error と warn を枠付きのバッジで出し、前後に空行を入れる。
// 234フィードぶんの警告が並ぶとかえって読みにくいので、バッジを外して
// 1行ずつにしている（✖ や ⚠ の印は残る）。
//
// consola 2 のころは FancyReporter を継承して formatLogObj を差し替えて
// いたが、3 では FancyReporter が export されなくなった。代わりに
// withDefaults で既定値を渡す。バッジを出すかどうかは
// 「logObj.badge ?? logObj.level < 2」で決まるので、badge: false を
// 添えれば枠が付かない。
export default consola.withDefaults({ badge: false })
