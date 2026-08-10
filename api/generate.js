// api/generate.js
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024,
    });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

function fileToBase64(file) {
  const filePath = file.filepath || file.path;
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('base64');
}

function firstValue(field) {
  if (Array.isArray(field)) return field[0];
  return field;
}

function buildGeminiPrompt(productName, mainBenefit, printTime, filamentType) {
  return `
Eres un experto en marketing digital y copywriting para redes sociales, especializado en productos de impresión 3D.

Analiza DETALLADAMENTE la imagen adjunta de una pieza impresa en 3D. Observa con precisión:
- La geometría exacta de la pieza (formas, ángulos, módulos, divisiones internas, texturas de capa visibles).
- Los colores exactos del filamento utilizado.
- Cualquier característica distintiva.

Datos del producto y fabricación:
- Nombre del producto: "${productName}"
- Beneficio principal a comunicar: "${mainBenefit}"
- Tiempo de impresión: "${printTime}"
- Tipo de filamento: "${filamentType}"
- Máquina utilizada: Bambu Lab A1 Combo

Con toda esa información, genera copys de venta para la marca "TonizLab 3D".
Devuelve tu respuesta ÚNICAMENTE como un objeto JSON puro (sin texto adicional, sin backticks), con EXACTAMENTE esta estructura:

{
  "instagram_copy": [
    "Variante 1: texto con emojis, detalles visuales de la pieza, y un CTA claro al final",
    "Variante 2: mismo producto, ángulo distinto",
    "Variante 3: mismo producto, ángulo distinto"
  ],
  "tiktok_copy": [
    "Variante 1: Caption muy invitacional para acompañar el video. NO uses formato de guion.",
    "Variante 2: Caption con curiosidad sobre la pieza.",
    "Variante 3: Caption directo y dinámico invitando a comentar."
  ],
  "carousel_script": [
    "Carrusel 1: Guion de 3 slides. Slide 1 (El problema), Slide 2 (Cómo el diseño y geometría de esta pieza lo soluciona), Slide 3 (CTA de TonizLab 3D).",
    "Carrusel 2: Guion de 3 slides enfocado en la utilidad en el día a día.",
    "Carrusel 3: Guion educativo sobre la resistencia o modularidad del producto."
  ],
  "stories_behind_the_scenes": [
    "Historia 1: Texto para una foto/video sobre el tiempo de impresión (${printTime}) y el material (${filamentType}).",
    "Historia 2: Texto sobre la precisión de la Bambu Lab A1 Combo fabricando esta pieza geométrica.",
    "Historia 3: Texto interactivo (encuesta o caja de preguntas) sobre el color o uso."
  ],
  "hashtags": "Lista de hashtags separados por espacio, incluyendo #TonizLab3D"
}
`.trim();
}

async function callGemini(base64Image, mimeType, promptText) {
  const body = {
    contents: [
      {
        parts: [
          { text: promptText },
          { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Image } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.8,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) throw new Error('Gemini no devolvió contenido válido.');
  return rawText;
}

function safeParseGeminiJSON(rawText, productName) {
  try {
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.hashtags.includes('#TonizLab3D')) {
      parsed.hashtags += ' #TonizLab3D';
    }
    return parsed;
  } catch (err) {
    console.error('⚠️ Error parseando JSON de Gemini:', err.message);
    return {
      instagram_copy: [`Fallback IG 1 para ${productName}`, `Fallback IG 2`, `Fallback IG 3`],
      tiktok_copy: [`Fallback TT 1`, `Fallback TT 2`, `Fallback TT 3`],
      carousel_script: [`Fallback Carrusel 1`, `Fallback Carrusel 2`, `Fallback Carrusel 3`],
      stories_behind_the_scenes: [`Fallback Story 1`, `Fallback Story 2`, `Fallback Story 3`],
      hashtags: '#TonizLab3D #Impresion3D #BambuLab',
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST.' });
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Falta GEMINI_API_KEY.' });

  try {
    const { fields, files } = await parseForm(req);

    const productName = firstValue(fields.productName) || 'Producto';
    const mainBenefit = firstValue(fields.mainBenefit) || 'Diseño funcional';
    const printTime = firstValue(fields.printTime) || 'Varias horas';
    const filamentType = firstValue(fields.filamentType) || 'PLA';

    const imageFile = files.image ? (Array.isArray(files.image) ? files.image[0] : files.image) : null;
    if (!imageFile) return res.status(400).json({ error: 'Imagen requerida.' });

    const base64Image = fileToBase64(imageFile);
    const mimeType = imageFile.mimetype || imageFile.type || 'image/jpeg';

    const promptText = buildGeminiPrompt(productName, mainBenefit, printTime, filamentType);
    
    let copys;
    try {
      const rawGeminiText = await callGemini(base64Image, mimeType, promptText);
      copys = safeParseGeminiJSON(rawGeminiText, productName);
    } catch (geminiError) {
      console.error('Error llamada:', geminiError.message);
      copys = safeParseGeminiJSON('', productName);
      copys.instagram_copy[0] = `⚠️ ERROR: ${geminiError.message}`;
    }

    // Ya no devolvemos URL de background
    return res.status(200).json({ success: true, copys });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}