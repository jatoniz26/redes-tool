import formidable from 'formidable';
import fs from 'fs';

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
    const form = formidable({});
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const productName = fields.productName ? fields.productName[0] : '';
    const keyBenefit = fields.keyBenefit ? fields.keyBenefit[0] : '';
    const bgOption = fields.bgOption ? fields.bgOption[0] : 'Fondo Escritorio';
    const imageFile = files.productImage ? files.productImage[0] : null;

    if (!productName || !keyBenefit) {
      return res.status(400).json({ error: 'Faltan datos obligatorios del producto.' });
    }

    let imagePart = null;
    if (imageFile) {
      const fileBuffer = fs.readFileSync(imageFile.filepath);
      imagePart = {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: imageFile.mimetype || 'image/jpeg'
        }
      };
    }

    const promptTexto = `
      Actúa como un experto en marketing digital y fotografía comercial.
      Analiza la imagen adjunta de este producto impreso en 3D ("${productName}") y su beneficio ("${keyBenefit}").
      Entorno visual seleccionado: "${bgOption}".
      
      Devuelve la respuesta estrictamente en este formato JSON puro, sin bloques de código markdown ni texto adicional:
      {
        "instagram_copy": "Un texto persuasivo y comercial para Instagram basado en las características reales de la foto del producto, emojis, párrafos y llamada a la acción.",
        "tiktok_copy": "Un guion dinámico y corto para TikTok adaptado al producto, con ganchos iniciales.",
        "hashtags": "#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5"
      }
    `;

    const contents = [{ parts: [{ text: promptTexto }] }];
    if (imagePart) {
      contents[0].parts.push(imagePart);
    }

    // Usando la versión solicitada: gemini-3.6-flash
    const textApiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    if (!textApiResponse.ok) {
      const errorText = await textApiResponse.text();
      console.error('Error de la API de Gemini:', errorText);
      return res.status(500).json({ error: 'Error de conexión con Gemini. Revisa los logs.' });
    }

    const textData = await textApiResponse.json();
    const rawText = textData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    let generatedContent;
    try {
      const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      generatedContent = JSON.parse(cleanedText);
    } catch (e) {
      console.error('Error al convertir la respuesta de Gemini a JSON:', rawText);
      generatedContent = {
        instagram_copy: "¡Lleva la organización y el diseño de tu espacio al siguiente nivel! Descubre la funcionalidad que te faltaba. 🚀",
        tiktok_copy: "POV: Encontraste la pieza perfecta para tu setup. 👇",
        hashtags: "#TonizLab3D #Impresion3D #DiseñoFuncional"
      };
    }

    const surfaceMap = {
      'Fondo Escritorio': 'clean wooden desk surface',
      'Fondo Oficina': 'sleek executive office desk surface',
      'Fondo cocina': 'smooth marble kitchen countertop',
      'Fondo exterior ciudad': 'modern outdoor cafe table surface',
      'Fondo exterior parque': 'wooden picnic table surface in a park',
      'Fondo escritorio de trabajo y PC': 'clean desk mat surface near a blurred keyboard'
    };
    
    const selectedSurface = surfaceMap[bgOption] || 'clean flat table surface';

    // Prompt visual ajustado
    const visualPrompt = encodeURIComponent(`Macro close-up photography of an empty ${selectedSurface}. The flat surface occupies the entire foreground and is completely blank and empty. Blurred background. Depth of field, bokeh, product photography style, strictly NO objects on the table, 8k resolution, highly detailed.`);
    
    const randomSeed = Math.floor(Math.random() * 100000);
    const imageUrl = `https://image.pollinations.ai/prompt/${visualPrompt}?width=1080&height=1080&nologo=true&enhance=true&seed=${randomSeed}`;

    return res.status(200).json({
      instagram_copy: generatedContent.instagram_copy,
      tiktok_copy: generatedContent.tiktok_copy,
      hashtags: generatedContent.hashtags,
      image_url: imageUrl
    });

  } catch (error) {
    console.error('Error general en el servidor:', error);
    return res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
}