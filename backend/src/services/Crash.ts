// ===========================
// SECTION | IMPORTS
// ===========================

// =========================== !SECTION

// ===========================
// SECTION | Crash
// ===========================
export class Crash {
  static generateCrashPoint() {
    // Raise the result of Math.random () to the power of 4
    let result = Math.pow(Math.random(), 10);
    // Multiply by 100
    result *= 100;
    // Ensure the minimum number is 1
    result = Math.max(result, 1);
    // Return the result
    return result;
  }
}
// =========================== !SECTION
