import { GoogleGenAI } from '@google/genai';
import formidable from 'formidable';
import fs from 'fs';

// Desactivar el bodyParser por defecto de Next.js / Vercel para procesar multipart/form-data correctamente
export const config = {
  api: {
    bodyParser: false,
  },
};

const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      // Normalizar campos de formidable (en algunas versiones vienen como arrays)
      const normalizedFields = {};
      for (const key in fields) {
        normalizedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
      }
      const normalizedFiles = {};
      for (const key in files) {
        normalizedFiles[key] = Array.isArray(files[key]) ? files[key][0] : files[key];
      }
      resolve({ fields: normalizedFields, files: normalizedFiles });
    });
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });
  }

  try {
    // Parsear la petición multipart entrante desde el cliente
    const { fields, files } = await parseForm(req);
    const productName = fields.productName;
    const keyBenefit = fields.keyBenefit;
    const bgOption = fields.bgOption || 'Estudio profesional minimalista';
    const userImageFile = files.userImage;

    if (!productName || !keyBenefit) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: productName o keyBenefit' });
    }

    // Inicializar Google Gen AI con tu API key de entorno
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const promptText = `Genera contenido de marketing persuasivo para redes sociales basado en los siguientes datos:
    - Producto: ${productName}
    - Beneficio principal: ${keyBenefit}
    
    Devuelve estrictamente un objeto JSON válido (sin formato markdown adicional fuera del JSON si es posible, o asegúrate de parsearlo bien) con las siguientes 3 llaves exactas:
    - "instagram_copy": Un texto atractivo y persuasivo para Instagram con llamados a la acción.
    - "tiktok_copy": Un guion corto, dinámico y enganchador para un video de TikTok.
    - "hashtags": Una lista optimizada de hashtags separados por espacios.`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
    });

    const rawText = aiResponse.text();
    // Limpieza básica por si el modelo devuelve bloques de código markdown ```json ... ```
    const cleanJsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedContent = JSON.parse(cleanJsonStr);

    // Gestión de la imagen: Si el usuario subió una imagen, podrías procesarla o devolver una URL de ejemplo/Pollinations AI
    let imageUrl = '';
    if (userImageFile) {
      // Si el usuario subió archivo, puedes gestionar su ruta temporal o pasarlo a un bucket/servicio. 
      // Por defecto como respaldo generamos la visual con Pollinations AI basada en el entorno elegido:
      const encodedPrompt = encodeURIComponent(`${productName}, ${bgOption}, high quality product photography`);
      imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&nologo=true`;
    } else {
      const encodedPrompt = encodeURIComponent(`${productName}, ${bgOption}, high quality product photography`);
      imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&nologo=true`;
    }

    return res.status(200).json({
      instagram_copy: parsedContent.instagram_copy,
      tiktok_copy: parsedContent.tiktok_copy,
      hashtags: parsedContent.hashtags,
      image_url: imageUrl
    });

  } catch (error) {
    console.error('Error en el servidor API:', error);
    return res.status(500).json({ error: `Ocurrió un error generando el contenido: ${error.message}` });
  }
}