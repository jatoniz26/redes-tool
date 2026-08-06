export default async function handler(req, res) {
  // 1. Asegurar que solo aceptamos peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    // 2. Recibir los datos enviados desde tu frontend
    const { imageBase64, bgOption, productName, keyBenefit } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Falta la imagen del producto.' });
    }

    // 3. LLAMADA A LA API DE IMAGEN (Ejemplo genérico para Photoroom, Replicate, etc.)
    // Aquí enviamos la imagen en Base64 y el prompt del fondo seleccionado
    const imageApiResponse = await fetch('URL_DE_LA_API_DE_IMAGEN', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.IMAGE_API_KEY}` // Llave guardada en Vercel
      },
      body: JSON.stringify({
        image_file_b64: imageBase64,
        background_prompt: getBackgroundPrompt(bgOption) // Función auxiliar para traducir la opción a texto
      })
    });
    
    const imageData = await imageApiResponse.json();
    const newImageUrl = imageData.result_url; // La URL de tu nueva imagen con fondo

    // 4. LLAMADA A LA API DE OPENAI PARA EL TEXTO
    const promptTexto = `
      Crea textos promocionales para un producto llamado "${productName}". 
      Beneficio principal: "${keyBenefit}".
      Entorno de la foto: "${bgOption}".
      
      Devuelve la respuesta estrictamente en este formato JSON:
      {
        "instagram_copy": "texto aquí",
        "tiktok_copy": "texto aquí",
        "hashtags": "#tag1 #tag2"
      }
    `;

    const textApiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: "json_object" }, // Fuerza a que devuelva un JSON limpio
        messages: [{ role: 'user', content: promptTexto }]
      })
    });

    const textData = await textApiResponse.json();
    const generatedContent = JSON.parse(textData.choices[0].message.content);

    // 5. RESPUESTA FINAL AL FRONTEND
    // Devolvemos la nueva imagen y los textos ya procesados
    return res.status(200).json({
      success: true,
      imageUrl: newImageUrl,
      instagram: generatedContent.instagram_copy,
      tiktok: generatedContent.tiktok_copy,
      hashtags: generatedContent.hashtags
    });

  } catch (error) {
    console.error('Error en la API:', error);
    return res.status(500).json({ error: 'Ocurrió un error generando el contenido.' });
  }
}

// Función auxiliar para mapear el valor del radio button a un prompt en inglés para la IA
function getBackgroundPrompt(option) {
  const prompts = {
    office: "A modern corporate office background, blurred out of focus",
    desk: "A clean wooden desk setting",
    kitchen: "A bright, modern kitchen interior",
    city_outdoor: "An urban city street during daytime, bokeh effect",
    park_outdoor: "A sunny outdoor park with green grass and trees",
    work_pc: "A workspace desk with a computer monitor in the background"
  };
  return prompts[option] || "A clean white studio background";
}