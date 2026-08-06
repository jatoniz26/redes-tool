document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('generate-form'); // O el ID real de tu formulario
  const submitButton = document.getElementById('tu-boton-accion'); // El botón de "Ejecutar acción"
  
  const instagramOutput = document.getElementById('instagram-output');
  const tiktokOutput = document.getElementById('tiktok-output');
  const hashtagsOutput = document.getElementById('hashtags-output');
  const imageElement = document.getElementById('imagen-resultado'); // La etiqueta <img>

  if (submitButton) {
    submitButton.addEventListener('click', async (e) => {
      e.preventDefault();

      // Captura los valores de tus inputs (asegúrate de que los IDs coincidan con tu HTML)
      const productName = document.getElementById('product-name')?.value;
      const keyBenefit = document.getElementById('key-benefit')?.value;
      const bgOption = document.getElementById('bg-option')?.value || 'Estudio profesional';

      if (!productName || !keyBenefit) {
        alert('Por favor completa los campos obligatorios del producto y beneficio.');
        return;
      }

      // Estado de carga visual en el botón
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

        // Mostrar los resultados en la interfaz
        if (instagramOutput) instagramOutput.textContent = data.instagram_copy;
        if (tiktokOutput) tiktokOutput.textContent = data.tiktok_copy;
        if (hashtagsOutput) hashtagsOutput.textContent = data.hashtags;

        // Mostrar la imagen generada correctamente
        if (imageElement && data.image_url) {
          imageElement.src = data.image_url;
          imageElement.style.display = 'block';
        }

      } catch (error) {
        console.error('Error:', error);
        alert('Hubo un error: ' + error.message);
      } finally {
        // Restaurar el estado del botón
        submitButton.textContent = 'Ejecutar acción';
        submitButton.disabled = false;
      }
    });
  }
});