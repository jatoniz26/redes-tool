export default async function handler(req, res) {
  // 1. Seguridad: Solo permitir peticiones POST desde tu formulario
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // 2. Extraer los datos enviados desde tu frontend
    const { productName, keyBenefit, bgOption, image } = req.body;

    if (!productName || !keyBenefit) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    // 3. Preparar las instrucciones para Gemini
    const promptTexto = `
      Crea textos promocionales para un producto llamado "${productName}". 
      Beneficio principal: "${keyBenefit}".
      Entorno de la foto: "${bgOption}".
      
      Devuelve la respuesta estrictamente en este formato JSON sin markdown, ni formato adicional, solo el objeto puro:
      {
        "instagram_copy": "Aquí va el texto para Instagram",
        "tiktok_copy": "Aquí va el texto para TikTok",
        "hashtags": "#tag1 #tag2 #tag3"
      }
    `;

    // 4. Llamar a la API de Google Gemini
    const textApiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
      throw new Error('Fallo al conectar con Gemini');
    }

    // 5. Procesar la respuesta de Gemini
    const textData = await textApiResponse.json();
    const generatedText = textData.candidates[0].content.parts[0].text;
    const generatedContent = JSON.parse(generatedText);

    // 6. Procesamiento de la Imagen
    // NOTA: Aquí está el espacio reservado para tu API de imágenes (fal.ai, Replicate, etc.)
    // Por ahora, devolvemos un enlace de prueba para que tu frontend no lance error
    // y puedas probar que los textos se generan correctamente.
    const imageUrl = "https://via.placeholder.com/600x600?text=Fondo+Generado"; 

    // 7. Enviar la respuesta exitosa de vuelta a tu página web
    return res.status(200).json({
      instagram_copy: generatedContent.instagram_copy,
      tiktok_copy: generatedContent.tiktok_copy,
      hashtags: generatedContent.hashtags,
      image_url: imageUrl
    });

  } catch (error) {
    console.error('Error en el servidor:', error);
    return res.status(500).json({ error: 'Ocurrió un error generando el contenido.' });
  }
}