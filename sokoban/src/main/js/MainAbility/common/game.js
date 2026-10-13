const DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
};

export default class Game {
    constructor(lines) {
        this.base = [];
        this.boxes = [];
        this.player = { x: 0, y: 0, facing: 'down' };
        this.goals = 0;
        this.load(lines);
    }

    load(lines) {
        for (let y = 0; y < lines.length; y++) {
            const row = [];
            for (let x = 0; x < lines[y].length; x++) {
                const tile = lines[y][x];
                const isGoal = tile === '.' || tile === '*' || tile === '+';
                row.push(tile === '#' ? 'wall' : (isGoal ? 'goal' : 'floor'));
                if (tile === '$' || tile === '*') this.boxes.push({ x: x, y: y });
                if (tile === '@' || tile === '+') this.player = { x: x, y: y, facing: 'down' };
                if (isGoal) this.goals++;
            }
            this.base.push(row);
        }
    }

    isSurroundedWall(x, y) {
        if (this.base[y][x] !== 'wall') return false;
        for (let offsetY = -1; offsetY <= 1; offsetY++) {
            for (let offsetX = -1; offsetX <= 1; offsetX++) {
                if (offsetX === 0 && offsetY === 0) continue;
                const neighborY = y + offsetY;
                const neighborX = x + offsetX;
                if (neighborY >= 0 && neighborY < this.base.length && neighborX >= 0 && neighborX < this.base[neighborY].length && this.base[neighborY][neighborX] !== 'wall') return false;
            }
        }
        return true;
    }

    getBoxAt(x, y) {
        for (let index = 0; index < this.boxes.length; index++) {
            if (this.boxes[index].x === x && this.boxes[index].y === y) return this.boxes[index];
        }
        return null;
    }

    isWalkable(x, y) {
        return y >= 0 && y < this.base.length && x >= 0 && x < this.base[y].length && this.base[y][x] !== 'wall';
    }

    move(direction) {
        const delta = DIRECTIONS[direction];
        if (!delta) return false;
        const targetX = this.player.x + delta.x;
        const targetY = this.player.y + delta.y;
        if (!this.isWalkable(targetX, targetY)) return false;

        const box = this.getBoxAt(targetX, targetY);
        if (box) {
            const boxX = targetX + delta.x;
            const boxY = targetY + delta.y;
            if (!this.isWalkable(boxX, boxY) || this.getBoxAt(boxX, boxY)) return false;
            box.x = boxX;
            box.y = boxY;
        }

        this.player.x = targetX;
        this.player.y = targetY;
        this.player.facing = direction;
        return true;
    }

    getState() {
        const board = [];
        let boxesOnGoals = 0;
        for (let y = 0; y < this.base.length; y++) {
            for (let x = 0; x < this.base[y].length; x++) {
                const box = this.getBoxAt(x, y);
                let tile = this.base[y][x];
                if (tile === 'wall' && this.isSurroundedWall(x, y)) tile = 'empty';
                if (box) {
                    tile = tile === 'goal' ? 'crate-goal' : 'crate';
                    if (this.base[y][x] === 'goal') boxesOnGoals++;
                }
                if (this.player.x === x && this.player.y === y) tile = 'player-' + this.player.facing;
                board.push(tile);
            }
        }
        return { won: this.goals > 0 && boxesOnGoals === this.goals, board: board };
    }
}
