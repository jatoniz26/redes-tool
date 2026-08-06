export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { productName, keyBenefit, bgOption } = req.body;

    if (!productName || !keyBenefit) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (productName o keyBenefit)' });
    }

    const promptTexto = `
      Actúa como un experto en marketing digital. Crea contenidos altamente atractivos para redes sociales.
      Producto: "${productName}"
      Beneficio principal: "${keyBenefit}"
      Entorno/Fondo visual deseado: "${bgOption || 'Fondo Escritorio'}"
      
      Devuelve la respuesta estrictamente en este formato JSON puro, sin bloques de código markdown ni explicaciones adicionales:
      {
        "instagram_copy": "Un texto persuasivo y comercial para Instagram, usando emojis atractivos, estructura en párrafos y una llamada a la acción.",
        "tiktok_copy": "Un guion o trady dinámico y corto para TikTok, muy moderno, con ganchos iniciales y emojis.",
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
      const errorDetails = await textApiResponse.text();
      console.error('Error de Gemini:', errorDetails);
      throw new Error('Fallo al conectar con la API de Gemini');
    }

    const textData = await textApiResponse.json();
    const rawText = textData.candidates[0].content.parts[0].text;
    
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const generatedContent = JSON.parse(cleanedText);

    // Prompt visual optimizado para Instagram: Enfoca claramente el producto y aplica un entorno estético comercial
    const visualDescription = `Commercial product photography of a ${productName}, prominently featured in the foreground, highly detailed, professional studio lighting, placed inside a aesthetic ${bgOption}, photorealistic, social media style, high quality`;
    const visualPrompt = encodeURIComponent(visualDescription);
    const imageUrl = `https://image.pollinations.ai/prompt/${visualPrompt}?width=1080&height=1080&nologo=true`;

    return res.status(200).json({
      instagram_copy: generatedContent.instagram_copy,
      tiktok_copy: generatedContent.tiktok_copy,
      hashtags: generatedContent.hashtags,
      image_url: imageUrl
    });

  } catch (error) {
    console.error('Error en el servidor:', error);
    return res.status(500).json({ error: 'Ocurrió un error generando el contenido: ' + error.message });
  }
}