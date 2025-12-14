// =======================================================
// A. 基本データと要素参照
// =======================================================

const SCORE_TO_WIN = 100;
const TIME_INTERVAL = 4000; // 4秒
const scoreDisplay = document.getElementById('score-display');
const gameArea = document.getElementById('game-area');
const messageBox = document.getElementById('message-box');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');

let currentScore = 0;
let gameTimer = null;
let creatureData = [];
let isPaused = false;

// 非同期でJSONデータを読み込む
async function loadCreatureData() {
    try {
        const response = await fetch('./assets/js/marine_creatures.json');
        const data = await response.json();
        creatureData = data.marineCreatures;
        return creatureData;
    } catch (error) {
        console.error('海洋生物データの読み込みに失敗しました:', error);
        // 読み込みに失敗した場合、デフォルトデータを使用
        creatureData = [
            { id: 1, name: "ハブクラゲ", isPoisonous: true, imageUrl: './assets/images/habukura.jpg' },
            { id: 2, name: "ヒョウモンダコ", isPoisonous: true, imageUrl: './assets/images/hyoumodako.jpg' },
            { id: 3, name: "クマノミ", isPoisonous: true, imageUrl: './assets/images/kumanomi_fake.jpg' },
            { id: 101, name: "ナンヨウハギ", isPoisonous: false, imageUrl: './assets/images/nanyouhagi.jpg' },
            { id: 102, name: "アオウミガメ", isPoisonous: false, imageUrl: './assets/images/aoumigame.jpg' },
            { id: 103, name: "クマノミ", isPoisonous: false, imageUrl: './assets/images/kumanomi_real.jpg' }
        ];
        return creatureData;
    }
}

// 最適化：データを有毒と無毒のリストに分離し、ランダム選択を容易にする
let POISONOUS_CREATURES = [];
let HARMLESS_CREATURES = [];

// =======================================================
// B. コアゲーム関数
// =======================================================

/**
 * @function updateScore
 * スコアを更新し、目標に達成したらゲームを終了する
 */
function updateScore(points) {
    // ゲームが一時停止中の場合はスコア更新を行わない
    if (isPaused) return;
    
    currentScore += points;
    scoreDisplay.textContent = currentScore;

    if (currentScore >= SCORE_TO_WIN) {
        endGame(true); // 勝利
    }
    
    // スコアが0未満にならないようにする
    if (currentScore < 0) {
        currentScore = 0;
        scoreDisplay.textContent = currentScore;
    }
}

/**
 * @function togglePause
 * ゲームの一時停止/再開状態を切り替える
 */
function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        // ゲームを一時停止
        clearInterval(gameTimer);
        pauseButton.textContent = "再開";
        
        // 一時停止オーバーレイを追加
        const pauseOverlay = document.createElement('div');
        pauseOverlay.className = 'paused-overlay';
        pauseOverlay.id = 'paused-overlay';
        pauseOverlay.textContent = 'PAUSED';
        gameArea.appendChild(pauseOverlay);
    } else {
        // ゲームを再開
        pauseButton.textContent = "一時停止";
        
        // 一時停止オーバーレイを削除
        const pauseOverlay = document.getElementById('paused-overlay');
        if (pauseOverlay) {
            pauseOverlay.remove();
        }
        
        // タイマーを再起動
        gameTimer = setInterval(spawnCreatures, TIME_INTERVAL);
    }
}

/**
 * @function endGame
 * タイマーを停止し、クリアまたは失敗メッセージを表示
 */
function endGame(isWin) {
    clearInterval(gameTimer);
    isPaused = false; // ゲーム終了時に一時停止状態を解除
    
    // 一時停止ボタンを無効化
    pauseButton.disabled = true;
    
    gameArea.innerHTML = ''; // すべての画像をクリア

    // スタート画面を非表示にし、メッセージボックスを表示
    startScreen.classList.add('hidden');
    messageBox.classList.remove('hidden');
    
    document.getElementById('start-button').textContent = "もう一度";

    if (isWin) {
        document.getElementById('message-text').textContent = "🎉 クリアおめでとう！海洋探検家！";
        document.getElementById('sub-text').textContent = "有毒と無毒の生物を見分けられて素晴らしい！安全意識が高いね！";
    } else {
        // ... タイムアップなどの他の失敗条件を設定可能
    }
}

/**
 * @function handleCreatureClick
 * 画像クリックイベントの処理ロジック
 */
function handleCreatureClick(event) {
    // ゲームが一時停止中の場合はクリックを処理しない
    if (isPaused) return;
    
    // クリックされた要素からデータ（isPoisonous）を取得
    const isPoisonous = event.target.dataset.poisonous === 'true';
    const creatureName = event.target.dataset.name;

    // 1. スコア処理ロジック
    if (isPoisonous) {
        updateScore(-10);
        // 🚨 視覚フィードバックと科学知識のヒント
        event.target.classList.add('is-poisonous-feedback');
        setTimeout(() => {
            event.target.classList.remove('is-poisonous-feedback');
        }, 300);
        alert(`🚨 -10点！これは ${creatureName} です！触らないで！`); // 実際のゲームではよりエレガントなトーストやモーダルを使用
    } else {
        updateScore(5);
        // クリックされた無毒生物を削除
        event.target.remove();
    }
}

/**
 * @function createCreatureElement
 * 画像要素を作成し、そのプロパティと配置を設定
 */
function createCreatureElement(creature) {
    const el = document.createElement('div');
    el.className = 'creature';
    
    // 画像背景とデータ属性を設定
    el.style.backgroundImage = `url(${creature.imageUrl})`;
    el.dataset.poisonous = creature.isPoisonous;
    el.dataset.name = creature.name;
    
    // ランダム配置
    const gameAreaWidth = gameArea.clientWidth;
    const gameAreaHeight = gameArea.clientHeight;
    // 画像が部分的にはみ出さないようにする
    const safeX = Math.random() * (gameAreaWidth - 120); // 120 は .creature の幅
    const safeY = Math.random() * (gameAreaHeight - 120); // 120 は .creature の高さ

    el.style.left = `${safeX}px`;
    el.style.top = `${safeY}px`;

    el.addEventListener('click', handleCreatureClick);
    return el;
}

/**
 * @function spawnCreatures
 * ランダムに 3-4 個の生物画像を生成・表示 (1-2 個有毒, 1-2 個無毒)
 */
function spawnCreatures() {
    // ゲームが一時停止中の場合は新しい生物を生成しない
    if (isPaused) return;
    
    // ゲームエリアをクリアし、新しいラウンドを開始
    gameArea.innerHTML = '';
    
    // 一時停止状態の場合、一時停止オーバーレイを再追加
    if (isPaused) {
        const pauseOverlay = document.createElement('div');
        pauseOverlay.className = 'paused-overlay';
        pauseOverlay.id = 'paused-overlay';
        pauseOverlay.textContent = 'PAUSED';
        gameArea.appendChild(pauseOverlay);
        return;
    }

    // 1. 毎回少なくとも 1 個の無毒生物を確保
    const numHarmless = 1 + Math.floor(Math.random() * 2); // 1 または 2 個の無毒
    const numPoisonous = 1 + Math.floor(Math.random() * 2); // 1 または 2 個の有毒

    let creaturesToSpawn = [];

    // 2. 無毒生物をランダムに選択
    for (let i = 0; i < numHarmless; i++) {
        const randomIndex = Math.floor(Math.random() * HARMLESS_CREATURES.length);
        creaturesToSpawn.push(HARMLESS_CREATURES[randomIndex]);
    }

    // 3. 有毒生物をランダムに選択
    for (let i = 0; i < numPoisonous; i++) {
        const randomIndex = Math.floor(Math.random() * POISONOUS_CREATURES.length);
        creaturesToSpawn.push(POISONOUS_CREATURES[randomIndex]);
    }

    // 4. 順序をシャッフル (オプションだが推奨)
    creaturesToSpawn.sort(() => Math.random() - 0.5);

    // 5. ページにレンダリング
    creaturesToSpawn.forEach(creature => {
        const el = createCreatureElement(creature);
        gameArea.appendChild(el);
    });
}

/**
 * @function startGame
 * ゲーム状態を初期化し、タイマーを起動
 */
async function startGame() {
    // データがまだ読み込まれていない場合は先に読み込む
    if (creatureData.length === 0) {
        await loadCreatureData();
        POISONOUS_CREATURES = creatureData.filter(c => c.isPoisonous);
        HARMLESS_CREATURES = creatureData.filter(c => !c.isPoisonous);
    }
    
    currentScore = 0;
    scoreDisplay.textContent = currentScore;
    
    // スタート画面とメッセージボックスを非表示にし、ゲームエリアを表示
    startScreen.classList.add('hidden');
    messageBox.classList.add('hidden');
    
    gameArea.innerHTML = ''; // 画像をクリア
    
    // 一時停止ボタンを有効化
    pauseButton.disabled = false;
    
    isPaused = false; // ゲームが一時停止していないことを確認
    pauseButton.textContent = "一時停止"; // ボタンテキストを設定

    // コアタイマーを起動
    gameTimer = setInterval(spawnCreatures, TIME_INTERVAL);

    // ゲーム開始時に画面上に画像があるようすぐに1回実行
    spawnCreatures();
}

// =======================================================
// C. 起動イベント
// =======================================================
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);

// ゲーム読み込み時に初期起動画面を表示
document.addEventListener('DOMContentLoaded', async () => {
    await loadCreatureData();
    POISONOUS_CREATURES = creatureData.filter(c => c.isPoisonous);
    HARMLESS_CREATURES = creatureData.filter(c => !c.isPoisonous);
    document.getElementById('message-text').textContent = "スタートをクリックして、沖縄の海で無毒な生物を見つけよう！";
    
    // 一時停止ボタンの初期状態を設定
    pauseButton.disabled = true;
    
    // スタート画面が表示されるようにする
    startScreen.classList.remove('hidden');
});