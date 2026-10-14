const DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
};

export default class Game {
    constructor(lines) {
        this.board = [];
        this.load(lines);
    }

    load(lines) {
        for (let y = 0; y < lines.length; y++) {
            const row = [];
            for (let x = 0; x < lines[y].length; x++) {
                const tile = lines[y][x];
                if (tile === '#') row.push('wall');
                else if (tile === '.') row.push('goal');
                else if (tile === '$') row.push('crate');
                else if (tile === '*') row.push('crate-goal');
                else if (tile === '+') row.push('player-goal-down');
                else if (tile === '@') row.push('player-down');
                else row.push('floor');
            }
            this.board.push(row);
        }
        this.hideSurroundedWalls();
    }

    hideSurroundedWalls() {
        const hidden = [];
        for (let y = 0; y < this.board.length; y++) {
            for (let x = 0; x < this.board[y].length; x++) {
                if (this.board[y][x] !== 'wall') continue;
                let surrounded = true;
                for (let offsetY = -1; offsetY <= 1; offsetY++) {
                    for (let offsetX = -1; offsetX <= 1; offsetX++) {
                        const neighborY = y + offsetY;
                        const neighborX = x + offsetX;
                        if (neighborY >= 0 && neighborY < this.board.length && neighborX >= 0 && neighborX < this.board[neighborY].length && this.board[neighborY][neighborX] !== 'wall') surrounded = false;
                    }
                }
                if (surrounded) hidden.push({ x: x, y: y });
            }
        }
        for (let index = 0; index < hidden.length; index++) this.board[hidden[index].y][hidden[index].x] = 'empty';
    }

    findPlayer() {
        for (let y = 0; y < this.board.length; y++) {
            for (let x = 0; x < this.board[y].length; x++) {
                if (this.board[y][x].indexOf('player') === 0) return { x: x, y: y };
            }
        }
        return null;
    }

    isCrate(tile) {
        return tile === 'crate' || tile === 'crate-goal';
    }

    isWalkable(x, y) {
        return y >= 0 && y < this.board.length && x >= 0 && x < this.board[y].length && this.board[y][x] !== 'wall' && !this.isCrate(this.board[y][x]);
    }

    playerTile(tile, direction) {
        return (tile === 'goal' || tile === 'crate-goal' ? 'player-goal-' : 'player-') + direction;
    }

    floorTile(tile) {
        return tile.indexOf('goal') >= 0 ? 'goal' : 'floor';
    }

    move(direction) {
        const delta = DIRECTIONS[direction];
        const player = this.findPlayer();
        if (!delta || !player) return false;

        const targetX = player.x + delta.x;
        const targetY = player.y + delta.y;
        if (targetY < 0 || targetY >= this.board.length || targetX < 0 || targetX >= this.board[targetY].length || this.board[targetY][targetX] === 'wall') return false;

        const target = this.board[targetY][targetX];
        if (this.isCrate(target)) {
            const crateX = targetX + delta.x;
            const crateY = targetY + delta.y;
            if (!this.isWalkable(crateX, crateY)) return false;
            this.board[crateY][crateX] = this.board[crateY][crateX] === 'goal' ? 'crate-goal' : 'crate';
        }

        this.board[player.y][player.x] = this.floorTile(this.board[player.y][player.x]);
        this.board[targetY][targetX] = this.playerTile(target, direction);
        return true;
    }

    isWon() {
        let hasGoal = false;
        for (let y = 0; y < this.board.length; y++) {
            for (let x = 0; x < this.board[y].length; x++) {
                const tile = this.board[y][x];
                if (tile.indexOf('goal') < 0) continue;
                hasGoal = true;
                if (tile !== 'crate-goal') return false;
            }
        }
        return hasGoal;
    }

    getState() {
        return this.board;
    }
}
