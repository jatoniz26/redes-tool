export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { productName, keyBenefit, bgOption, imageBase64, mimeType } = req.body;

    if (!productName || !keyBenefit) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (productName o keyBenefit)' });
    }

    const contents = [];
    
    let textPrompt = `
      Actúa como un experto en marketing digital y fotografía comercial de productos.
      Producto impreso en 3D: "${productName}"
      Beneficio principal: "${keyBenefit}"
      Entorno visual de venta seleccionado: "${bgOption || 'Fondo Escritorio'}"
      
      Devuelve la respuesta estrictamente en este formato JSON puro, sin bloques de código markdown ni explicaciones adicionales:
      {
        "instagram_copy": "Un texto persuasivo y comercial para Instagram adaptado específicamente a las características visuales del producto, usando emojis atractivos, estructura en párrafos y llamada a la acción.",
        "tiktok_copy": "Un guion dinámico y corto para TikTok, muy moderno, con ganchos iniciales y emojis.",
        "hashtags": "#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5"
      }
    `;

    const parts = [{ text: textPrompt }];

    if (imageBase64 && mimeType) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: imageBase64
        }
      });
    }

    contents.push({ parts });

    // Actualizado al modelo activo gemini-3.6-flash
    const textApiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
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

    let environmentDescription = "close-up macro shot of a clean flat surface, empty space in the foreground";
    if (bgOption === 'Fondo Oficina') environmentDescription = "close-up macro shot of a clean executive office desk surface, empty foreground, blurred office background";
    else if (bgOption === 'Fondo Escritorio') environmentDescription = "close-up macro view of a minimalist aesthetic desk surface, completely empty foreground ready for product placement";
    else if (bgOption === 'Fondo cocina') environmentDescription = "close-up macro shot on a clean marble kitchen countertop surface, empty foreground space";
    else if (bgOption === 'Fondo exterior ciudad') environmentDescription = "close-up macro view of a sleek outdoor table surface, empty foreground, urban bokeh background";
    else if (bgOption === 'Fondo exterior parque') environmentDescription = "close-up macro view of a clean wooden garden bench surface, empty foreground, natural sunlight";
    else if (bgOption === 'Fondo escritorio de trabajo y PC') environmentDescription = "close-up macro view of a clean desk mat surface next to a keyboard, empty space in the foreground";

    const visualPrompt = encodeURIComponent(`Professional macro close-up product photography background, ${environmentDescription}, high-end commercial advertising style for Instagram, photorealistic, 8k resolution, shallow depth of field, strictly NO objects or items taking up the foreground space, completely empty flat surface ready for product placement`);
    
    const imageUrl = `https://image.pollinations.ai/prompt/${visualPrompt}?width=1080&height=1080&nologo=true&enhance=true`;

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