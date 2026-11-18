# Anteprima locale

```bash
pip install -r backend/requirements.txt mongomock-motor   # (emergentintegrations è sostituito da uno stub)
cd frontend && yarn install --ignore-scripts
EXPO_PUBLIC_BACKEND_URL="" CI=1 npx expo export -p web --output-dir ../dev_preview/web-dist
cd .. && python3 dev_preview/run_backend.py   # app + API su http://localhost:8001
```

- Database in memoria: i dati si azzerano a ogni riavvio (il server si ri-popola da solo).
- Funzioni AI (Carmelo, marketing) disattivate: serve EMERGENT_LLM_KEY + pacchetto emergentintegrations.
