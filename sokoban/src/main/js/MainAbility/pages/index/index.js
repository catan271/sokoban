import storage from '@system.storage';
import app from '@system.app';
import Game from '../../common/game.js';
import { MEDIUM_LEVELS, HARD_LEVELS } from '../../common/levels.js';

const CROWN_STEP_DEGREES = 36;
const SCREEN_SIZE = 454;
const EDGE_SWIPE_THRESHOLD = 40;
const LEVEL_COUNT = 100;
function emptyProgress() {
    return {
        medium: { best: {} },
        hard: { best: {} }
    };
}

function storageKey(difficulty, index) {
    return difficulty + '-' + (index + 1);
}

function validScore(value) {
    const score = Number(value);
    return value !== '' && isFinite(score) && score >= 0 && Math.floor(score) === score;
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
        ['medium', 'hard'].forEach(function (difficulty) {
            for (let index = 0; index < LEVEL_COUNT; index++) {
                storage.get({
                    key: storageKey(difficulty, index),
                    success: function (value) {
                        if (!validScore(value)) return;
                        const savedScore = Number(value);
                        const currentScore = that.progress[difficulty].best[index];
                        if (currentScore === undefined || savedScore < currentScore) {
                            that.progress[difficulty].best[index] = savedScore;
                        }
                        that.refreshCounts();
                        if (that.screen === 'levels' && that.difficulty === difficulty) {
                            that.showDifficulty(difficulty);
                        }
                        if (that.screen === 'game' && that.difficulty === difficulty && that.levelNumber === index + 1) {
                            that.bestScore = that.progress[difficulty].best[index];
                        }
                    }
                });
            }
        });
    },

    saveBestScore(difficulty, index) {
        storage.set({
            key: storageKey(difficulty, index),
            value: String(this.progress[difficulty].best[index])
        });
    },

    refreshCounts() {
        this.completedCountMedium = Object.keys(this.progress.medium.best).length;
        this.completedCountHard = Object.keys(this.progress.hard.best).length;
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
        for (let index = 0; index < LEVEL_COUNT; index++) {
            this.levelItems.push({
                index: index,
                number: index + 1,
                completed: this.progress[difficulty].best[index] !== undefined
            });
        }
        this.screen = 'levels';
    },

    selectLevel(index) {
        if (index < 0 || index >= LEVEL_COUNT) return;
        this.openLevel(index);
    },

    openLevel(index) {
        this.levelNumber = index + 1;
        this.steps = 0;
        this.crownAxis = 'lr';
        this.crownDegrees = 0;
        this.completionVisible = false;
        this.game = new Game(this.levelsForDifficulty(this.difficulty)[index]);
        const bestScore = this.progress[this.difficulty].best[index];
        this.bestScore = bestScore === undefined ? '-' : bestScore;
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
        if (record.best[index] === undefined || this.steps < record.best[index]) {
            record.best[index] = this.steps;
            this.saveBestScore(this.difficulty, index);
        }
        this.bestScore = record.best[index];
        this.refreshCounts();
        this.completionVisible = true;
        const that = this;
        this.completionTimer = setTimeout(function () {
            that.completionVisible = false;
            if (index < LEVEL_COUNT - 1) {
                that.openLevel(index + 1);
            } else {
                that.showDifficulty(that.difficulty);
            }
        }, 3000);
    }
};
