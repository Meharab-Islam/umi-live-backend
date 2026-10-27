const gameUserBridge = require("../../../gameUserBridge");

exports.getIndex = async (req, res) => {
  try {
    const adminCoin = await gameUserBridge.getAdminCoin('teenpatti');
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const rounds = await gameUserBridge.getRecentRounds('teenpatti', limit);

    return res.status(200).json({
      status: true,
      message: "Success!!",
      adminCoin: adminCoin,
      totalPage: 1,
      gameHistories: rounds.map((r) => ({
        _id: r.id,
        roundNumber: r.round_number,
        winnerIndex: r.winner_outcome,
        totalAdd: r.total_bets,
        winnerCoinMinus: r.total_payout,
        details: r.details,
        date: r.created_at,
      })),
    });
  } catch (error) {
    console.error("teenpatti getIndex error:", error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.result = async (req, res) => {
  try {
    const rounds = await gameUserBridge.getRecentRounds('teenpatti', 10);
    return res.status(200).json({
      status: true,
      message: "Success!!",
      gameHistories: rounds.map((r) => ({
        _id: r.id,
        roundNumber: r.round_number,
        winnerIndex: r.winner_outcome,
        totalAdd: r.total_bets,
        winnerCoinMinus: r.total_payout,
        details: r.details,
        date: r.created_at,
      })),
    });
  } catch (error) {
    console.error("teenpatti result error:", error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
