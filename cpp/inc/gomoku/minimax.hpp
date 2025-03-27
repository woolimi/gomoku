#ifndef MINMAX_HPP
#define MINMAX_HPP

#include <algorithm>
#include <cmath>
#include <string>
#include <utility>
#include <vector>

#include "Board.hpp"
#include "Gomoku.hpp"
#include "Rules.hpp"

#define GOMOKU 10000000
#define OPEN_LINE_4 100000
#define OPEN_LINE_3 1000
#define OPEN_LINE_2 100
#define OPEN_LINE_1 10
#define BLOCKED_LINE_5 99900
#define BLOCKED_LINE_4 10000
#define BLOCKED_LINE_3 100
#define BLOCKED_LINE_2 10
#define BLOCKED_LINE_1 1
#define OPEN_SINGLE_STONE 10
#define CAPTURE_SCORE 500

// Window extraction settings.
// SIDE_WINDOW_SIZE: the number of cells to extract on each side (excluding center).
#define SIDE_WINDOW_SIZE_TMP 4
// Combined window size always equals 2*SIDE_WINDOW_SIZE + 1 (center cell + cells on both sides).
#define COMBINED_WINDOW_SIZE_TMP (2 * SIDE_WINDOW_SIZE_TMP + 1)
// - Shifting 1 left by (2 * COMBINED_WINDOW_SIZE) is equivalent to 2^(2 * COMBINED_WINDOW_SIZE),
//   which is the total number of unique patterns that can be represented.
#define LOOKUP_TABLE_SIZE_TMP (1 << (2 * COMBINED_WINDOW_SIZE_TMP))

namespace Minimax {

// // Global lookup table for combined patterns.
// extern int combinedPatternScoreTablePlayerOne[LOOKUP_TABLE_SIZE_TMP];
// extern int combinedPatternScoreTablePlayerTwo[LOOKUP_TABLE_SIZE_TMP];

// // Initializes the lookup table for combined patterns.
// void initCombinedPatternScoreTablesToRemove();

// // Evaluates the board position at (x,y) for the given player.
// // Returns a heuristic score computed by summing the scores from the four axes.
// int evaluatePositionToRemove(Board *&board, int player, int x, int y);

// // Helper: Evaluates one axis (direction dx,dy) at (x,y) by combining the forward
// // and backward windows with the center move, then using the lookup table.
// int evaluateCombinedAxis(Board *board, int player, int x, int y, int dx, int dy);

// // Helper: Extracts a window of 'length' cells as a bit-packed integer,
// // starting from (x,y) moving in direction (dx,dy). Out-of-bound cells are marked with
// // OUT_OF_BOUNDS.
// unsigned int extractLineAsBits(Board *board, int x, int y, int dx, int dy, int length);

// // Helper: Reverses a bit-packed pattern over 'windowSize' cells (each cell: 2 bits).
// unsigned int reversePattern(unsigned int pattern, int windowSize);

// Helper: Given a combined pattern (of COMBINED_WINDOW_SIZE cells),
// decode it into an array and return a heuristic score based on the contiguous run
// (including the center), open ends, and capture opportunities.
// int evaluateCombinedPattern(int combinedPattern, int player);
std::vector<std::pair<int, int> > generateCandidateMoves(Board *&board);

void printBoardWithCandidates(Board *&board, const std::vector<std::pair<int, int> > &candidates);

std::pair<int, int> getBestMove(Board *board, int depth);

void simulateAIBattle(Board *pBoard, int searchDepth, int numTurns);

}  // namespace Minimax

#endif  // MINMAX_HPP
