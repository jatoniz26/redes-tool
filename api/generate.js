export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { productName, keyBenefit, bgOption } = req.body;

    if (!productName || !keyBenefit) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
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

    // Mapeo detallado de entornos enfocados en primer plano y detalle del producto
    let environmentDescription = "on a clean wooden desk surface, macro photography, close-up";
    if (bgOption === 'Fondo Oficina') environmentDescription = "placed on a sleek executive desk inside a modern corporate office, close-up shot, blurred background";
    else if (bgOption === 'Fondo Escritorio') environmentDescription = "placed prominently in the foreground on a clean minimalist aesthetic desk setup, close-up view";
    else if (bgOption === 'Fondo cocina') environmentDescription = "placed on a luxury marble kitchen countertop, close-up product shot, warm ambient lighting";
    else if (bgOption === 'Fondo exterior ciudad') environmentDescription = "placed on an outdoor cafe table with a blurred urban city background during golden hour, close-up";
    else if (bgOption === 'Fondo exterior parque') environmentDescription = "placed outdoors on a wooden bench surrounded by nature and soft natural sunlight, close-up shot";
    else if (bgOption === 'Fondo escritorio de trabajo y PC') environmentDescription = "placed right next to a modern laptop and keyboard on a desk setup, close-up focus on the product";

    // Prompt visual forzado para mantener el producto en primer plano absoluto
    const visualPrompt = encodeURIComponent(`Close-up macro commercial product photography of ${productName}, sharp focus on the object, ${environmentDescription}, high-end advertising style for Instagram, photorealistic, 8k resolution, shallow depth of field`);
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