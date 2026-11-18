# Anteprima locale

```bash
pip install -r backend/requirements.txt mongomock-motor
cd frontend && yarn install --ignore-scripts
EXPO_PUBLIC_BACKEND_URL="" CI=1 npx expo export -p web --output-dir ../dev_preview/web-dist
cd .. && python3 dev_preview/run_backend.py   # app + API su http://localhost:8001
```

- Database in memoria salvato in `dev_preview/data/db.json` ogni 5 secondi: i dati restano dopo un riavvio.
- AI (Carmelo, marketing): metti `ANTHROPIC_API_KEY` in `backend/.env` (vedi `backend/.env.example`).
- File caricati (PDF, foto) in `backend/storage/`.
