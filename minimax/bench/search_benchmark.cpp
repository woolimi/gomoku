#include <sys/time.h>

#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

#include "Board.hpp"
#include "Evaluation.hpp"
#include "Gomoku.hpp"
#include "Minimax.hpp"

namespace {

struct Scenario {
  std::string key;
  std::string description;
  int nextPlayer;
  int goal;
  int lastScore;
  int nextScore;
  bool enableCapture;
  bool enableDoubleThreeRestriction;
  std::vector<std::string> rows;
};

struct Variant {
  std::string key;
  std::string description;
};

struct Options {
  int iterations;
  int warmup;
  bool clearTTEachRun;
  bool quietEngineLogs;
  bool listOnly;
  std::vector<std::string> scenarioKeys;
  std::vector<std::string> variantKeys;

  Options()
      : iterations(1),
        warmup(0),
        clearTTEachRun(true),
        quietEngineLogs(true),
        listOnly(false) {}
};

struct Summary {
  double minMs;
  double avgMs;
  double p50Ms;
  double p95Ms;
  double maxMs;
  std::pair<int, int> lastMove;

  Summary()
      : minMs(0.0), avgMs(0.0), p50Ms(0.0), p95Ms(0.0), maxMs(0.0), lastMove(-1, -1) {}
};

class ScopedCoutSilencer {
 public:
  explicit ScopedCoutSilencer(bool enabled) : enabled_(enabled), oldBuf_(NULL) {
    if (enabled_) oldBuf_ = std::cout.rdbuf(nullStream_.rdbuf());
  }

  ~ScopedCoutSilencer() {
    if (enabled_) std::cout.rdbuf(oldBuf_);
  }

 private:
  bool enabled_;
  std::streambuf* oldBuf_;
  std::ostringstream nullStream_;
};

double nowMs() {
  struct timeval tv;
  gettimeofday(&tv, NULL);
  return tv.tv_sec * 1000.0 + static_cast<double>(tv.tv_usec) / 1000.0;
}

bool parseInt(const std::string& text, int minValue, int& outValue) {
  char* end = NULL;
  const long value = std::strtol(text.c_str(), &end, 10);
  if (text.empty() || end == text.c_str() || *end != '\0' || value < minValue ||
      value > 1000000L) {
    return false;
  }
  outValue = static_cast<int>(value);
  return true;
}

std::string trim(const std::string& s) {
  std::string::size_type start = 0;
  while (start < s.size() && (s[start] == ' ' || s[start] == '\t')) start++;

  std::string::size_type end = s.size();
  while (end > start && (s[end - 1] == ' ' || s[end - 1] == '\t')) end--;

  return s.substr(start, end - start);
}

std::vector<std::string> splitCsv(const std::string& csv) {
  std::vector<std::string> out;
  std::string current;
  for (std::string::size_type i = 0; i < csv.size(); ++i) {
    if (csv[i] == ',') {
      const std::string token = trim(current);
      if (!token.empty()) out.push_back(token);
      current.clear();
    } else {
      current.push_back(csv[i]);
    }
  }
  const std::string last = trim(current);
  if (!last.empty()) out.push_back(last);
  return out;
}

bool contains(const std::vector<std::string>& values, const std::string& target) {
  for (std::vector<std::string>::size_type i = 0; i < values.size(); ++i) {
    if (values[i] == target) return true;
  }
  return false;
}

void printUsage(const char* prog) {
  std::cout << "Usage: " << prog << " [options]\n"
            << "  --iterations N         Measured runs per variant/scenario (default: 1)\n"
            << "  --warmup N             Warmup runs per variant/scenario (default: 0)\n"
            << "  --scenario a,b,c       Scenario keys, or 'all' (default: all)\n"
            << "  --variant a,b,c        Variant keys, or 'all' (default: easy,medium,hard)\n"
            << "  --no-tt-clear          Keep TT across runs (default: clear every run)\n"
            << "  --verbose-engine       Show search logs printed by engine\n"
            << "  --list                 Print available scenarios/variants\n"
            << "  --help                 Show this help\n";
}

bool parseArgs(int argc, char** argv, Options& opts) {
  for (int i = 1; i < argc; ++i) {
    const std::string arg(argv[i]);
    if (arg == "--help") {
      printUsage(argv[0]);
      return false;
    }
    if (arg == "--list") {
      opts.listOnly = true;
      continue;
    }
    if (arg == "--iterations" || arg == "--warmup" || arg == "--scenario" || arg == "--variant") {
      if (i + 1 >= argc) {
        std::cerr << "Missing value for " << arg << "\n";
        return false;
      }
      const std::string value(argv[++i]);
      if (arg == "--iterations") {
        if (!parseInt(value, 1, opts.iterations)) {
          std::cerr << "Invalid --iterations value: " << value << "\n";
          return false;
        }
      } else if (arg == "--warmup") {
        if (!parseInt(value, 0, opts.warmup)) {
          std::cerr << "Invalid --warmup value: " << value << "\n";
          return false;
        }
      } else if (arg == "--scenario") {
        opts.scenarioKeys = splitCsv(value);
      } else if (arg == "--variant") {
        opts.variantKeys = splitCsv(value);
      }
      continue;
    }
    if (arg == "--no-tt-clear") {
      opts.clearTTEachRun = false;
      continue;
    }
    if (arg == "--verbose-engine") {
      opts.quietEngineLogs = false;
      continue;
    }
    std::cerr << "Unknown option: " << arg << "\n";
    return false;
  }
  return true;
}

std::vector<std::string> emptyRows() {
  return std::vector<std::string>(BOARD_SIZE, std::string(BOARD_SIZE, '.'));
}

void placeStone(std::vector<std::string>& rows, int x, int y, char stone) {
  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;
  rows[y][x] = stone;
}

Scenario makeOpeningScenario() {
  Scenario s;
  s.key = "opening";
  s.description = "Opening/mildly tactical center fight";
  s.nextPlayer = PLAYER_1;
  s.goal = 5;
  s.lastScore = 0;
  s.nextScore = 0;
  s.enableCapture = true;
  s.enableDoubleThreeRestriction = true;
  s.rows = emptyRows();

  placeStone(s.rows, 9, 9, PLAYER_X);
  placeStone(s.rows, 12, 11, PLAYER_X);
  placeStone(s.rows, 7, 13, PLAYER_X);
  placeStone(s.rows, 5, 8, PLAYER_X);
  placeStone(s.rows, 14, 6, PLAYER_X);
  placeStone(s.rows, 10, 4, PLAYER_X);

  placeStone(s.rows, 10, 10, PLAYER_O);
  placeStone(s.rows, 8, 12, PLAYER_O);
  placeStone(s.rows, 13, 7, PLAYER_O);
  placeStone(s.rows, 6, 9, PLAYER_O);
  placeStone(s.rows, 11, 5, PLAYER_O);
  placeStone(s.rows, 4, 11, PLAYER_O);
  return s;
}

Scenario makeMidgameScenario() {
  Scenario s;
  s.key = "midgame";
  s.description = "Midgame with overlapping attack/block lines";
  s.nextPlayer = PLAYER_1;
  s.goal = 5;
  s.lastScore = 0;
  s.nextScore = 0;
  s.enableCapture = true;
  s.enableDoubleThreeRestriction = true;
  s.rows = emptyRows();

  placeStone(s.rows, 9, 9, PLAYER_X);
  placeStone(s.rows, 11, 10, PLAYER_X);
  placeStone(s.rows, 7, 11, PLAYER_X);
  placeStone(s.rows, 13, 8, PLAYER_X);
  placeStone(s.rows, 6, 6, PLAYER_X);
  placeStone(s.rows, 10, 13, PLAYER_X);
  placeStone(s.rows, 14, 12, PLAYER_X);
  placeStone(s.rows, 5, 10, PLAYER_X);
  placeStone(s.rows, 12, 6, PLAYER_X);
  placeStone(s.rows, 8, 14, PLAYER_X);
  placeStone(s.rows, 3, 8, PLAYER_X);
  placeStone(s.rows, 16, 9, PLAYER_X);

  placeStone(s.rows, 10, 9, PLAYER_O);
  placeStone(s.rows, 12, 10, PLAYER_O);
  placeStone(s.rows, 8, 11, PLAYER_O);
  placeStone(s.rows, 14, 8, PLAYER_O);
  placeStone(s.rows, 7, 6, PLAYER_O);
  placeStone(s.rows, 11, 13, PLAYER_O);
  placeStone(s.rows, 15, 12, PLAYER_O);
  placeStone(s.rows, 6, 10, PLAYER_O);
  placeStone(s.rows, 13, 6, PLAYER_O);
  placeStone(s.rows, 9, 14, PLAYER_O);
  placeStone(s.rows, 4, 8, PLAYER_O);
  placeStone(s.rows, 15, 9, PLAYER_O);
  return s;
}

Scenario makeLateMidgameScenario() {
  Scenario s;
  s.key = "late_midgame";
  s.description = "Dense late-midgame board for deeper pruning pressure";
  s.nextPlayer = PLAYER_1;
  s.goal = 5;
  s.lastScore = 0;
  s.nextScore = 0;
  s.enableCapture = true;
  s.enableDoubleThreeRestriction = true;
  s.rows = emptyRows();

  placeStone(s.rows, 9, 9, PLAYER_X);
  placeStone(s.rows, 11, 10, PLAYER_X);
  placeStone(s.rows, 7, 11, PLAYER_X);
  placeStone(s.rows, 13, 8, PLAYER_X);
  placeStone(s.rows, 6, 6, PLAYER_X);
  placeStone(s.rows, 10, 13, PLAYER_X);
  placeStone(s.rows, 14, 12, PLAYER_X);
  placeStone(s.rows, 5, 10, PLAYER_X);
  placeStone(s.rows, 12, 6, PLAYER_X);
  placeStone(s.rows, 8, 14, PLAYER_X);
  placeStone(s.rows, 3, 8, PLAYER_X);
  placeStone(s.rows, 16, 9, PLAYER_X);
  placeStone(s.rows, 1, 1, PLAYER_X);
  placeStone(s.rows, 3, 3, PLAYER_X);
  placeStone(s.rows, 5, 5, PLAYER_X);
  placeStone(s.rows, 17, 3, PLAYER_X);
  placeStone(s.rows, 15, 5, PLAYER_X);
  placeStone(s.rows, 13, 3, PLAYER_X);
  placeStone(s.rows, 2, 16, PLAYER_X);
  placeStone(s.rows, 4, 14, PLAYER_X);
  placeStone(s.rows, 6, 16, PLAYER_X);
  placeStone(s.rows, 14, 16, PLAYER_X);
  placeStone(s.rows, 16, 14, PLAYER_X);
  placeStone(s.rows, 12, 17, PLAYER_X);

  placeStone(s.rows, 10, 9, PLAYER_O);
  placeStone(s.rows, 12, 10, PLAYER_O);
  placeStone(s.rows, 8, 11, PLAYER_O);
  placeStone(s.rows, 14, 8, PLAYER_O);
  placeStone(s.rows, 7, 6, PLAYER_O);
  placeStone(s.rows, 11, 13, PLAYER_O);
  placeStone(s.rows, 15, 12, PLAYER_O);
  placeStone(s.rows, 6, 10, PLAYER_O);
  placeStone(s.rows, 13, 6, PLAYER_O);
  placeStone(s.rows, 9, 14, PLAYER_O);
  placeStone(s.rows, 4, 8, PLAYER_O);
  placeStone(s.rows, 15, 9, PLAYER_O);
  placeStone(s.rows, 2, 1, PLAYER_O);
  placeStone(s.rows, 4, 3, PLAYER_O);
  placeStone(s.rows, 6, 5, PLAYER_O);
  placeStone(s.rows, 16, 3, PLAYER_O);
  placeStone(s.rows, 14, 5, PLAYER_O);
  placeStone(s.rows, 12, 3, PLAYER_O);
  placeStone(s.rows, 3, 16, PLAYER_O);
  placeStone(s.rows, 5, 14, PLAYER_O);
  placeStone(s.rows, 7, 16, PLAYER_O);
  placeStone(s.rows, 13, 16, PLAYER_O);
  placeStone(s.rows, 15, 14, PLAYER_O);
  placeStone(s.rows, 11, 17, PLAYER_O);
  return s;
}

std::vector<Scenario> buildScenarios() {
  std::vector<Scenario> out;
  out.push_back(makeOpeningScenario());
  out.push_back(makeMidgameScenario());
  out.push_back(makeLateMidgameScenario());
  return out;
}

std::vector<Variant> buildVariants() {
  std::vector<Variant> out;
  Variant easy;
  easy.key = "easy";
  easy.description = "Alpha-beta depth=5 + evaluatePosition";
  out.push_back(easy);

  Variant medium;
  medium.key = "medium";
  medium.description = "Iterative deepening depth<=10, time=0.4s + evaluatePosition";
  out.push_back(medium);

  Variant hard;
  hard.key = "hard";
  hard.description = "PVS depth=10 + evaluatePositionHard";
  out.push_back(hard);
  return out;
}

std::size_t countStones(const Scenario& s) {
  std::size_t count = 0;
  for (std::vector<std::string>::size_type y = 0; y < s.rows.size(); ++y) {
    for (std::string::size_type x = 0; x < s.rows[y].size(); ++x) {
      if (s.rows[y][x] == PLAYER_X || s.rows[y][x] == PLAYER_O) count++;
    }
  }
  return count;
}

bool hasValidBoardShape(const Scenario& s) {
  if (s.rows.size() != static_cast<std::size_t>(BOARD_SIZE)) return false;
  for (std::vector<std::string>::size_type i = 0; i < s.rows.size(); ++i) {
    if (s.rows[i].size() != static_cast<std::size_t>(BOARD_SIZE)) return false;
  }
  return true;
}

std::vector<std::vector<char> > toBoardData(const Scenario& s) {
  std::vector<std::vector<char> > boardData(
      BOARD_SIZE, std::vector<char>(BOARD_SIZE, static_cast<char>(EMPTY_SPACE)));
  for (int y = 0; y < BOARD_SIZE; ++y) {
    for (int x = 0; x < BOARD_SIZE; ++x) {
      boardData[y][x] = s.rows[y][x];
    }
  }
  return boardData;
}

Board* createBoard(const Scenario& s) {
  const int lastPlayer = (s.nextPlayer == PLAYER_1) ? PLAYER_2 : PLAYER_1;
  std::vector<std::vector<char> > boardData = toBoardData(s);
  return new Board(boardData, s.goal, lastPlayer, s.nextPlayer, s.lastScore, s.nextScore,
                   s.enableCapture, s.enableDoubleThreeRestriction);
}

std::pair<int, int> runVariant(const Variant& variant, Board* board) {
  if (variant.key == "easy") {
    Minimax::initKillerMoves();
    return Minimax::getBestMove(board, 5, &Evaluation::evaluatePosition);
  }
  if (variant.key == "medium") {
    return Minimax::iterativeDeepening(board, MAX_DEPTH, 0.4, &Evaluation::evaluatePosition);
  }
  if (variant.key == "hard") {
    return Minimax::getBestMovePVS(board, MAX_DEPTH, &Evaluation::evaluatePositionHard);
  }
  return std::make_pair(-1, -1);
}

double percentile(const std::vector<double>& values, double p) {
  if (values.empty()) return 0.0;
  std::vector<double> sorted(values);
  std::sort(sorted.begin(), sorted.end());
  if (sorted.size() == 1) return sorted[0];

  const double rank = p * static_cast<double>(sorted.size() - 1);
  const std::size_t low = static_cast<std::size_t>(std::floor(rank));
  const std::size_t high = static_cast<std::size_t>(std::ceil(rank));
  const double weight = rank - static_cast<double>(low);
  return sorted[low] * (1.0 - weight) + sorted[high] * weight;
}

Summary summarize(const std::vector<double>& samples, const std::pair<int, int>& lastMove) {
  Summary out;
  out.lastMove = lastMove;
  if (samples.empty()) return out;

  out.minMs = samples[0];
  out.maxMs = samples[0];
  double total = 0.0;
  for (std::vector<double>::size_type i = 0; i < samples.size(); ++i) {
    if (samples[i] < out.minMs) out.minMs = samples[i];
    if (samples[i] > out.maxMs) out.maxMs = samples[i];
    total += samples[i];
  }
  out.avgMs = total / static_cast<double>(samples.size());
  out.p50Ms = percentile(samples, 0.50);
  out.p95Ms = percentile(samples, 0.95);
  return out;
}

std::string moveToString(const std::pair<int, int>& mv) {
  if (mv.first < 0 || mv.second < 0) return "N/A";
  try {
    return Board::convertIndexToCoordinates(mv.first, mv.second);
  } catch (...) {
    return "N/A";
  }
}

std::vector<Scenario> selectScenarios(const std::vector<Scenario>& all,
                                      const std::vector<std::string>& requested) {
  if (requested.empty() || contains(requested, "all")) return all;

  std::vector<Scenario> selected;
  for (std::vector<std::string>::size_type i = 0; i < requested.size(); ++i) {
    for (std::vector<Scenario>::size_type j = 0; j < all.size(); ++j) {
      if (all[j].key == requested[i]) {
        selected.push_back(all[j]);
        break;
      }
    }
  }
  return selected;
}

std::vector<Variant> selectVariants(const std::vector<Variant>& all,
                                    const std::vector<std::string>& requested) {
  if (requested.empty()) {
    std::vector<Variant> defaults;
    for (std::vector<Variant>::size_type i = 0; i < all.size(); ++i) {
      defaults.push_back(all[i]);
    }
    return defaults;
  }
  if (contains(requested, "all")) return all;

  std::vector<Variant> selected;
  for (std::vector<std::string>::size_type i = 0; i < requested.size(); ++i) {
    for (std::vector<Variant>::size_type j = 0; j < all.size(); ++j) {
      if (all[j].key == requested[i]) {
        selected.push_back(all[j]);
        break;
      }
    }
  }
  return selected;
}

void printCatalog(const std::vector<Scenario>& scenarios, const std::vector<Variant>& variants) {
  std::cout << "Available scenarios:\n";
  for (std::vector<Scenario>::size_type i = 0; i < scenarios.size(); ++i) {
    std::cout << "  - " << scenarios[i].key << ": " << scenarios[i].description << "\n";
  }

  std::cout << "Available variants:\n";
  for (std::vector<Variant>::size_type i = 0; i < variants.size(); ++i) {
    std::cout << "  - " << variants[i].key << ": " << variants[i].description << "\n";
  }
}

Summary runBenchmark(const Scenario& scenario, const Variant& variant, const Options& opts) {
  std::vector<double> samples;
  std::pair<int, int> lastMove(-1, -1);

  const int totalRuns = opts.warmup + opts.iterations;
  for (int run = 0; run < totalRuns; ++run) {
    if (opts.clearTTEachRun) transTable.clear();

    Board* board = createBoard(scenario);
    double elapsed = 0.0;
    {
      ScopedCoutSilencer silencer(opts.quietEngineLogs);
      const double t0 = nowMs();
      lastMove = runVariant(variant, board);
      const double t1 = nowMs();
      elapsed = t1 - t0;
    }

    delete board;
    if (run >= opts.warmup) samples.push_back(elapsed);
  }

  return summarize(samples, lastMove);
}

void printHeader() {
  std::cout << std::left << std::setw(12) << "variant" << std::right << std::setw(11) << "avg(ms)"
            << std::setw(11) << "min(ms)" << std::setw(11) << "p50(ms)" << std::setw(11)
            << "p95(ms)" << std::setw(11) << "max(ms)" << std::setw(10) << "move" << "\n";
  std::cout << std::string(77, '-') << "\n";
}

void printRow(const Variant& variant, const Summary& summary) {
  std::cout << std::left << std::setw(12) << variant.key << std::right << std::fixed
            << std::setprecision(2) << std::setw(11) << summary.avgMs << std::setw(11)
            << summary.minMs << std::setw(11) << summary.p50Ms << std::setw(11) << summary.p95Ms
            << std::setw(11) << summary.maxMs << std::setw(10) << moveToString(summary.lastMove)
            << "\n";
}

}  // namespace

int main(int argc, char** argv) {
  Options opts;
  if (!parseArgs(argc, argv, opts)) {
    if (argc > 1 && std::string(argv[1]) == "--help") return 0;
    printUsage(argv[0]);
    return 1;
  }

  const std::vector<Scenario> allScenarios = buildScenarios();
  const std::vector<Variant> allVariants = buildVariants();

  if (opts.listOnly) {
    printCatalog(allScenarios, allVariants);
    return 0;
  }

  const std::vector<Scenario> scenarios = selectScenarios(allScenarios, opts.scenarioKeys);
  const std::vector<Variant> variants = selectVariants(allVariants, opts.variantKeys);

  if (scenarios.empty()) {
    std::cerr << "No scenarios selected. Use --list to inspect valid keys.\n";
    return 1;
  }
  if (variants.empty()) {
    std::cerr << "No variants selected. Use --list to inspect valid keys.\n";
    return 1;
  }

  for (std::vector<Scenario>::size_type i = 0; i < scenarios.size(); ++i) {
    if (!hasValidBoardShape(scenarios[i])) {
      std::cerr << "Scenario '" << scenarios[i].key << "' has invalid board dimensions.\n";
      return 1;
    }
  }

  initZobrist();
  Evaluation::initCombinedPatternScoreTables();
  Evaluation::initCombinedPatternScoreTablesHard();

  std::cout << "Search benchmark\n";
  std::cout << "  iterations: " << opts.iterations << ", warmup: " << opts.warmup
            << ", clear_tt_each_run: " << (opts.clearTTEachRun ? "true" : "false") << "\n";
  std::cout << "  quiet_engine_logs: " << (opts.quietEngineLogs ? "true" : "false") << "\n";

  for (std::vector<Scenario>::size_type i = 0; i < scenarios.size(); ++i) {
    const Scenario& scenario = scenarios[i];
    const char nextStone = (scenario.nextPlayer == PLAYER_1) ? PLAYER_X : PLAYER_O;

    std::cout << "\nScenario: " << scenario.key << " (" << scenario.description << ")\n";
    std::cout << "  stones: " << countStones(scenario) << ", next: " << nextStone << "\n";
    printHeader();

    for (std::vector<Variant>::size_type j = 0; j < variants.size(); ++j) {
      const Summary result = runBenchmark(scenario, variants[j], opts);
      printRow(variants[j], result);
    }
  }

  return 0;
}
