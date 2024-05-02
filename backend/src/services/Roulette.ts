// ===========================
// SECTION | IMPORTS
// ===========================

// =========================== !SECTION

// ===========================
// SECTION | Roulette
// ===========================
export class Roulette {
  static generateRouletteStopPoint() {
    const random = Math.random();
    if (random < 0.05) {
      return 0;
    } else if (random < 0.525) {
      return Math.floor(Math.random() * 7) + 1;
    } else {
      return Math.floor(Math.random() * 7) + 8;
    }
  }
}
// =========================== !SECTION
