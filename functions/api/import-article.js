/* IsshoHub — AI Article Import Worker (Cloudflare Pages Function) */

export async function onRequestPost(context) {
  const { request, env } = context;

  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = await request.json();
    const content = (body.content || '').trim();

    if (!content) {
      return new Response(JSON.stringify({ error: 'No content provided' }), { status: 400, headers: cors });
    }

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY environment variable not set' }), { status: 500, headers: cors });
    }

    const prompt = `你是 IsshoHub 的文章編輯助手。IsshoHub 是繁體中文與英文雙語的在日外國人資訊平台，讀者主要是移居日本的香港、台灣人。

請分析以下文章內容，生成結構化資料供 CMS 使用。

可用分類（category_key 只能選以下之一）：
- news   → 新聞・資訊
- visa   → 簽證・在留資格
- biz    → 創業・工作
- house  → 住屋
- tax    → 稅務・保險・年金
- life   → 生活
- places → 好去處
- pets   → 寵物
- story  → 人物故事
- culture→ 文化

文章內容：
---
${content.slice(0, 8000)}
---

請只輸出以下 JSON，不要任何其他文字或說明：
{
  "title_tc": "繁體中文標題（吸引人，20字以內）",
  "title_en": "English title (catchy, under 12 words)",
  "excerpt_tc": "繁體中文摘要（80-120字，簡介重點，吸引讀者點閱）",
  "excerpt_en": "English excerpt (80-120 words, summarise key points naturally)",
  "category_key": "最合適的分類key",
  "body_tc": "繁體中文正文（Markdown格式，整理段落，適當加 ## 小標題）",
  "body_en": "English body (Markdown, translate or adapt naturally)",
  "author": "如文章有提及作者名稱就填入，否則空字串"
}`;

    const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      return new Response(JSON.stringify({ error: 'Claude API error: ' + errText }), { status: 500, headers: cors });
    }

    const aiData = await aiResp.json();
    const rawText = (aiData.content?.[0]?.text || '').trim();

    /* Extract JSON block */
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Could not parse AI output', raw: rawText.slice(0, 500) }), { status: 500, headers: cors });
    }

    const article = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify({ ok: true, article }), { headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
}

/* Handle CORS preflight */
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
