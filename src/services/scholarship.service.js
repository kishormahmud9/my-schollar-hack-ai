// 
import dotenv from "dotenv";
dotenv.config();

import axios from "axios";

export async function getAllScholarships() {
  // const SCHOLARSHIP_API = process.env.SCHOLARSHIP_AI_API_URL;
  // scholarship api hard coded 
  const SCHOLARSHIP_API =
    "https://api.myscholarhack.net/api/essay-recommendation/scholarships/all/for-ai";

  console.log("Scholarship API hitting ->", SCHOLARSHIP_API);

  try {
    const response = await axios.get(SCHOLARSHIP_API);

    console.log("Scholarship status:", response.status);

    const data = response.data;
    console.log("Data from scholarship API: successfully data getted ✅",);

    return Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error(
      "Failed to fetch scholarships:",
      error.response?.data || error.message
    );
    throw error;
  }
}
