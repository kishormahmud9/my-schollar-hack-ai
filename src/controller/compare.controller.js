import { compareEssays } from "../services/compare.service.js";


export async function compareHandler(req, res) {
  try {
    const { essayA, essayB } = req.body;

    if (!essayA || !essayB) {
      return res.status(400).json({
        error: "Both essays are required"
      });
    }

    const result = await compareEssays(essayA, essayB);
    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Comparison failed",
      details: err.message
    });
  }
}
