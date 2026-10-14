import storage from '@system.storage';
import app from '@system.app';
import Game from '../../common/game.js';
import { MEDIUM_LEVELS, HARD_LEVELS } from '../../common/levels.js';

const STORAGE_KEY = 'sokoban-progress-v1';
const CROWN_STEP_DEGREES = 36;
const SCREEN_SIZE = 454;
const EDGE_SWIPE_THRESHOLD = 40;
function emptyProgress() {
    return {
        medium: { completed: {}, best: {} },
        hard: { completed: {}, best: {} }
    };
}

function validProgress(progress) {
    return progress && progress.medium && progress.hard && progress.medium.completed && progress.medium.best && progress.hard.completed && progress.hard.best;
}

function startsAtEdge(event) {
    const distance = event.distance || 0;
    if (event.direction === 'right') return event.globalX - distance <= EDGE_SWIPE_THRESHOLD;
    if (event.direction === 'left') return event.globalX + distance >= SCREEN_SIZE - EDGE_SWIPE_THRESHOLD;
    return false;
}

export default {
    data: {
        screen: 'menu',
        difficulty: '',
        levelItems: [],
        tiles: [],
        levelNumber: 0,
        steps: 0,
        bestScore: '-',
        crownAxis: 'lr',
        completionVisible: false,
        completedCountMedium: 0,
        completedCountHard: 0
    },

    onInit() {
        this.progress = emptyProgress();
        this.game = null;
        this.crownDegrees = 0;
        this.completionTimer = null;
        this.restoreProgress();
    },

    onShow() {
        if (this.$refs.crownTarget && this.$refs.crownTarget.rotation) {
            this.$refs.crownTarget.rotation();
        }
        setMonitorForCrownEvents(this.handleCrown.bind(this));
    },

    onDestroy() {
        if (this.completionTimer) clearTimeout(this.completionTimer);
    },

    restoreProgress() {
        const that = this;
        storage.get({
            key: STORAGE_KEY,
            success: function (value) {
                try {
                    const progress = JSON.parse(value);
                    if (validProgress(progress)) that.progress = progress;
                } catch (error) {
                    console.log(value)
                    console.warn('Unable to restore Sokoban progress');
                }
                that.refreshCounts();
            },
            fail: function () {
                that.refreshCounts();
            }
        });
    },

    saveProgress() {
        storage.set({ key: STORAGE_KEY, value: JSON.stringify(this.progress) });
    },

    refreshCounts() {
        this.completedCountMedium = Object.keys(this.progress.medium.completed).length;
        this.completedCountHard = Object.keys(this.progress.hard.completed).length;
    },

    levelsForDifficulty(difficulty) {
        return difficulty === 'hard' ? HARD_LEVELS : MEDIUM_LEVELS;
    },

    showMedium() {
        this.showDifficulty('medium');
    },

    showHard() {
        this.showDifficulty('hard');
    },

    showDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.levelItems = [];
        for (let index = 0; index < 100; index++) {
            this.levelItems.push({
                index: index,
                number: index + 1,
                completed: !!this.progress[difficulty].completed[index]
            });
        }
        this.screen = 'levels';
    },

    selectLevel(index) {
        if (index < 0 || index >= 100) return;
        this.openLevel(index);
    },

    openLevel(index) {
        this.levelNumber = index + 1;
        this.steps = 0;
        this.crownAxis = 'lr';
        this.crownDegrees = 0;
        this.completionVisible = false;
        this.game = new Game(this.levelsForDifficulty(this.difficulty)[index]);
        this.bestScore = this.progress[this.difficulty].best[index] || '-';
        this.updateBoard();
        this.screen = 'game';
    },

    updateBoard() {
        const board = this.game.getState();
        const tiles = [];
        for (let row = 0; row < board.length; row++) {
            const tileRow = [];
            for (let column = 0; column < board[row].length; column++) {
                const tile = board[row][column];
                tileRow.push(tile.indexOf('player') === 0 ? 'player' : tile);
            }
            tiles.push(tileRow);
        }
        this.tiles = tiles;
    },

    move(direction) {
        if (!this.game || this.completionVisible || !this.game.move(direction)) return;
        this.steps++;
        this.updateBoard();
        if (this.game.isWon()) this.completeLevel();
    },

    handleSwipe(event) {
        if (this.screen === 'menu' && startsAtEdge(event)) {
            app.terminate();
            return;
        }
        if (this.screen === 'levels' && startsAtEdge(event)) {
            this.screen = 'menu';
            return;
        }
        if (this.screen === 'game' && startsAtEdge(event)) {
            this.showDifficulty(this.difficulty);
            return;
        }
        if (this.screen !== 'game') return;
        if (event.direction === 'left' || event.direction === 'right') this.crownAxis = 'lr';
        if (event.direction === 'up' || event.direction === 'down') this.crownAxis = 'ud';
        this.move(event.direction);
    },

    toggleAxis() {
        if (this.screen !== 'game' || this.completionVisible) return;
        this.crownAxis = this.crownAxis === 'lr' ? 'ud' : 'lr';
        this.crownDegrees = 0;
    },

    handleCrown(events) {
        const event = Array.isArray(events) ? events[events.length - 1] : events;
        if (this.screen !== 'game' || this.completionVisible || !event || !event.degree) return;
        this.crownDegrees += event.degree;
        if (Math.abs(this.crownDegrees) < CROWN_STEP_DEGREES) return;
        const turningUp = this.crownDegrees < 0;
        this.crownDegrees = 0;
        if (this.crownAxis === 'lr') {
            this.move(turningUp ? 'left' : 'right');
        } else {
            this.move(turningUp ? 'up' : 'down');
        }
    },

    completeLevel() {
        const index = this.levelNumber - 1;
        const record = this.progress[this.difficulty];
        record.completed[index] = true;
        if (!record.best[index] || this.steps < record.best[index]) record.best[index] = this.steps;
        this.bestScore = record.best[index];
        this.saveProgress();
        this.refreshCounts();
        this.completionVisible = true;
        const that = this;
        this.completionTimer = setTimeout(function () {
            that.completionVisible = false;
            if (index < 99) {
                that.openLevel(index + 1);
            } else {
                that.showDifficulty(that.difficulty);
            }
        }, 3000);
    }
};
