// =======================================================
// A. 基础数据和元素引用
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

// 异步加载JSON数据
async function loadCreatureData() {
    try {
        const response = await fetch('./assets/js/marine_creatures.json');
        const data = await response.json();
        creatureData = data.marineCreatures;
        return creatureData;
    } catch (error) {
        console.error('无法加载海洋生物数据:', error);
        // 如果加载失败，则使用默认数据
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

// 优化：将数据分离为有毒和无毒列表，方便随机选取
let POISONOUS_CREATURES = [];
let HARMLESS_CREATURES = [];

// =======================================================
// B. 核心游戏函数
// =======================================================

/**
 * @function updateScore
 * 更新分数并在达到目标时结束游戏
 */
function updateScore(points) {
    // 如果游戏已暂停，则不处理分数更新
    if (isPaused) return;
    
    currentScore += points;
    scoreDisplay.textContent = currentScore;

    if (currentScore >= SCORE_TO_WIN) {
        endGame(true); // 胜利
    }
    
    // 确保分数不会低于0
    if (currentScore < 0) {
        currentScore = 0;
        scoreDisplay.textContent = currentScore;
    }
}

/**
 * @function togglePause
 * 切换游戏暂停/继续状态
 */
function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        // 暂停游戏
        clearInterval(gameTimer);
        pauseButton.textContent = "再開";
        
        // 添加暂停遮罩
        const pauseOverlay = document.createElement('div');
        pauseOverlay.className = 'paused-overlay';
        pauseOverlay.id = 'paused-overlay';
        pauseOverlay.textContent = 'PAUSED';
        gameArea.appendChild(pauseOverlay);
    } else {
        // 继续游戏
        pauseButton.textContent = "一時停止";
        
        // 移除暂停遮罩
        const pauseOverlay = document.getElementById('paused-overlay');
        if (pauseOverlay) {
            pauseOverlay.remove();
        }
        
        // 重新启动计时器
        gameTimer = setInterval(spawnCreatures, TIME_INTERVAL);
    }
}

/**
 * @function endGame
 * 停止计时器并显示通关或失败信息
 */
function endGame(isWin) {
    clearInterval(gameTimer);
    isPaused = false; // 确保游戏结束时取消暂停状态
    
    // 禁用暂停按钮
    pauseButton.disabled = true;
    
    gameArea.innerHTML = ''; // 清空所有图片

    // 隐藏开始界面，显示消息框
    startScreen.classList.add('hidden');
    messageBox.classList.remove('hidden');
    
    document.getElementById('start-button').textContent = "再チャレンジ";

    if (isWin) {
        document.getElementById('message-text').textContent = "🎉 通关成功！海洋探险家！";
        document.getElementById('sub-text').textContent = "您成功区分了有毒和无毒生物，安全意识很棒！";
    } else {
        // ... 可以设置其他失败条件，例如时间到
    }
}

/**
 * @function handleCreatureClick
 * 处理图片点击事件的逻辑
 */
function handleCreatureClick(event) {
    // 如果游戏已暂停，则不处理点击
    if (isPaused) return;
    
    // 从点击的元素上获取其携带的数据（isPoisonous）
    const isPoisonous = event.target.dataset.poisonous === 'true';
    const creatureName = event.target.dataset.name;

    // 1. 计分逻辑
    if (isPoisonous) {
        updateScore(-10);
        // 🚨 视觉反馈和科普提示
        event.target.classList.add('is-poisonous-feedback');
        setTimeout(() => {
            event.target.classList.remove('is-poisonous-feedback');
        }, 300);
        alert(`🚨 -10分！这是 ${creatureName}！请不要触碰！`); // 实际游戏中用更优雅的Toast或模态框
    } else {
        updateScore(5);
        // 移除被点击的无毒生物
        event.target.remove();
    }
}

/**
 * @function createCreatureElement
 * 创建一个图片元素并设置其属性和定位
 */
function createCreatureElement(creature) {
    const el = document.createElement('div');
    el.className = 'creature';
    
    // 设置图片背景和数据属性
    el.style.backgroundImage = `url(${creature.imageUrl})`;
    el.dataset.poisonous = creature.isPoisonous;
    el.dataset.name = creature.name;
    
    // 随机定位
    const gameAreaWidth = gameArea.clientWidth;
    const gameAreaHeight = gameArea.clientHeight;
    // 确保图片不会部分溢出
    const safeX = Math.random() * (gameAreaWidth - 120); // 120 是 .creature 的宽度
    const safeY = Math.random() * (gameAreaHeight - 120); // 120 是 .creature 的高度

    el.style.left = `${safeX}px`;
    el.style.top = `${safeY}px`;

    el.addEventListener('click', handleCreatureClick);
    return el;
}

/**
 * @function spawnCreatures
 * 随机生成并显示 3-4 个生物图片 (1-2 有毒, 1-2 无毒)
 */
function spawnCreatures() {
    // 如果游戏已暂停，则不生成新生物
    if (isPaused) return;
    
    // 清空游戏区，开始新一轮显示
    gameArea.innerHTML = '';
    
    // 如果处于暂停状态，重新添加暂停遮罩
    if (isPaused) {
        const pauseOverlay = document.createElement('div');
        pauseOverlay.className = 'paused-overlay';
        pauseOverlay.id = 'paused-overlay';
        pauseOverlay.textContent = 'PAUSED';
        gameArea.appendChild(pauseOverlay);
        return;
    }

    // 1. 确保每次至少有 1 个无毒生物
    const numHarmless = 1 + Math.floor(Math.random() * 2); // 1 或 2 个无毒
    const numPoisonous = 1 + Math.floor(Math.random() * 2); // 1 或 2 个有毒

    let creaturesToSpawn = [];

    // 2. 随机选取 无毒生物
    for (let i = 0; i < numHarmless; i++) {
        const randomIndex = Math.floor(Math.random() * HARMLESS_CREATURES.length);
        creaturesToSpawn.push(HARMLESS_CREATURES[randomIndex]);
    }

    // 3. 随机选取 有毒生物
    for (let i = 0; i < numPoisonous; i++) {
        const randomIndex = Math.floor(Math.random() * POISONOUS_CREATURES.length);
        creaturesToSpawn.push(POISONOUS_CREATURES[randomIndex]);
    }

    // 4. 打乱顺序 (可选，但推荐)
    creaturesToSpawn.sort(() => Math.random() - 0.5);

    // 5. 渲染到页面
    creaturesToSpawn.forEach(creature => {
        const el = createCreatureElement(creature);
        gameArea.appendChild(el);
    });
}

/**
 * @function startGame
 * 初始化游戏状态并启动计时器
 */
async function startGame() {
    // 如果还没有加载数据，则先加载
    if (creatureData.length === 0) {
        await loadCreatureData();
        POISONOUS_CREATURES = creatureData.filter(c => c.isPoisonous);
        HARMLESS_CREATURES = creatureData.filter(c => !c.isPoisonous);
    }
    
    currentScore = 0;
    scoreDisplay.textContent = currentScore;
    
    // 隐藏开始界面和消息框，显示游戏区域
    startScreen.classList.add('hidden');
    messageBox.classList.add('hidden');
    
    gameArea.innerHTML = ''; // 清空图片
    
    // 启用暂停按钮
    pauseButton.disabled = false;
    
    isPaused = false; // 确保游戏未暂停
    pauseButton.textContent = "一時停止"; // 设置按钮文本

    // 启动核心计时器
    gameTimer = setInterval(spawnCreatures, TIME_INTERVAL);

    // 立即运行一次，以便游戏开始时屏幕上有图片
    spawnCreatures();
}

// =======================================================
// C. 启动事件
// =======================================================
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);

// 游戏加载时显示初始启动界面
document.addEventListener('DOMContentLoaded', async () => {
    await loadCreatureData();
    POISONOUS_CREATURES = creatureData.filter(c => c.isPoisonous);
    HARMLESS_CREATURES = creatureData.filter(c => !c.isPoisonous);
    document.getElementById('message-text').textContent = "点击开始，在冲绳的海洋里找出无毒的生物吧！";
    
    // 初始化暂停按钮状态
    pauseButton.disabled = true;
    
    // 确保开始界面可见
    startScreen.classList.remove('hidden');
});