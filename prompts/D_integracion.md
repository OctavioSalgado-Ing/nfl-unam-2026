Lee las 5 guías de .kiro/steering (rules, equipo, data, backend, frontend).

1. Pon USE_MOCK = false y verifica que dashboard/src/api/types.ts coincide campo por campo con backend/contrato.py.
   Si hay diferencias, corrige el frontend (no el contrato).
2. Dime los comandos exactos para levantar en desarrollo el backend (.venv, puerto 8000) y el dashboard (Node de .tools),
   levántalos y revisa TB vs CLE, KC vs NO y BUF vs MIA en las 5 pestañas.
3. Revisa todo el proyecto contra rules.md: fetch sin diagonal inicial, /health, sin escritura a disco, sin dependencias nuevas,
   sin llaves en el código, base './'. Lista cada incumplimiento con archivo y línea y corrígelos sin agregar funciones nuevas.
4. Corre .\.hackathon\setup.cmd --check y muéstrame el resultado.
