import type { NextApiRequest, NextApiResponse } from "next";

const GPT_KEY = process.env.OPENAI_TOKEN

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let body = JSON.parse(req.body);
  const { prompt } = body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GPT_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: `Please summarize the following paragraph, input sections are seperated with "----", please generate output as several bullet point (at most 5, I want each bullet point start with a emoji, please give suitable emoji depends on the context, if you really can't find any suitable emoji, just put: "📍") in markdown format: ${prompt}.`,
          },
        ],
        max_tokens: 2000,
      }),
    });
    const data = await response.json();
    console.log(data);
    res.status(200).json({
      message: "success",
      data,
    });
  } catch (err) {
    console.log("error: ", err);
    res.status(500).json({
      message: `failed: ${err}`,
    });
  }
}
