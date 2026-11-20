# Kit Kiro · Hoja de Protección

## 1. Instalar (una vez)
1. Descomprime este zip DENTRO de tu proyecto: C:\hackathon\hackathon-unam
   (elige esa carpeta al extraer; si Windows pregunta por .kiro, acepta combinar/reemplazar).
2. Debe quedar:
   - .kiro/steering/rules.md      (ya estaba, no se toca)
   - .kiro/steering/equipo.md     (producto, definiciones y contrato: siempre activo)
   - .kiro/steering/data.md       (se activa al editar backend/motor.py y backend/reportes.py)
   - .kiro/steering/backend.md    (se activa al editar backend/main.py y backend/contrato.py)
   - .kiro/steering/frontend.md   (se activa al editar dashboard/**)
   - prompts/A_data.md, B_frontend.md, C_backend.md, D_integracion.md
3. Sube los cambios:
   git add .kiro/steering prompts LEEME.md
   git commit -m "Kit de steering y prompts"
   git push

## 2. Usar los prompts
Cada prompt se pega en el CHAT de Kiro (panel derecho, caja "Ask a question or describe a task…").
Abre una sesión NUEVA para cada uno (botón + del chat). Abre el archivo .md, Ctrl+A, Ctrl+C y pega en el chat.

| Orden | Prompt | Cuándo |
|---|---|---|
| 1 | prompts/A_data.md | Ya |
| 1 | prompts/B_frontend.md | Al mismo tiempo que A, en otra sesión |
| 2 | prompts/C_backend.md | Cuando A termine y sus valores de control salgan bien |
| 3 | prompts/D_integracion.md | Cuando B y C estén listos |

## 3. Tiempos
- 12:00 primer .\.hackathon\setup.cmd --entregar de prueba y súbelo (se puede volver a subir).
- 12:15 congelar: solo arreglos.
- 12:15-12:45 captura resultado.png, README de 3 a 5 oraciones (lo escriben ustedes), --entregar final y git push.
