export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const bodyStr = buffer.toString('utf8');
    
    const getVal = (key) => {
      const match = bodyStr.match(new RegExp(`name="${key}"[\\s\\S]*?\\r\\n\\r\\n([\\s\\S]*?)\\r\\n`));
      return match ? match[1].trim() : '';
    };

    const productName = getVal('productName');
    const keyBenefit = getVal('keyBenefit');
    const bgOption = getVal('bgOption') || 'Fondo Escritorio';

    if (!productName || !keyBenefit) {
      return res.status(400).json({ error: 'Faltan datos obligatorios del producto' });
    }

    const promptTexto = `
      Actúa como un experto en marketing digital. Crea contenidos altamente atractivos para redes sociales.
      Producto: "${productName}"
      Beneficio principal: "${keyBenefit}"
      
      Devuelve la respuesta estrictamente en este formato JSON puro, sin bloques de código markdown ni explicaciones adicionales:
      {
        "instagram_copy": "Un texto persuasivo y comercial para Instagram, usando emojis atractivos, estructura en párrafos y una llamada a la acción.",
        "tiktok_copy": "Un guion o texto dinámico y corto para TikTok, muy moderno, con ganchos iniciales y emojis.",
        "hashtags": "#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5"
      }
    `;

    const textApiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptTexto }] }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!textApiResponse.ok) {
      throw new Error('Fallo al conectar con la API de Gemini');
    }

    const textData = await textApiResponse.json();
    const rawText = textData.candidates[0].content.parts[0].text;
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const generatedContent = JSON.parse(cleanedText);

    let environmentDescription = "modern minimalist aesthetic workspace";
    if (bgOption === 'Fondo Oficina') environmentDescription = "modern corporate office interior with soft natural lighting";
    else if (bgOption === 'Fondo Escritorio') environmentDescription = "clean minimalist desk setup, aesthetic workspace";
    else if (bgOption === 'Fondo cocina') environmentDescription = "luxurious modern kitchen interior, warm ambient lighting";
    else if (bgOption === 'Fondo exterior ciudad') environmentDescription = "stylish urban city background during golden hour";
    else if (bgOption === 'Fondo exterior parque') environmentDescription = "lush green park with natural sunlight";
    else if (bgOption === 'Fondo escritorio de trabajo y PC') environmentDescription = "modern programmer desk setup with laptop and keyboard";

    const visualPrompt = encodeURIComponent(`Professional product photography of ${productName}, commercial advertising for Instagram in a ${environmentDescription}, photorealistic, 8k resolution`);
    const imageUrl = `https://image.pollinations.ai/prompt/${visualPrompt}?width=1080&height=1080&nologo=true`;

    return res.status(200).json({
      instagram_copy: generatedContent.instagram_copy,
      tiktok_copy: generatedContent.tiktok_copy,
      hashtags: generatedContent.hashtags,
      image_url: imageUrl
    });

  } catch (error) {
    console.error('Error en el servidor:', error);
    return res.status(500).json({ error: 'Ocurrió un error en el servidor: ' + error.message });
  }
}