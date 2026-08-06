document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('generate-form');
  const submitButton = document.getElementById('tu-boton-accion') || document.querySelector('button[type="submit"]');
  
  const instagramOutput = document.getElementById('instagram-output');
  const tiktokOutput = document.getElementById('tiktok-output');
  const hashtagsOutput = document.getElementById('hashtags-output');
  const imageElement = document.getElementById('imagen-resultado');

  if (submitButton) {
    submitButton.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log("¡Botón presionado, iniciando solicitud...");

      const productName = document.getElementById('product-name')?.value;
      const keyBenefit = document.getElementById('key-benefit')?.value;
      const bgOption = document.getElementById('bg-option')?.value || 'Estudio profesional';

      if (!productName || !keyBenefit) {
        alert('Por favor completa los campos obligatorios del producto y beneficio.');
        return;
      }

      const originalText = submitButton.textContent;
      submitButton.textContent = 'Generando contenido...';
      submitButton.disabled = true;

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productName, keyBenefit, bgOption }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al conectar con el servidor');
        }

        if (instagramOutput) instagramOutput.textContent = data.instagram_copy;
        if (tiktokOutput) tiktokOutput.textContent = data.tiktok_copy;
        if (hashtagsOutput) hashtagsOutput.textContent = data.hashtags;

        if (imageElement && data.image_url) {
          imageElement.src = data.image_url;
          imageElement.style.display = 'block';
        }

        console.log("¡Contenido generado con éxito!");

      } catch (error) {
        console.error('Error detallado:', error);
        alert('Hubo un error: ' + error.message);
      } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      }
    });
  } else {
    console.warn("No se encontró el botón de acción en el DOM. Revisa los IDs de tu HTML.");
  }
});