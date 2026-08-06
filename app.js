document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('social-automation-form');
  
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Capturar valores del formulario
    const productName = document.getElementById('productName').value.trim();
    const keyBenefit = document.getElementById('keyBenefit').value.trim();
    const bgOptionSelected = document.querySelector('input[name="bgOption"]:checked');
    const bgOption = bgOptionSelected ? bgOptionSelected.value : 'ninguno';

    if (!productName || !keyBenefit) {
      alert('Por favor completa el nombre del producto y el beneficio principal.');
      return;
    }

    // Buscar o crear un contenedor de resultados dinámico
    let resultContainer = document.getElementById('ai-results-output');
    if (!resultContainer) {
      resultContainer = document.createElement('div');
      resultContainer.id = 'ai-results-output';
      resultContainer.style.marginTop = '20px';
      form.appendChild(resultContainer);
    }

    resultContainer.innerHTML = '<p>✨ Generando contenido con IA, por favor espera...</p>';

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productName,
          keyBenefit,
          bgOption
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar el contenido');
      }

      // Renderizar los resultados de forma visual y atractiva
      resultContainer.innerHTML = `
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; color: #fff; margin-top: 15px; border: 1px solid #334155;">
          <h3 style="color: #38bdf8; margin-top: 0;">🚀 ¡Publicación Generada con Éxito!</h3>
          
          <div style="margin-bottom: 15px;">
            <strong style="color: #cbd5e1;">📱 Copy para Instagram:</strong>
            <p style="background: #0f172a; padding: 10px; border-radius: 6px; white-space: pre-wrap; margin: 5px 0;">${data.instagram_copy}</p>
          </div>

          <div style="margin-bottom: 15px;">
            <strong style="color: #cbd5e1;">🎵 Copy para TikTok:</strong>
            <p style="background: #0f172a; padding: 10px; border-radius: 6px; white-space: pre-wrap; margin: 5px 0;">${data.tiktok_copy}</p>
          </div>

          <div style="margin-bottom: 15px;">
            <strong style="color: #cbd5e1;"># Hashtags:</strong>
            <p style="color: #38bdf8; background: #0f172a; padding: 10px; border-radius: 6px; margin: 5px 0;">${data.hashtags}</p>
          </div>

          <div>
            <strong style="color: #cbd5e1;">🖼️ Imagen con Fondo (${bgOption}):</strong>
            <div style="margin-top: 8px;">
              <img src="${data.image_url}" alt="Imagen con fondo IA" style="max-width: 100%; height: auto; border-radius: 6px; border: 1px solid #475569;" />
            </div>
          </div>
        </div>
      `;

    } catch (error) {
      console.error(error);
      resultContainer.innerHTML = `<p style="color: #f87171;">❌ Hubo un error: ${error.message}</p>`;
    }
  });
});