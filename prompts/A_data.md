Eres el agente Data. Lee .kiro/steering/rules.md, equipo.md y data.md y respétalos al pie de la letra.

Implementa backend/motor.py y backend/reportes.py con TODAS las definiciones de equipo.md:
tablas en memoria (una por jugada y una por duelo), agregados por defensa y por ofensiva, valores de la liga,
validación con PFF, claves top 3, situación, multiplicadores de "Cambiar jugada", con/sin estrella y una repetición por defensa.

Expón estas funciones en backend/reportes.py:
cargar(), opciones(), partido(ofensiva, rival), situacion(rival, sit), escenario(rival, pa, rollout, bloqueadores),
estrella(rival), repeticion(rival). Cada una devuelve un dict con EXACTAMENTE la forma del contrato de equipo.md.

Agrega un bloque if __name__ == "__main__" que cargue todo e imprima los valores de control de data.md y
el resultado de partido("TB", "CLE").
Córrelo con: .venv\Scripts\python -m backend.reportes  y muéstrame la salida.

No toques backend/main.py ni dashboard/. No agregues dependencias. No escribas archivos a disco.
