# Premios del ranking y plantilla de Twilio

En la pestaña **Ranking** del backoffice se cargan título, detalle e imagen de los premios del 1.º, 2.º y 3.º puesto para el sorteo activo. Solo se muestran en la web los puestos con título. El ranking público muestra hasta 20 participantes. Al sortear, se guarda una copia del top 20 con los premios del podio en ese momento; el orden se determina por chances pagadas y, en caso de empate, por quién llegó primero.

Para que una promo mencione los premios, configurá los tres títulos y creá en Twilio una plantilla **Marketing** nueva, con botón **Usar mi descuento** que apunte a `https://www.agustinsosa.com/promo/{{6}}`. Cuerpo sugerido:

```text
¡Hola {{1}}! 👋

Ya estás en el ranking de {{2}} y todavía podés subir. *Tus chances hasta hoy: {{3}}.*

🏆 Los tres primeros se llevan estos premios: {{7}}

Te dejamos *{{4}} OFF* para sumar más chances. Podés usarlo hasta el {{5}}.

Tocá “Usar mi descuento” si querés aprovecharlo. ¡Mucha suerte!
```

Variables: `{{1}}` primer nombre, `{{2}}` marca, `{{3}}` chances, `{{4}}` descuento, `{{5}}` vencimiento en hora argentina, `{{6}}` código personal del botón, `{{7}}` resumen de premios (`1° … · 2° … · 3° …`). Configurá el Content SID aprobado en `TWILIO_CONTENT_SID_PROMO_RANKING`. Hasta entonces, los envíos siguen usando `TWILIO_CONTENT_SID_PROMO` y su formato de seis variables.
