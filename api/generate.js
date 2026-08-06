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
      Entorno visual de venta: "${bgOption || 'Fondo Escritorio'}"
      
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
      const errorDetails = await textApiResponse.text();
      console.error('Error de Gemini:', errorDetails);
      throw new Error('Fallo al conectar con la API de Gemini');
    }

    const textData = await textApiResponse.json();
    const rawText = textData.candidates[0].content.parts[0].text;
    
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const generatedContent = JSON.parse(cleanedText);

    // Mapeo detallado enfocado 100% en primeros planos (macro / closeup)
    let environmentDescription = "macro photography close-up shot on a clean surface";
    if (bgOption === 'Fondo Oficina') environmentDescription = "macro close-up shot placed prominently on a clean modern executive office desk, blurred corporate background";
    else if (bgOption === 'Fondo Escritorio') environmentDescription = "macro close-up product photography, placed right in the foreground on a minimalist aesthetic desk setup";
    else if (bgOption === 'Fondo cocina') environmentDescription = "macro close-up shot on a luxury clean marble kitchen countertop, shallow depth of field";
    else if (bgOption === 'Fondo exterior ciudad') environmentDescription = "macro close-up product view on a sleek outdoor table, urban city background softly blurred";
    else if (bgOption === 'Fondo exterior parque') environmentDescription = "macro close-up nature photography, placed on a clean wooden surface outdoors, lush green bokeh background";
    else if (bgOption === 'Fondo escritorio de trabajo y PC') environmentDescription = "macro close-up product shot next to modern work gear, sharp focus on the item, blurred tech background";

    // Prompt visual optimizado para máxima nitidez, primer plano y detalle comercial de alta gama
    const visualPrompt = encodeURIComponent(`Extreme close-up macro product photography of ${productName}, sharp crisp focus on the item details, ${environmentDescription}, highly detailed textures, studio commercial lighting, Instagram aesthetic, 8k resolution, photorealistic, masterpiece`);
    
    // Forzamos parámetros de alta calidad en la URL (nologo y mejor renderizado)
    const imageUrl = `https://image.pollinations.ai/prompt/${visualPrompt}?width=1080&height=1080&nologo=true&enhance=true`;

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