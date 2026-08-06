import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // Desactivar el parser por defecto para recibir archivos binarios con formidable
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

    // Prompt visual reforzado con restricciones estrictas para prohibir la creación de objetos y garantizar el espacio vacío
    const visualPrompt = encodeURIComponent(`Professional macro photography of an EMPTY, COMPLETELY BLANK, FLAT SURFACE. No objects, no products, no items. Just a high-quality ${bgOption} background, clean minimalist aesthetic, studio lighting, photorealistic, 8k resolution, professional bokeh, high-end advertising photography, clear space in the center for product placement.`);
    
    // Incluimos un seed aleatorio para evitar que el generador repita la misma imagen en caché
    const randomSeed = Math.floor(Math.random() * 10000);
    const imageUrl = `https://image.pollinations.ai/prompt/${visualPrompt}?width=1080&height=1080&nologo=true&enhance=true&seed=${randomSeed}`;

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