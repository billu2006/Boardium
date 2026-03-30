class Game {
  constructor(rules) {
    this.rules = rules;
    this.state = rules.getInitialState();
  }

  getState() {
    return this.state;
  }

  getValidMoves() {
    return this.rules.getValidMoves(this.state);
  }

  applyMove(move) {
    if (!this.rules.isValidMove(this.state, move)) {
      throw new Error("Invalid move");
    }

    this.state = this.rules.applyMove(this.state, move);
  }

  isGameOver() {
    return this.rules.isGameOver(this.state);
  }
}

module.exports = Game;