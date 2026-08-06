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

    // Mapeo enfocado estrictamente en un entorno vacío con espacio libre en primer plano para colocar tu impresión 3D
    let environmentDescription = "empty clean surface, empty space in the foreground for product placement";
    if (bgOption === 'Fondo Oficina') environmentDescription = "modern corporate office desk, completely empty surface in the foreground, blurred office interior background";
    else if (bgOption === 'Fondo Escritorio') environmentDescription = "clean minimalist aesthetic desk setup, empty wooden surface in the foreground ready for an object";
    else if (bgOption === 'Fondo cocina') environmentDescription = "luxurious modern white marble kitchen countertop, completely empty foreground space, warm ambient lighting";
    else if (bgOption === 'Fondo exterior ciudad') environmentDescription = "stylish outdoor table surface, empty foreground, urban city background during golden hour with soft bokeh";
    else if (bgOption === 'Fondo exterior parque') environmentDescription = "clean outdoor wooden bench surface, empty foreground, lush green park background with natural sunlight";
    else if (bgOption === 'Fondo escritorio de trabajo y PC') environmentDescription = "modern programmer desk setup with laptop and keyboard in the background, leaving a clean empty space in the foreground";

    // Prompt visual estricto para generar SOLAMENTE el fondo vacío, sin ningún objeto ni producto simulado
    const visualPrompt = encodeURIComponent(`Professional empty commercial studio background, ${environmentDescription}, high-end advertising photography for Instagram, photorealistic, 8k resolution, cinematic lighting, NO objects in the foreground, completely empty space ready for product placement`);
    
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