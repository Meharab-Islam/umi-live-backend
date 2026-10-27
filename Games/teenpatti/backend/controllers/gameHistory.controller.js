const GameHistorySchema = require("../model/GameHistorySchema");
const GameAdminCoinSchema = require("../model/gameAdminCoinSchema");

exports.getIndex = async (req, res) => {
  try {
    const adminCoin = await GameAdminCoinSchema.findOne();

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    let dateFilterQuery = {};
    if (req.query.startDate == "Hr" && req.query.endDate == "Hr") {
      const currentDate = new Date();
      currentDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

      const oneHourAgo = new Date(currentDate);
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      dateFilterQuery = {
        createdAt: {
          $gte: oneHourAgo,
          $lte: currentDate,
        },
      };
    } else if (req.query.startDate !== "ALL" && req.query.endDate !== "ALL") {
      sDate = req.query.startDate + "T00:00:00.000Z"; //2023-09-14
      eDate = req.query.endDate + "T00:00:00.000Z"; //2023-09-14

      //for date query

      dateFilterQuery = {
        analytic: {
          $gte: new Date(sDate),
          $lte: new Date(eDate),
        },
      };
    } else {
    }

    const gameHistories = await GameHistorySchema.aggregate([
      {
        $addFields: {
          analytic: {
            $toDate: { $arrayElemAt: [{ $split: ["$date", ", "] }, 0] },
          },
        },
      },
      {
        $match: dateFilterQuery,
      },
      {
        $sort: {
          _id: -1,
        },
      },
      {
        $facet: {
          history: [
            { $skip: (start - 1) * limit }, // how many records you want to skip
            { $limit: limit },
          ],
          pageInfo: [
            { $group: { _id: null, count: { $sum: 1 } } }, // get total records count
          ],
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "Success!!",
      adminCoin: adminCoin.coin,
      totalPage: gameHistories[0]?.pageInfo[0]?.count,
      gameHistories: gameHistories[0]?.history,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

exports.result = async (req, res) => {
  try {
    const gameHistories = await GameHistorySchema.find({})
      .sort({ _id: -1 })
      .limit(10);

    return res.status(200).json({
      status: true,
      message: "Success!!",
      gameHistories: gameHistories,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};
