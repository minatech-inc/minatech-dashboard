/**
 * ダッシュボード ヘルプガイド
 * 各KPIカード・パネルに「?」アイコンを置き、クリックで使い方ポップアップを表示する。
 * 外側クリック / Escキー / ×ボタンで閉じる。
 */
(function() {
    'use strict';

    var HELP_CONTENT = {
        'kpi-priority': {
            title: '本日の高優先物件',
            body: [
                '<p>その日に MinaTech-Agent が収集した不動産物件のうち、Realty Console の10点満点スコアで <b>S（7点以上）</b> または <b>A（5〜6点）</b> と評価された件数を表示します。</p>',
                '<p><b>見方：</b></p>',
                '<ul><li>大きな数字＝S+A の合計件数（即日〜今週中に対応すべき物件）</li>',
                '<li>下段の「S評価 / A評価」で内訳を確認</li></ul>',
                '<p><b>活用：</b>朝出社時にこの数字をチェックし、Sなら即日電話、Aなら今週中に内見アポを組みます。</p>',
                '<p style="color:#888;font-size:11px;">採点基準は <a href="https://realty.minatech1210.com/scoring.html" target="_blank" style="color:#3b82f6;">scoring.html</a> で完全公開中。</p>'
            ].join('')
        },
        'kpi-ses': {
            title: 'SES 今週提案候補',
            body: [
                '<p>SES営業代行事業のうち、今週中に企業様へ提案する候補案件の件数です。</p>',
                '<p><b>見方：</b></p>',
                '<ul><li>大きな数字＝提案候補件数</li>',
                '<li>下段の「月粗利見込」＝全候補成約時の月間粗利合計</li></ul>',
                '<p><b>活用：</b>件数だけでなく粗利見込で優先度を判断。粗利の高い案件から先に提案を出します。</p>'
            ].join('')
        },
        'kpi-data': {
            title: '本日の収集データ',
            body: [
                '<p>MinaTech-Agent が今朝9:00のバッチ実行で収集した、不動産物件件数とSES案件件数の合計です。</p>',
                '<p><b>見方：</b></p>',
                '<ul><li>大きな数字＝総収集件数</li>',
                '<li>下段で「不動産 / SES」の内訳を表示</li></ul>',
                '<p><b>異常判定：</b>普段の収集量より大幅に少ない場合、スクレイパーが壊れている可能性があります。運用ステータスと併せてご確認ください。</p>'
            ].join('')
        },
        'kpi-status': {
            title: '運用ステータス',
            body: [
                '<p>毎朝9:00の自動実行（MinaTech-Agent）が正常に完了したかを示すヘルスチェック表示です。</p>',
                '<p><b>表示の意味：</b></p>',
                '<ul><li><b>正常稼働</b>＝最新のバッチ実行が成功した</li>',
                '<li><b>警告</b>＝一部タスクが失敗（要ログ確認）</li>',
                '<li><b>停止</b>＝バッチ自体が走っていない（要再実行）</li></ul>',
                '<p><b>活用：</b>朝この緑色を確認できれば、その日のデータ集計が正常に終わっています。</p>'
            ].join('')
        },
        'panel-scatter': {
            title: '不動産 価格×利回り 散布図',
            body: [
                '<p>本日収集した不動産物件を、<b>X軸＝価格</b>・<b>Y軸＝表面利回り</b> の2軸でプロットしたチャートです。</p>',
                '<p><b>見方：</b></p>',
                '<ul><li><b>左上ほど良い</b>＝低価格×高利回り（投資効率高）</li>',
                '<li>右下＝高価格×低利回り（実需向け）</li>',
                '<li>マーカーの色は優先度（S/A/B/C）で区別</li></ul>',
                '<p><b>活用：</b>左上の集団に注目し、特に大きなマーカー（S評価）を優先確認します。</p>'
            ].join('')
        },
        'panel-ses-bars': {
            title: 'SES 単価分布',
            body: [
                '<p>本日収集したSES案件を、月単価レンジ（〜60万 / 60〜80万 / 80〜100万 / 100万〜）で分類した棒グラフです。</p>',
                '<p><b>見方：</b></p>',
                '<ul><li>横軸＝単価レンジ</li>',
                '<li>縦軸＝案件数</li></ul>',
                '<p><b>活用：</b>市況の傾向把握に。高単価帯（80万〜）が多い時期は提案チャンスです。</p>'
            ].join('')
        },
        'panel-realestate-table': {
            title: '本日の優良物件テーブル',
            body: [
                '<p>本日収集された不動産物件のうち、優先度 <b>S（即日対応）</b> または <b>A（今週中対応）</b> の物件のみを、スコア降順で一覧表示します。</p>',
                '<p><b>操作：</b></p>',
                '<ul><li>上部の「すべて / S / A」タブで絞り込み</li>',
                '<li>各行の「リンク」列から元サイト（楽待・健美家等）を開く</li>',
                '<li>「判断根拠」列でスコアの内訳を確認</li></ul>',
                '<p><b>活用：</b>このテーブルは朝の「やることリスト」です。上から順に対応していけば優先度を取りこぼしません。</p>'
            ].join('')
        },
        'panel-ses-table': {
            title: 'SES 提案候補案件テーブル',
            body: [
                '<p>SES事業の今週提案候補案件を一覧表示します。月単価・必要スキル・提案先候補が並びます。</p>',
                '<p><b>活用：</b>各案件の月単価×契約期間で粗利を計算。粗利の大きい順に提案書作成に着手します。</p>'
            ].join('')
        },
        'panel-web-studio': {
            title: 'Web Studio リードパイプライン',
            body: [
                '<p>MinaTech Web Studio（HP制作事業）のリード（問合せ獲得）から契約までのパイプライン状況です。</p>',
                '<p><b>各列の意味：</b></p>',
                '<ul><li><b>新規問合せ</b>＝今週入った新リード</li>',
                '<li><b>商談中</b>＝ヒアリング実施済み</li>',
                '<li><b>見積提示</b>＝見積書送付済み</li>',
                '<li><b>受注</b>＝契約成立</li></ul>',
                '<p><b>活用：</b>「商談中」「見積提示」のリードは追客タイミングを逃さないよう毎日確認します。</p>'
            ].join('')
        },
        'panel-trend': {
            title: '過去14日のデータ収集推移',
            body: [
                '<p>過去2週間（14日間）における、不動産物件・SES案件の日次収集件数の推移グラフです。</p>',
                '<p><b>見方：</b></p>',
                '<ul><li>横軸＝日付</li>',
                '<li>縦軸＝件数</li>',
                '<li>不動産・SES の2系統を重ねて表示</li></ul>',
                '<p><b>活用：</b>急激な減少が見られたら、スクレイパー側の不具合を疑います。月曜は土日分の蓄積で値が高くなる傾向。</p>'
            ].join('')
        }
    };

    // ===== ポップオーバー描画 =====
    function ensureBackdrop() {
        var bd = document.getElementById('help-backdrop');
        if (bd) return bd;
        bd = document.createElement('div');
        bd.id = 'help-backdrop';
        bd.className = 'help-backdrop';
        bd.addEventListener('click', closeHelp);
        document.body.appendChild(bd);
        return bd;
    }

    function ensurePopover() {
        var pop = document.getElementById('help-popover');
        if (pop) return pop;
        pop = document.createElement('div');
        pop.id = 'help-popover';
        pop.className = 'help-popover';
        pop.setAttribute('role', 'dialog');
        pop.innerHTML =
            '<div class="help-popover-header">' +
                '<div class="help-popover-title" id="help-popover-title"></div>' +
                '<button class="help-popover-close" id="help-popover-close" aria-label="閉じる">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button>' +
            '</div>' +
            '<div class="help-popover-body" id="help-popover-body"></div>';
        document.body.appendChild(pop);
        pop.querySelector('#help-popover-close').addEventListener('click', closeHelp);
        return pop;
    }

    function openHelp(key) {
        var entry = HELP_CONTENT[key];
        if (!entry) return;
        var bd = ensureBackdrop();
        var pop = ensurePopover();
        pop.querySelector('#help-popover-title').textContent = entry.title;
        pop.querySelector('#help-popover-body').innerHTML = entry.body;
        bd.classList.add('in');
        pop.classList.add('in');
        document.body.style.overflow = 'hidden';
    }

    function closeHelp() {
        var bd = document.getElementById('help-backdrop');
        var pop = document.getElementById('help-popover');
        if (bd) bd.classList.remove('in');
        if (pop) pop.classList.remove('in');
        document.body.style.overflow = '';
    }

    // ===== ボタン注入 =====
    function makeHelpBtn(key) {
        return '<button type="button" class="help-btn" data-help="' + key + '" aria-label="使い方を表示">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
                '<circle cx="12" cy="12" r="10"/>' +
                '<path d="M9.5 9.5a2.5 2.5 0 1 1 4.5 1.5c-.7.6-1.5 1-1.5 2.2"/>' +
                '<line x1="12" y1="17" x2="12" y2="17.01"/>' +
            '</svg>' +
        '</button>';
    }

    function injectHelpButtons() {
        // KPI ラベルにヘルプを追加
        var kpiMap = {
            'kpi-realestate-priority': 'kpi-priority',
            'kpi-ses-priority':        'kpi-ses',
            'kpi-total-collected':     'kpi-data',
            'kpi-status':              'kpi-status'
        };
        Object.keys(kpiMap).forEach(function(valueId) {
            var v = document.getElementById(valueId);
            if (!v) return;
            var card = v.closest('.kpi-card');
            if (!card) return;
            var label = card.querySelector('.kpi-label');
            if (label && !label.querySelector('.help-btn')) {
                label.insertAdjacentHTML('beforeend', ' ' + makeHelpBtn(kpiMap[valueId]));
            }
        });

        // パネルタイトル → ヘルプボタンをタイトルに追加（panel-title のテキスト内容で識別）
        var panelMap = [
            { match: '価格×利回り',     key: 'panel-scatter' },
            { match: 'SES 単価分布',    key: 'panel-ses-bars' },
            { match: '本日の優良物件',   key: 'panel-realestate-table' },
            { match: 'SES 提案候補',    key: 'panel-ses-table' },
            { match: 'Web Studio',     key: 'panel-web-studio' },
            { match: '過去14日',        key: 'panel-trend' },
            { match: 'データ収集推移',   key: 'panel-trend' }
        ];
        var titles = document.querySelectorAll('.panel-title');
        titles.forEach(function(t) {
            var txt = t.textContent || '';
            for (var i = 0; i < panelMap.length; i++) {
                if (txt.indexOf(panelMap[i].match) >= 0) {
                    if (!t.querySelector('.help-btn')) {
                        t.insertAdjacentHTML('beforeend', ' ' + makeHelpBtn(panelMap[i].key));
                    }
                    break;
                }
            }
        });
    }

    // ===== イベント委譲 =====
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.help-btn');
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            openHelp(btn.getAttribute('data-help'));
        }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeHelp();
    });

    // 起動
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectHelpButtons);
    } else {
        injectHelpButtons();
    }
    // データ更新後にも呼べるよう公開
    window.HelpTour = { inject: injectHelpButtons, open: openHelp, close: closeHelp };
})();
