/* IsshoHub — AI Article Import Worker (Cloudflare Pages Function) */

export async function onRequestPost(context) {
  const { request, env } = context;

  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = await request.json();
    const mode    = body.mode || 'import';   /* 'import' | 'write' */
    const content = (body.content || '').trim();
    const topic   = (body.topic   || '').trim();

    if (mode === 'import' && !content) {
      return new Response(JSON.stringify({ error: 'No content provided' }), { status: 400, headers: cors });
    }
    if (mode === 'write' && !topic) {
      return new Response(JSON.stringify({ error: 'No topic provided' }), { status: 400, headers: cors });
    }
    if (mode === 'revise' && (!body.article || !body.revision)) {
      return new Response(JSON.stringify({ error: 'Missing article or revision instructions' }), { status: 400, headers: cors });
    }

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY environment variable not set' }), { status: 500, headers: cors });
    }

    /* Schema for write mode (full body needed) */
    const JSON_SCHEMA_WRITE = `{
  "title_tc": "繁體中文標題（吸引人，20字以內）",
  "title_en": "English title (catchy, under 12 words)",
  "excerpt_tc": "繁體中文摘要（80-120字，簡介重點，吸引讀者點閱）",
  "excerpt_en": "English excerpt (80-120 words, summarise key points naturally)",
  "category_key": "最合適的分類key",
  "body_tc": "繁體中文正文（Markdown格式，800-1200字，適當加 ## 小標題，段落清晰）",
  "body_en": "English body (Markdown, 800-1200 words, natural and engaging)",
  "author": "",
  "image_prompt": "English image generation prompt for cover photo (real-life scene, photography style, mood, lighting. Max 20 words. No text, no logos, no close-up faces.)"
}`;

    /* Schema for import mode (metadata only — body filled from original) */
    const JSON_SCHEMA_IMPORT = `{
  "title_tc": "繁體中文標題（吸引人，20字以內）",
  "title_en": "English title (catchy, under 12 words)",
  "excerpt_tc": "繁體中文摘要（80-120字，簡介重點，吸引讀者點閱）",
  "excerpt_en": "English excerpt (80-120 words, summarise key points naturally)",
  "category_key": "最合適的分類key",
  "author": "如文章有提及作者名稱就填入，否則空字串",
  "original_language": "原文主要語言：'tc'（繁體中文）、'en'（英文）、'both'（中英雙語）",
  "image_prompt": "English image generation prompt for cover photo (real-life scene, photography style, mood, lighting. Max 20 words. No text, no logos, no close-up faces.)"
}`;

    const CATEGORIES = `可用分類（category_key 只能選以下之一）：
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
- invest → 投資`;

    let prompt;

    if (mode === 'revise') {
      const existing = body.article;
      const revision = body.revision;
      prompt = `你是 IsshoHub 的文章編輯助手。以下是一篇已生成的文章 JSON，請根據用戶的修改要求進行修改，輸出更新後的完整 JSON。

現有文章：
${JSON.stringify(existing, null, 2)}

用戶修改要求：
${revision}

請根據要求修改，保持 JSON 結構不變，只輸出更新後的完整 JSON，不要任何其他文字：
${JSON_SCHEMA_WRITE}`;

    } else if (mode === 'write') {
      const category = (body.category || '').trim();
      const notes    = (body.notes    || '').trim();
      prompt = `你是 IsshoHub 的專業撰稿人。IsshoHub 是繁體中文與英文雙語的在日外國人資訊平台，讀者主要是移居日本的香港、台灣人。

請根據以下資訊，撰寫一篇高品質的雙語文章。

題目／主題：${topic}
${category ? '指定分類：' + category : ''}
${notes ? '補充要點／大綱：\n' + notes : ''}

寫作要求：
- 繁體中文版：自然流暢，符合香港／台灣讀者閱讀習慣，實用資訊為主
- 英文版：natural and engaging, suitable for expats in Japan
- 正文 800-1200 字，分段清晰，有小標題
- 內容要實用、具體，避免空泛

${CATEGORIES}

請只輸出以下 JSON，不要任何其他文字：
${JSON_SCHEMA_WRITE}`;

    } else {
      /* Import mode: only extract metadata, body is passed through from original */
      prompt = `你是 IsshoHub 的文章編輯助手。IsshoHub 是繁體中文與英文雙語的在日外國人資訊平台，讀者主要是移居日本的香港、台灣人。

請分析以下文章內容，只需提取元資料（標題、摘要、分類、作者），不需要重寫正文。

【語言規則】
- 標題和摘要：如果原文是繁中，tc填原文，en翻譯；如果是英文，en填原文，tc翻譯；兩語都有則各自填入
- 請只分析文章開頭 3000 字就足夠

${CATEGORIES}

文章內容（只需看前段）：
---
${content.slice(0, 3000)}
---

請只輸出以下 JSON，不要任何其他文字：
${JSON_SCHEMA_IMPORT}`;
    }

    const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      return new Response(JSON.stringify({ error: 'Claude API error: ' + errText }), { status: 500, headers: cors });
    }

    const aiData = await aiResp.json();
    const rawText = (aiData.content?.[0]?.text || '').trim();

    /* Extract JSON — handle plain JSON or ```json ... ``` code blocks */
    let jsonStr = rawText;
    const codeBlock = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1];
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Could not parse AI output', raw: rawText.slice(0, 800) }), { status: 500, headers: cors });
    }

    let article;
    try {
      article = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      /* Try to salvage partial JSON by trimming at last complete field */
      return new Response(JSON.stringify({ error: 'JSON parse error: ' + parseErr.message, raw: jsonMatch[0].slice(0, 800) }), { status: 500, headers: cors });
    }
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
